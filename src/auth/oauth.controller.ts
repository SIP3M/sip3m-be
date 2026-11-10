import { Request, Response } from "express";
import crypto from "crypto";
import { HttpError } from "../common/errors/http-error";
import { recordAudit } from "../audit/audit.service";
import * as oauthService from "./oauth.service";

/**
 * Controller OAuth Google (authorization code flow).
 *
 * - GET /auth/oauth/google        → redirect ke halaman login Google
 * - GET /auth/google/callback     → tukar code, cocokkan email ke user yang
 *                                   sudah terdaftar, terbitkan JWT + session,
 *                                   lalu redirect ke FE /oauth-callback
 *
 * Kredensial Google dibaca dari tabel system_config (bisa diganti
 * ADMIN_SISTEM lewat halaman Sistem & Konfigurasi).
 */

const FLOW_COOKIE = "sip3m_oauth_flow";
const FLOW_MAX_AGE_MS = 10 * 60 * 1000; // state hanya berlaku 10 menit

interface OAuthFlow {
  /** Nilai acak anti-CSRF — harus cocok antara inisiasi & callback. */
  state: string;
  /** Device id browser (dikirim FE) — menjaga semantik single-session. */
  deviceId?: string;
  /** Origin FE pengirim — divalidasi terhadap allowlist FRONTEND_URL. */
  fe?: string;
  ts: number;
}

/** Ambil origin ("https://host:port") dari URL; null bila tidak valid. */
const originOf = (value: unknown): string | null => {
  if (typeof value !== "string" || !value) return null;
  try {
    const u = new URL(value);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
};

const refererOrigin = (req: Request): string | null =>
  originOf(req.headers.referer) ?? originOf(req.headers.origin);

/**
 * Allowlist origin FE dari env FRONTEND_URL (dipisah koma, entri pertama =
 * default). Redirect token HANYA boleh ke origin yang terdaftar — mencegah
 * token bocor lewat link inisiasi OAuth yang dimanipulasi pihak ketiga.
 */
const resolveFrontendBase = (req: Request, preferred?: string | null): string => {
  const allowed = (process.env.FRONTEND_URL ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  const candidates = [preferred, refererOrigin(req)].filter(
    (c): c is string => Boolean(c),
  );
  for (const candidate of candidates) {
    if (allowed.includes(candidate)) return candidate;
  }
  return allowed[0];
};

/**
 * Redirect URI yang didaftarkan di Google Cloud Console.
 * Contoh: https://sip3m-be.vercel.app/api/auth/google/callback
 * Override eksplicit lewat env OAUTH_REDIRECT_URI bila diperlukan.
 */
const buildRedirectUri = (req: Request): string => {
  const explicit = process.env.OAUTH_REDIRECT_URI?.trim();
  if (explicit) return explicit;

  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined)
      ?.split(",")[0]
      ?.trim() || req.protocol;
  const host =
    (req.headers["x-forwarded-host"] as string | undefined)
      ?.split(",")[0]
      ?.trim() || req.get("host");

  // Route dipasang di bawah /api → path penuh = /api/auth/google/callback
  return `${proto}://${host}/api/auth/google/callback`;
};

const readFlow = (req: Request): OAuthFlow | null => {
  const raw = req.cookies?.[FLOW_COOKIE];
  if (typeof raw !== "string" || !raw) return null;
  try {
    const parsed = JSON.parse(raw) as OAuthFlow;
    if (typeof parsed?.state !== "string" || typeof parsed?.ts !== "number") {
      return null;
    }
    if (Date.now() - parsed.ts > FLOW_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const clearFlowCookie = (res: Response): void => {
  res.clearCookie(FLOW_COOKIE, { path: "/api/auth" });
};

/** Redirect balik ke FE dengan kode error ramah (ditangkap LoginPage). */
const redirectWithError = (
  req: Request,
  res: Response,
  code: string,
  fe?: string | null,
): void => {
  const base = resolveFrontendBase(req, fe);
  clearFlowCookie(res);
  res.redirect(`${base}/login?oauth_error=${encodeURIComponent(code)}`);
};

const clientIp = (req: Request): string =>
  (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
  req.ip ||
  "";

/** 1) Inisiasi: redirect browser ke halaman login Google. */
export const googleAuthStart = async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await oauthService.getGoogleOAuthConfig();
    if (!config) {
      // Belum dikonfigurasi — bukan error server, admin tinggal mengisi.
      redirectWithError(req, res, "not_configured");
      return;
    }

    const state = crypto.randomBytes(32).toString("hex");
    const flow: OAuthFlow = {
      state,
      deviceId:
        typeof req.query.device_id === "string" ? req.query.device_id : undefined,
      fe: originOf(req.query.fe) ?? undefined,
      ts: Date.now(),
    };

    res.cookie(FLOW_COOKIE, JSON.stringify(flow), {
      httpOnly: true,
      sameSite: "lax",
      secure: buildRedirectUri(req).startsWith("https://"),
      path: "/api/auth",
      maxAge: FLOW_MAX_AGE_MS,
    });

    const url = oauthService.buildGoogleAuthUrl({
      clientId: config.clientId,
      redirectUri: buildRedirectUri(req),
      state,
    });

    res.redirect(url);
  } catch (error) {
    console.error("[OAUTH_GOOGLE_START]", error);
    redirectWithError(req, res, "server_error");
  }
};

/** 2) Callback: tukar code → cocokkan email → terbitkan sesi → redirect FE. */
export const googleAuthCallback = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const flow = readFlow(req);
  // Cookie dipakai sekali saja (anti replay).
  clearFlowCookie(res);

  const denied = typeof req.query.error === "string" ? req.query.error : null;
  if (denied) {
    redirectWithError(
      req,
      res,
      denied === "access_denied" ? "access_denied" : "server_error",
      flow?.fe,
    );
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;

  if (!flow || !state || !code || state !== flow.state) {
    redirectWithError(req, res, "invalid_state", flow?.fe);
    return;
  }

  try {
    const config = await oauthService.getGoogleOAuthConfig();
    if (!config) {
      redirectWithError(req, res, "not_configured", flow.fe);
      return;
    }

    const redirectUri = buildRedirectUri(req);
    const { accessToken } = await oauthService.exchangeCodeForTokens({
      code,
      redirectUri,
      config,
    });
    const profile = await oauthService.fetchGoogleProfile(accessToken);

    const meta = {
      deviceId: flow.deviceId,
      userAgent: req.headers["user-agent"],
      ip: clientIp(req),
    };

    const result = await oauthService.loginWithGoogle(profile, meta);

    void recordAudit({
      userId: result.user.id,
      userRole: result.user.roles.roles,
      modul: "Auth",
      aksi: "LOGIN",
      objek: `Login Google: ${result.user.name} (${result.user.email})`,
      objekId: result.user.id,
      ip: clientIp(req) || null,
      status: "SUCCESS",
    });

    const base = resolveFrontendBase(req, flow.fe);
    const params = new URLSearchParams({
      token: result.token,
      user: encodeURIComponent(JSON.stringify(result.user)),
    });
    res.redirect(`${base}/oauth-callback?${params.toString()}`);
  } catch (error) {
    const code =
      error instanceof HttpError ? error.message : "server_error";

    void recordAudit({
      modul: "Auth",
      aksi: "LOGIN",
      objek: `Login Google gagal (${code})`,
      ip: clientIp(req) || null,
      status: "FAILED",
    });

    if (error instanceof HttpError) {
      redirectWithError(req, res, code, flow.fe);
      return;
    }

    console.error("[OAUTH_GOOGLE_CALLBACK]", error);
    redirectWithError(req, res, "server_error", flow.fe);
  }
};

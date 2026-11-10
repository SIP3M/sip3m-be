import { prisma } from "../prisma";
import { HttpError } from "../common/errors/http-error";
import { issueSessionForUser, SessionUser } from "./auth.service";
import { LoginResult } from "./types/auth.types";

/**
 * OAuth Google — authorization code flow.
 *
 * Kredensial (google_client_id / google_client_secret) disimpan di tabel
 * `system_config` dan bisa diganti ADMIN_SISTEM lewat halaman
 * Sistem & Konfigurasi tanpa deploy ulang.
 */

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT =
  "https://openidconnect.googleapis.com/v1/userinfo";

export const GOOGLE_CONFIG_KEYS = {
  CLIENT_ID: "google_client_id",
  CLIENT_SECRET: "google_client_secret",
} as const;

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

/** Baca kredensial Google dari system_config. Null bila belum dikonfigurasi. */
export const getGoogleOAuthConfig = async (): Promise<GoogleOAuthConfig | null> => {
  const rows = await prisma.systemConfig.findMany({
    where: { key: { in: [GOOGLE_CONFIG_KEYS.CLIENT_ID, GOOGLE_CONFIG_KEYS.CLIENT_SECRET] } },
    select: { key: true, value: true },
  });

  const map = new Map(rows.map((r) => [r.key, r.value.trim()]));
  const clientId = map.get(GOOGLE_CONFIG_KEYS.CLIENT_ID) ?? "";
  const clientSecret = map.get(GOOGLE_CONFIG_KEYS.CLIENT_SECRET) ?? "";

  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
};

/**
 * Susun URL halaman login Google.
 * `state` (anti-CSRF) diverifikasi lewat cookie httpOnly saat callback.
 */
export const buildGoogleAuthUrl = (params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string => {
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", params.state);
  // Selalu tampilkan pemilih akun agar user bebas memilih akun kampus/pribadi.
  url.searchParams.set("prompt", "select_account");
  return url.toString();
};

/** Tukar authorization code dengan access token (server-to-server). */
export const exchangeCodeForTokens = async (params: {
  code: string;
  redirectUri: string;
  config: GoogleOAuthConfig;
}): Promise<{ accessToken: string; idToken?: string }> => {
  const body = new URLSearchParams({
    code: params.code,
    client_id: params.config.clientId,
    client_secret: params.config.clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[OAUTH_GOOGLE] token exchange gagal:", res.status, detail);
    throw new HttpError("exchange_failed", 502);
  }

  const data = (await res.json()) as {
    access_token?: string;
    id_token?: string;
  };

  if (!data.access_token) {
    throw new HttpError("exchange_failed", 502);
  }

  return { accessToken: data.access_token, idToken: data.id_token };
};

/** Ambil profil (email terverifikasi) dari access token. */
export const fetchGoogleProfile = async (
  accessToken: string,
): Promise<GoogleProfile> => {
  const res = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    console.error("[OAUTH_GOOGLE] userinfo gagal:", res.status);
    throw new HttpError("exchange_failed", 502);
  }

  const data = (await res.json()) as Partial<GoogleProfile>;

  if (!data.email) {
    throw new HttpError("exchange_failed", 502);
  }

  return {
    sub: data.sub ?? "",
    email: data.email,
    email_verified: Boolean(data.email_verified),
    name: data.name,
    picture: data.picture,
  };
};

/**
 * Cocokkan email Google ke user yang sudah terdaftar (keputusan desain:
 * TIDAK membuat akun baru — email harus sudah ada di tabel users dan
 * role-nya diatur admin lewat Manajemen Pengguna).
 *
 * Melempar HttpError dengan kode ramah untuk redirect kembali ke FE:
 * - email_not_verified : email Google belum diverifikasi Google
 * - email_not_registered: email belum terdaftar di sistem
 * - inactive           : akun menunggu verifikasi Admin LPPM
 */
export const loginWithGoogle = async (
  profile: GoogleProfile,
  meta?: { deviceId?: string; userAgent?: string; ip?: string },
): Promise<LoginResult> => {
  if (!profile.email_verified) {
    throw new HttpError("email_not_verified", 403);
  }

  // Case-insensitive: email Google selalu lowercase, data user bisa campur.
  const user = await prisma.users.findFirst({
    where: { email: { equals: profile.email, mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      email: true,
      nidn_nip: true,
      fakultas_id: true,
      is_active: true,
      roles: {
        select: {
          id: true,
          roles: true,
          deskripsi: true,
          is_system: true,
          dashboard_path: true,
        },
      },
    },
  });

  if (!user) {
    throw new HttpError("email_not_registered", 403);
  }

  if (!user.is_active) {
    throw new HttpError("inactive", 403);
  }

  const sessionUser: SessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    nidn_nip: user.nidn_nip,
    fakultas_id: user.fakultas_id,
    roles: user.roles,
  };

  // Sama persis dengan login biasa: JWT + session + permissions + metadata.
  return issueSessionForUser(sessionUser, meta, true);
};

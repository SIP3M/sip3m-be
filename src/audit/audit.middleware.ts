import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../auth/types/auth.jwt.types";
import { recordAudit } from "./audit.service";

/**
 * Audit middleware global — memasang listener `res.on("finish")` untuk SEMUA
 * request mutasi (POST/PUT/PATCH/DELETE) di bawah /api.
 *
 * - Modul & aksi di-map dari route (fallback: method).
 * - Controller bisa memperkaya lewat `res.locals.audit = { modul, aksi, objek }`
 *   (dipakai ADMIN_SISTEM untuk deskripsi objek yang manusiawi).
 * - Status diambil dari kode respons: <400 = SUCCESS, >=400 = FAILED.
 * - Menulis log bersifat fire-and-forget (tidak pernah melempar).
 */

export interface AuditEnrichment {
  modul?: string;
  aksi?: string;
  objek?: string;
  objekId?: string | number | null;
  /** Aktor eksplisit — dipakai saat req.user belum terisi (mis. LOGIN). */
  userId?: number | null;
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Route (path setelah /api) → nama modul. Urutan penting: yang pertama cocok. */
const MODULE_RULES: Array<[RegExp, string]> = [
  [/^\/auth(\/|$)/, "Auth"],
  [/^\/users(\/|$)/, "Pengguna"],
  [/^\/dosen(\/|$)/, "Dosen"],
  [/^\/fakultas/, "Fakultas"],
  [/^\/program-studi/, "Program Studi"],
  [/^\/proposals(\/|$)/, "Penelitian"],
  [/^\/pengabdian/, "Pengabdian"],
  [/^\/reviews?(\/|$)/, "Review"],
  [/^\/kkm(\/|$)/, "KKM"],
  [/^\/notifications/, "Notifikasi"],
  [/^\/publikasi|\/repository/, "Publikasi"],
  [/^\/export(\/|$)/, "Ekspor"],
  [/^\/dashboard/, "Dashboard"],
  [/^\/monitoring/, "Monitoring"],
  [/^\/finance(\/|$)/, "Finance"],
  [/^\/master(\/|$)/, "Master Data"],
];

/** Route → aksi khusus (melewati fallback CREATE/UPDATE/DELETE). */
const ACTION_RULES: Array<[RegExp, string]> = [
  [/^\/auth\/login/, "LOGIN"],
  [/^\/auth\/logout/, "LOGOUT"],
  [/^\/auth\/register/, "REGISTER"],
];

const METHOD_TO_ACTION: Record<string, string> = {
  POST: "CREATE",
  PUT: "UPDATE",
  PATCH: "UPDATE",
  DELETE: "DELETE",
};

const resolveModul = (path: string): string => {
  for (const [re, modul] of MODULE_RULES) {
    if (re.test(path)) return modul;
  }
  return "Sistem";
};

const resolveAksi = (method: string, path: string): string => {
  for (const [re, aksi] of ACTION_RULES) {
    if (re.test(path)) return aksi;
  }
  return METHOD_TO_ACTION[method] ?? method;
};

/** IP asli di balik proxy (Vercel) — pola sama dengan auth.controller. */
const clientIp = (req: Request): string | null =>
  (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
  req.ip ||
  null;

export const auditMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!MUTATING_METHODS.has(req.method)) {
    next();
    return;
  }

  // Dipasang di app.use("/api", ...) → req.path sudah tanpa prefix /api.
  const path = req.path;

  res.on("finish", () => {
    try {
      const enriched = (res.locals as { audit?: AuditEnrichment }).audit;
      const authReq = req as AuthenticatedRequest;
      const userId = enriched?.userId ?? authReq.user?.userId ?? null;
      const role =
        authReq.user?.role ?? authReq.user?.roles ?? null;

      void recordAudit({
        userId,
        userRole: typeof role === "string" ? role : null,
        modul: enriched?.modul ?? resolveModul(path),
        aksi: enriched?.aksi ?? resolveAksi(req.method, path),
        objek: enriched?.objek ?? `${req.method} ${path}`,
        objekId: enriched?.objekId ?? null,
        ip: clientIp(req),
        status: res.statusCode < 400 ? "SUCCESS" : "FAILED",
      });
    } catch (err) {
      // tidak boleh melempar dari listener event
      console.error("[AUDIT] gagal menyiapkan log:", err);
    }
  });

  next();
};

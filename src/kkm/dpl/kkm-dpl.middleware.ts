import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../auth/types/auth.jwt.types";
import { ROLES } from "../../auth/role";
import { HttpError } from "../../common/errors/http-error";
import { isDplAktif } from "./kkm-dpl.service";

/**
 * Penegakan akses modul KKM untuk dosen.
 *
 * Dosen hanya boleh memakai endpoint KKM berbasis DPL bila ia berstatus
 * DPL aktif (punya KkmKelompok.dpl_id pada periode berstatus AKTIF).
 * Status dihitung derived — otomatis hilang saat penugasan dicabut.
 *
 * Catatan:
 * - Role selain DOSEN (ADMIN_LPPM / STAFF_LPPM / MAHASISWA) diteruskan
 *   tanpa cek; penentuan akses per-kelompok tetap dilakukan di service.
 * - Merespons JSON 403 langsung agar FE mudah membaca pesannya.
 */
export const requireDplAktif = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const role = (req.user?.role ?? req.user?.roles) as string | undefined;

    if (role !== ROLES.DOSEN) {
      next();
      return;
    }

    const userId = Number(req.user?.userId ?? req.user?.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      next(new HttpError("Unauthorized.", 401));
      return;
    }

    const aktif = await isDplAktif(userId);

    if (!aktif) {
      res.status(403).json({
        message: "Anda tidak ditugaskan sebagai DPL KKM.",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("[REQUIRE_DPL_AKTIF_ERROR]", error);
    res.status(500).json({
      message: "Terjadi kesalahan saat memeriksa status DPL KKM.",
    });
  }
};

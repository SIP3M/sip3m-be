import { Response } from "express";
import { AuthenticatedRequest } from "../../auth/types/auth.jwt.types";
import { HttpError } from "../../common/errors/http-error";
import {
  bulkUpsertPenilaianSchema,
  upsertPenilaianSchema,
} from "./kkm-penilaian.validation";
import * as penilaianService from "./kkm-penilaian.service";

/** GET /kkm/dpl/penilaian — Ambil daftar mahasiswa bimbingan untuk DPL */
export const getPenilaianBimbinganController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const data = await penilaianService.getPenilaianBimbinganByDpl(
      Number(req.user.userId),
    );
    return res.status(200).json({
      message: "Berhasil mengambil data penilaian mahasiswa bimbingan.",
      data,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[GET_PENILAIAN_BIMBINGAN_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat mengambil data penilaian.",
    });
  }
};

/** POST /kkm/dpl/penilaian — Simpan satu nilai mahasiswa */
export const upsertPenilaianController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = upsertPenilaianSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi data penilaian gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = await penilaianService.upsertPenilaianMahasiswa(
      parsed.data,
      Number(req.user.userId),
    );

    res.locals.audit = {
      modul: "KKM",
      aksi: "UPDATE",
      objek: `Penilaian peserta ID ${parsed.data.peserta_id}`,
      objekId: data.id,
    };

    return res.status(200).json({
      message: "Penilaian berhasil disimpan.",
      data,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[UPSERT_PENILAIAN_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat menyimpan penilaian.",
    });
  }
};

/** POST /kkm/dpl/penilaian/bulk — Simpan banyak nilai sekaligus (Simpan Semua Nilai) */
export const bulkUpsertPenilaianController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = bulkUpsertPenilaianSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi data penilaian massal gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const dplId = Number(req.user.userId);
    const results = [];
    for (const item of parsed.data.penilaian_list) {
      const resItem = await penilaianService.upsertPenilaianMahasiswa(item, dplId);
      results.push(resItem);
    }

    res.locals.audit = {
      modul: "KKM",
      aksi: "UPDATE",
      objek: `Bulk simpan penilaian ${results.length} peserta`,
    };

    return res.status(200).json({
      message: `Berhasil menyimpan penilaian untuk ${results.length} mahasiswa.`,
      data: results,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[BULK_UPSERT_PENILAIAN_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat menyimpan penilaian massal.",
    });
  }
};

/** GET /kkm/mahasiswa/penilaian — Ambil nilai & evaluasi untuk mahasiswa login */
export const getPenilaianMahasiswaController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const data = await penilaianService.getPenilaianMahasiswaSaya(
      Number(req.user.userId),
    );
    return res.status(200).json({
      message: "Berhasil mengambil rekap nilai dan evaluasi KKM.",
      data,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[GET_PENILAIAN_MAHASISWA_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat mengambil nilai KKM.",
    });
  }
};

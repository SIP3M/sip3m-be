import { Response } from "express";
import archiver from "archiver";
import { AuthenticatedRequest } from "../../auth/types/auth.jwt.types";
import { HttpError } from "../../common/errors/http-error";
import {
  getLaporanIndividuSaya,
  getLaporanKelompokSaya,
  uploadLaporanIndividu,
  uploadLaporanKelompok,
} from "./kkm-laporan.service";
import {
  bulkApproveLaporan,
  buildLaporanExcel,
  collectZipEntries,
  getLaporanDetail,
  getLaporanList,
  reviewLaporan,
  type Viewer,
} from "./kkm-laporan-review.service";
import {
  kkmLaporanBulkSchema,
  kkmLaporanDetailQuerySchema,
  kkmLaporanQuerySchema,
  kkmLaporanReviewSchema,
} from "./kkm-laporan.validation";

const parseIdParam = (raw: string | string[]): number => {
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (Number.isNaN(id) || id <= 0) throw new HttpError("ID tidak valid.", 400);
  return id;
};

/** Viewer untuk endpoint laporan admin/DPL (userId + role dari sesi). */
const getViewer = (req: AuthenticatedRequest): Viewer => {
  const userId = req.user?.userId;
  const role = req.user?.role ?? req.user?.roles;
  if (!userId || !role) throw new HttpError("Unauthorized", 401);
  return { userId: Number(userId), role };
};

// =============================================
// LAPORAN INDIVIDU
// =============================================

export const getLaporanIndividuController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const data = await getLaporanIndividuSaya(Number(req.user.userId));
    return res.status(200).json({ message: "Berhasil mengambil laporan individu.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_LAPORAN_INDIVIDU_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil laporan individu." });
  }
};

export const uploadLaporanIndividuController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new HttpError("Unauthorized", 401);
    const data = await uploadLaporanIndividu(Number(userId), req.file);
    return res.status(201).json({ message: "Laporan individu berhasil diunggah.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[UPLOAD_LAPORAN_INDIVIDU_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengunggah laporan individu." });
  }
};

// =============================================
// LAPORAN KELOMPOK
// =============================================

export const getLaporanKelompokController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const data = await getLaporanKelompokSaya(Number(req.user.userId));
    return res.status(200).json({ message: "Berhasil mengambil laporan kelompok.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_LAPORAN_KELOMPOK_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil laporan kelompok." });
  }
};

export const uploadLaporanKelompokController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new HttpError("Unauthorized", 401);
    const kelompokId = parseIdParam(req.params.id);
    const jenis = typeof req.body?.jenis === "string" ? req.body.jenis : undefined;
    const data = await uploadLaporanKelompok(kelompokId, Number(userId), req.file, jenis);
    return res.status(201).json({ message: "Laporan kelompok berhasil diunggah.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[UPLOAD_LAPORAN_KELOMPOK_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengunggah laporan kelompok." });
  }
};

// =============================================
// LAPORAN KELOMPOK — ADMIN / KETUA LPPM / STAFF / DPL
// =============================================

/** GET /kkm/laporan — daftar lintas kelompok + stats + opsi filter. */
export const getLaporanListController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const viewer = getViewer(req);
    const parsed = kkmLaporanQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Validasi query gagal.", errors: parsed.error.flatten().fieldErrors });
    }
    const data = await getLaporanList(viewer, parsed.data);
    return res.status(200).json({ message: "Berhasil mengambil daftar laporan KKM.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_LAPORAN_LIST_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil daftar laporan." });
  }
};

/** GET /kkm/laporan/detail?kelompok_id=&jenis= — satu baris + URL file. */
export const getLaporanDetailController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const viewer = getViewer(req);
    const parsed = kkmLaporanDetailQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Validasi query gagal.", errors: parsed.error.flatten().fieldErrors });
    }
    const data = await getLaporanDetail(
      viewer,
      parsed.data.kelompok_id,
      parsed.data.jenis,
    );
    return res.status(200).json({ message: "Berhasil mengambil detail laporan.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_LAPORAN_DETAIL_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil detail laporan." });
  }
};

/** PATCH /kkm/laporan/review — setujui / revisi satu laporan. */
export const reviewLaporanController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const viewer = getViewer(req);
    const parsed = kkmLaporanReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Validasi body gagal.", errors: parsed.error.flatten().fieldErrors });
    }
    const data = await reviewLaporan(viewer, parsed.data);
    return res.status(200).json({ message: `Laporan berhasil ditandai ${data.status_label}.`, data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[REVIEW_LAPORAN_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat me-review laporan." });
  }
};

/** POST /kkm/laporan/bulk-approve — setujui massal baris terpilih. */
export const bulkApproveLaporanController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const viewer = getViewer(req);
    const parsed = kkmLaporanBulkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Validasi body gagal.", errors: parsed.error.flatten().fieldErrors });
    }
    const data = await bulkApproveLaporan(viewer, parsed.data);
    return res.status(200).json({
      message: `${data.disetujui} laporan disetujui${data.dilewati > 0 ? `, ${data.dilewati} dilewati (bukan menunggu review)` : ""}.`,
      data,
    });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[BULK_APPROVE_LAPORAN_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat menyetujui laporan massal." });
  }
};

/** GET /kkm/laporan/export — Excel sesuai filter aktif. */
export const exportLaporanExcelController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const viewer = getViewer(req);
    const parsed = kkmLaporanQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Validasi query gagal.", errors: parsed.error.flatten().fieldErrors });
    }
    const buffer = await buildLaporanExcel(viewer, parsed.data);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="laporan-kkm-${stamp}.xlsx"`);
    return res.status(200).send(buffer);
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[EXPORT_LAPORAN_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat export laporan." });
  }
};

/** GET /kkm/laporan/zip — ZIP seluruh file PDF sesuai filter aktif. */
export const downloadLaporanZipController = async (req: AuthenticatedRequest, res: Response) => {
  let entries: Awaited<ReturnType<typeof collectZipEntries>>;
  try {
    const viewer = getViewer(req);
    const parsed = kkmLaporanQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Validasi query gagal.", errors: parsed.error.flatten().fieldErrors });
    }
    entries = await collectZipEntries(viewer, parsed.data);
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[ZIP_LAPORAN_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat menyiapkan ZIP laporan." });
  }

  // Setelah header terkirim, error hanya bisa menghancurkan stream.
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="laporan-kkm-${stamp}.zip"`);

  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.on("error", (err) => {
    console.error("[ZIP_LAPORAN_STREAM_ERROR]", err);
    res.destroy(err);
  });
  archive.pipe(res);

  try {
    for (const entry of entries) {
      try {
        const response = await fetch(entry.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        archive.append(buffer, { name: entry.name });
      } catch (fetchError) {
        console.error("[ZIP_LAPORAN_FETCH_ERROR]", entry.name, fetchError);
        archive.append(`Gagal mengunduh file dari storage.`, {
          name: `${entry.name}.gagal.txt`,
        });
      }
    }
    await archive.finalize();
  } catch (error) {
    console.error("[ZIP_LAPORAN_FINALIZE_ERROR]", error);
    res.destroy(error instanceof Error ? error : new Error("Gagal membuat ZIP."));
  }
  return res;
};

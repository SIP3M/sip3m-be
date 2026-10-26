import { Response } from "express";
import { AuthenticatedRequest } from "../../auth/types/auth.jwt.types";
import { HttpError } from "../../common/errors/http-error";
import {
  kkmKelompokAddAnggotaSchema,
  kkmKelompokDocTypeEnum,
  kkmKelompokListQuerySchema,
  kkmKelompokStatsQuerySchema,
  kkmKelompokUpdateSchema,
} from "./kkm-kelompok.validation";
import {
  addAnggota,
  deleteDokumen,
  getKelompokDetail,
  getKelompokList,
  getKelompokSaya,
  getKelompokStats,
  removeAnggota,
  updateKelompok,
  uploadDokumen,
} from "./kkm-kelompok.service";

const parseIdParam = (raw: string | string[]): number => {
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (Number.isNaN(id) || id <= 0) throw new HttpError("ID tidak valid.", 400);
  return id;
};

export const getKelompokStatsController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = kkmKelompokStatsQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: "Validasi query gagal.", errors: parsed.error.flatten().fieldErrors });
    const data = await getKelompokStats(parsed.data.periode_id);
    return res.status(200).json({ message: "Berhasil mengambil statistik kelompok KKM.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_KELOMPOK_STATS_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil statistik kelompok KKM." });
  }
};

export const getKelompokListController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = kkmKelompokListQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: "Validasi query gagal.", errors: parsed.error.flatten().fieldErrors });
    const result = await getKelompokList(parsed.data);
    return res.status(200).json({ message: "Berhasil mengambil daftar kelompok KKM.", ...result });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_KELOMPOK_LIST_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil daftar kelompok KKM." });
  }
};

export const getKelompokDetailController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = parseIdParam(req.params.id);
    const data = await getKelompokDetail(id, {
      id: Number(req.user.userId),
      role: req.user.role ?? req.user.roles,
    });
    return res.status(200).json({ message: "Berhasil mengambil detail kelompok KKM.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_KELOMPOK_DETAIL_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil detail kelompok KKM." });
  }
};

export const getKelompokSayaController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const data = await getKelompokSaya(Number(req.user.userId));
    return res.status(200).json({ message: "Berhasil mengambil data kelompok saya.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_KELOMPOK_SAYA_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil data kelompok saya." });
  }
};

export const updateKelompokController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = parseIdParam(req.params.id);
    const parsed = kkmKelompokUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validasi data gagal.", errors: parsed.error.flatten().fieldErrors });
    if (parsed.data.dpl_id === undefined) {
      return res.status(400).json({ message: "Tidak ada perubahan yang dikirim. Catatan: desa tidak bisa diubah di sini (1 Desa = 1 Kelompok), gunakan menu Lokasi KKM." });
    }
    const data = await updateKelompok(id, parsed.data);
    return res.status(200).json({ message: "Kelompok berhasil diubah.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[UPDATE_KELOMPOK_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengubah kelompok KKM." });
  }
};

export const addAnggotaController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = parseIdParam(req.params.id);
    const parsed = kkmKelompokAddAnggotaSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validasi data gagal.", errors: parsed.error.flatten().fieldErrors });
    const result = await addAnggota(id, parsed.data);
    return res.status(200).json({ message: `Berhasil menambah ${result.count} anggota ke kelompok.`, data: result });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[ADD_ANGGOTA_KELOMPOK_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat menambah anggota kelompok." });
  }
};

export const removeAnggotaController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = parseIdParam(req.params.id);
    const pesertaId = parseIdParam(req.params.pesertaId);
    const data = await removeAnggota(id, pesertaId);
    return res.status(200).json({ message: "Anggota berhasil dihapus dari kelompok.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[REMOVE_ANGGOTA_KELOMPOK_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat menghapus anggota kelompok." });
  }
};

export const uploadDokumenController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = parseIdParam(req.params.id);
    const file = req.file;
    if (!file) return res.status(400).json({ message: "File wajib diunggah (field: file)." });

    const parsedType = kkmKelompokDocTypeEnum.safeParse(req.body.document_type);
    if (!parsedType.success) {
      return res.status(400).json({
        message: "document_type wajib. Pilihan: PROPOSAL_PROGRAM_KERJA, LOGBOOK_KELOMPOK, LAPORAN_AKHIR.",
      });
    }

    const data = await uploadDokumen(id, parsedType.data, file, Number(req.user.userId));
    return res.status(201).json({ message: "Dokumen kelompok berhasil diunggah.", data: { id: data.id, document_type: data.document_type, title: data.title } });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[UPLOAD_DOKUMEN_KELOMPOK_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengunggah dokumen kelompok." });
  }
};

export const deleteDokumenController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const docId = parseIdParam(req.params.docId);
    const data = await deleteDokumen(docId);
    return res.status(200).json({ message: "Dokumen kelompok berhasil dihapus.", data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[DELETE_DOKUMEN_KELOMPOK_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat menghapus dokumen kelompok." });
  }
};

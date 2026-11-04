import { Response } from "express";
import { AuthenticatedRequest } from "../../auth/types/auth.jwt.types";
import { HttpError } from "../../common/errors/http-error";
import {
  createPengumumanSchema,
  pengumumanQuerySchema,
  updatePengumumanSchema,
} from "./kkm-pengumuman.validation";
import * as pengumumanService from "./kkm-pengumuman.service";

const parseId = (raw: string | string[] | undefined): number => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = Number(value);
  if (!value || Number.isNaN(id) || id <= 0) {
    throw new HttpError("ID pengumuman tidak valid.", 400);
  }
  return id;
};

// =============================================
// ADMIN
// =============================================

export const listPengumumanController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = pengumumanQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi query gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const result = await pengumumanService.listPengumumanAdmin(parsed.data);
    return res.status(200).json({
      message: "Berhasil mengambil daftar pengumuman.",
      ...result,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[LIST_PENGUMUMAN_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat mengambil daftar pengumuman.",
    });
  }
};

export const createPengumumanController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = createPengumumanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi data gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await pengumumanService.createPengumuman(
      parsed.data,
      req.file,
      Number(req.user.userId),
    );

    res.locals.audit = {
      modul: "KKM",
      aksi: "CREATE",
      objek: `Pengumuman "${result.judul}"`,
      objekId: result.id,
    };

    return res.status(201).json({
      message:
        result.status === "SCHEDULED"
          ? "Pengumuman berhasil dijadwalkan."
          : "Pengumuman berhasil diterbitkan.",
      data: result,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[CREATE_PENGUMUMAN_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat menyimpan pengumuman.",
    });
  }
};

export const getPengumumanDetailController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = parseId(req.params.id ?? "");
    const data = await pengumumanService.getPengumumanDetail(id);
    return res.status(200).json({
      message: "Berhasil mengambil detail pengumuman.",
      data,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[GET_PENGUMUMAN_DETAIL_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat mengambil detail pengumuman.",
    });
  }
};

export const updatePengumumanController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = parseId(req.params.id ?? "");
    const parsed = updatePengumumanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi data gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    if (Object.keys(parsed.data).length === 0) {
      throw new HttpError("Tidak ada perubahan untuk disimpan.", 400);
    }

    const data = await pengumumanService.updatePengumuman(id, parsed.data);

    res.locals.audit = {
      modul: "KKM",
      aksi: "UPDATE",
      objek: `Pengumuman "${data.judul}"`,
      objekId: id,
    };

    return res.status(200).json({
      message: "Pengumuman berhasil diperbarui.",
      data,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[UPDATE_PENGUMUMAN_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat memperbarui pengumuman.",
    });
  }
};

export const togglePinController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = parseId(req.params.id ?? "");
    const data = await pengumumanService.togglePin(id);

    res.locals.audit = {
      modul: "KKM",
      aksi: "UPDATE",
      objek: data.is_pinned ? "Sematkan pengumuman" : "Lepas sematan pengumuman",
      objekId: id,
    };

    return res.status(200).json({
      message: data.is_pinned
        ? "Pengumuman berhasil disematkan."
        : "Sematan pengumuman dilepas.",
      data,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[TOGGLE_PIN_PENGUMUMAN_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat memperbarui sematan pengumuman.",
    });
  }
};

export const publishPengumumanController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = parseId(req.params.id ?? "");
    const data = await pengumumanService.publishPengumuman(id);

    res.locals.audit = {
      modul: "KKM",
      aksi: "PUBLISH",
      objek: `Pengumuman "${data.judul}"`,
      objekId: id,
    };

    return res.status(200).json({
      message: "Pengumuman berhasil diterbitkan.",
      data,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[PUBLISH_PENGUMUMAN_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat menerbitkan pengumuman.",
    });
  }
};

export const deletePengumumanController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = parseId(req.params.id ?? "");
    const data = await pengumumanService.deletePengumuman(id);

    res.locals.audit = {
      modul: "KKM",
      aksi: "DELETE",
      objek: "Pengumuman",
      objekId: id,
    };

    return res.status(200).json({
      message: "Pengumuman berhasil dihapus.",
      data,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[DELETE_PENGUMUMAN_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat menghapus pengumuman.",
    });
  }
};

// =============================================
// PENERIMA (mahasiswa / dosen)
// =============================================

export const listPengumumanForUserController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const data = await pengumumanService.listPengumumanForUser(
      Number(req.user.userId),
    );
    return res.status(200).json({
      message: "Berhasil mengambil daftar pengumuman.",
      data,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[LIST_PENGUMUMAN_USER_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat mengambil daftar pengumuman.",
    });
  }
};

export const getPengumumanForUserController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = parseId(req.params.id ?? "");
    const data = await pengumumanService.getPengumumanForUser(
      id,
      Number(req.user.userId),
    );
    return res.status(200).json({
      message: "Berhasil mengambil detail pengumuman.",
      data,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[GET_PENGUMUMAN_USER_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat mengambil detail pengumuman.",
    });
  }
};

export const markPengumumanReadController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = parseId(req.params.id ?? "");
    const data = await pengumumanService.markPengumumanRead(
      id,
      Number(req.user.userId),
    );

    res.locals.audit = {
      modul: "KKM",
      aksi: "READ",
      objek: "Pengumuman",
      objekId: id,
    };

    return res.status(200).json({
      message: "Pengumuman ditandai sudah dibaca.",
      data,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[MARK_PENGUMUMAN_READ_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat menandai pengumuman dibaca.",
    });
  }
};

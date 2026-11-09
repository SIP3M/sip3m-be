import { Request, Response } from "express";
import { HttpError } from "../../common/errors/http-error";
import {
  createJabatanMasterSchema,
  updateJabatanMasterSchema,
} from "./jabatan-master.validation";
import {
  getAllJabatanMaster,
  getJabatanMasterById,
  createJabatanMaster,
  updateJabatanMaster,
  deleteJabatanMaster,
} from "./jabatan-master.service";

export const getAllJabatanMasterHandler = async (
  _req: Request,
  res: Response,
) => {
  try {
    const data = await getAllJabatanMaster();
    res.json({ message: "Berhasil mengambil daftar jabatan.", data });
  } catch (error) {
    console.error("[GET_ALL_JABATAN_MASTER_ERROR]", error);
    res.status(500).json({ message: "Gagal mengambil daftar jabatan." });
  }
};

export const getJabatanMasterByIdHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      throw new HttpError("ID tidak valid.", 400);
    }
    const data = await getJabatanMasterById(idNum);
    res.json({ message: "Berhasil mengambil jabatan.", data });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[GET_JABATAN_MASTER_BY_ID_ERROR]", error);
    res.status(500).json({ message: "Gagal mengambil jabatan." });
  }
};

export const createJabatanMasterHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const payload = createJabatanMasterSchema.parse(req.body);
    const data = await createJabatanMaster(payload);
    res.status(201).json({ message: "Jabatan berhasil dibuat.", data });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[CREATE_JABATAN_MASTER_ERROR]", error);
    res.status(500).json({ message: "Gagal membuat jabatan." });
  }
};

export const updateJabatanMasterHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      throw new HttpError("ID tidak valid.", 400);
    }
    const payload = updateJabatanMasterSchema.parse(req.body);
    const data = await updateJabatanMaster(idNum, payload);
    res.json({ message: "Jabatan berhasil diperbarui.", data });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[UPDATE_JABATAN_MASTER_ERROR]", error);
    res.status(500).json({ message: "Gagal memperbarui jabatan." });
  }
};

export const deleteJabatanMasterHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      throw new HttpError("ID tidak valid.", 400);
    }
    await deleteJabatanMaster(idNum);
    res.json({ message: "Jabatan berhasil dihapus." });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("[DELETE_JABATAN_MASTER_ERROR]", error);
    res.status(500).json({ message: "Gagal menghapus jabatan." });
  }
};

import { Request, Response } from "express";
import { HttpError } from "../common/errors/http-error";
import {
  getDosenPublikasi,
  getDosenRepositoryList,
} from "./dosen-repository.service";
import {
  getDosenPublikasiSchema,
  getDosenRepositorySchema,
} from "./dosen-repository.validation";

export const getPublicDosenRepositoryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const queryValidation = getDosenRepositorySchema.safeParse(req.query);

    if (!queryValidation.success) {
      return res.status(400).json({
        message: "Validasi query gagal.",
        errors: queryValidation.error.flatten().fieldErrors,
      });
    }

    const result = await getDosenRepositoryList(queryValidation.data);

    return res.status(200).json({
      message: "Berhasil mengambil daftar dosen repository.",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil daftar dosen repository.",
    });
  }
};

export const getPublicDosenPublikasiController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const queryValidation = getDosenPublikasiSchema.safeParse({
      id: req.params.id,
      basis: typeof req.query.basis === "string" ? req.query.basis : undefined,
    });

    if (!queryValidation.success) {
      return res.status(400).json({
        message: "Validasi permintaan gagal.",
        errors: queryValidation.error.flatten().fieldErrors,
      });
    }

    const result = await getDosenPublikasi(
      queryValidation.data.id,
      queryValidation.data.basis,
    );

    return res.status(200).json({
      message: "Berhasil mengambil publikasi dosen.",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil publikasi dosen.",
    });
  }
};

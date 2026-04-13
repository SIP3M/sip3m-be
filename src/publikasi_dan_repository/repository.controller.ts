import { Request, Response } from "express";
import { HttpError } from "../common/errors/http-error";
import { getPublicPengabdianRepository } from "./repository.service";
import { getPublicRepositorySchema } from "./repository.validation";

export const getPublicPengabdianRepositoryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const queryValidation = getPublicRepositorySchema.safeParse(req.query);

    if (!queryValidation.success) {
      return res.status(400).json({
        message: "Validasi query gagal.",
        errors: queryValidation.error.flatten().fieldErrors,
      });
    }

    const result = await getPublicPengabdianRepository(queryValidation.data);

    return res.status(200).json({
      message: "Berhasil mengambil repository pengabdian publik.",
      ...result,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({
      message:
        "Terjadi kesalahan pada server saat mengambil repository publik.",
    });
  }
};

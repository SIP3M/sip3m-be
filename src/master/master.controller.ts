import { Request, Response } from "express";
import { AuthenticatedRequest } from "../auth/types/auth.jwt.types";
import { HttpError } from "../common/errors/http-error";
import {
  createFakultas,
  createProgramStudi,
  deleteFakultas,
  deleteProgramStudi,
  getAllFakultas,
  getAllProgramStudi,
  getProgramStudiByFakultasId,
  updateFakultas,
  updateProgramStudi,
} from "./master.service";
import {
  createFakultasSchema,
  createProgramStudiSchema,
  updateFakultasSchema,
  updateProgramStudiSchema,
} from "./master.validation";

const parseIdParam = (raw: string | string[]): number => {
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (Number.isNaN(id) || id <= 0) throw new HttpError("ID tidak valid.", 400);
  return id;
};

const handleError = (res: Response, error: unknown, fallback: string) => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  console.error("[MASTER_DATA_ERROR]", error);
  return res.status(500).json({ message: fallback });
};

// =============================================
// Read-only (publik — dipakai dropdown)
// =============================================

export const getFakultasController = async (req: Request, res: Response) => {
  try {
    const fakultas = await getAllFakultas();
    return res.status(200).json({ data: fakultas });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return res.status(500).json({ message: "Gagal mengambil data fakultas." });
  }
};

export const getProgramStudiController = async (req: Request, res: Response) => {
  try {
    const fakultasId = Number(req.params.fakultasId);
    if (isNaN(fakultasId)) {
      return res.status(400).json({ message: "ID Fakultas tidak valid." });
    }

    const programStudi = await getProgramStudiByFakultasId(fakultasId);
    return res.status(200).json({ data: programStudi });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return res.status(500).json({ message: "Gagal mengambil data program studi." });
  }
};

/** GET /program-studi — seluruh prodi (publik, dipakai halaman Kelola Program Studi). */
export const getAllProgramStudiController = async (req: Request, res: Response) => {
  try {
    const programStudi = await getAllProgramStudi();
    return res.status(200).json({ data: programStudi });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return res.status(500).json({ message: "Gagal mengambil data program studi." });
  }
};

// =============================================
// CRUD — hanya ADMIN_SISTEM (guard di routes)
// =============================================

export const createFakultasController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);

    const parsed = createFakultasSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi data gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = await createFakultas(parsed.data.nama);
    res.locals.audit = {
      modul: "Fakultas",
      aksi: "CREATE",
      objek: `Fakultas: ${parsed.data.nama}`,
      objekId: data?.id,
    };
    return res.status(201).json({ message: "Fakultas berhasil ditambahkan.", data });
  } catch (error) {
    return handleError(res, error, "Gagal menambahkan fakultas.");
  }
};

export const updateFakultasController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = parseIdParam(req.params.fakultasId);

    const parsed = updateFakultasSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi data gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = await updateFakultas(id, parsed.data.nama);
    res.locals.audit = {
      modul: "Fakultas",
      aksi: "UPDATE",
      objek: `Fakultas: ${parsed.data.nama}`,
      objekId: id,
    };
    return res.status(200).json({ message: "Fakultas berhasil diperbarui.", data });
  } catch (error) {
    return handleError(res, error, "Gagal memperbarui fakultas.");
  }
};

export const deleteFakultasController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = parseIdParam(req.params.fakultasId);

    res.locals.audit = {
      modul: "Fakultas",
      aksi: "DELETE",
      objek: `Fakultas (id ${id})`,
      objekId: id,
    };
    await deleteFakultas(id);
    return res.status(200).json({ message: "Fakultas berhasil dihapus.", data: { id } });
  } catch (error) {
    return handleError(res, error, "Gagal menghapus fakultas.");
  }
};

export const createProgramStudiController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const fakultasId = parseIdParam(req.params.fakultasId);

    const parsed = createProgramStudiSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi data gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = await createProgramStudi(fakultasId, parsed.data.nama);
    res.locals.audit = {
      modul: "Program Studi",
      aksi: "CREATE",
      objek: `Program Studi: ${parsed.data.nama}`,
      objekId: data?.id,
    };
    return res.status(201).json({ message: "Program studi berhasil ditambahkan.", data });
  } catch (error) {
    return handleError(res, error, "Gagal menambahkan program studi.");
  }
};

export const updateProgramStudiController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = parseIdParam(req.params.programStudiId);

    const parsed = updateProgramStudiSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validasi data gagal.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = await updateProgramStudi(id, parsed.data.nama);
    res.locals.audit = {
      modul: "Program Studi",
      aksi: "UPDATE",
      objek: `Program Studi: ${parsed.data.nama}`,
      objekId: id,
    };
    return res.status(200).json({ message: "Program studi berhasil diperbarui.", data });
  } catch (error) {
    return handleError(res, error, "Gagal memperbarui program studi.");
  }
};

export const deleteProgramStudiController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const id = parseIdParam(req.params.programStudiId);

    res.locals.audit = {
      modul: "Program Studi",
      aksi: "DELETE",
      objek: `Program Studi (id ${id})`,
      objekId: id,
    };
    await deleteProgramStudi(id);
    return res
      .status(200)
      .json({ message: "Program studi berhasil dihapus.", data: { id } });
  } catch (error) {
    return handleError(res, error, "Gagal menghapus program studi.");
  }
};

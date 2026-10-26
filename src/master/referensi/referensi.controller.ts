import { Request, Response } from "express";
import { HttpError } from "../../common/errors/http-error";
import {
  JENIS_MODUL_LABEL,
  JENIS_REFERENSI,
  type JenisReferensi,
} from "./referensi.types";
import * as referensiService from "./referensi.service";
import {
  createReferensiSchema,
  updateReferensiSchema,
} from "./referensi.validation";

const parseJenis = (raw: string | string[]): JenisReferensi => {
  const jenis = String(Array.isArray(raw) ? raw[0] : raw);
  if (!(JENIS_REFERENSI as readonly string[]).includes(jenis)) {
    throw new HttpError(
      "Jenis tidak valid. Pilihan: SKEMA, SUMBER_PENDANAAN.",
      400,
    );
  }
  return jenis as JenisReferensi;
};

const parseIdParam = (raw: string | string[]): number => {
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (Number.isNaN(id) || id <= 0) {
    throw new HttpError("ID tidak valid.", 400);
  }
  return id;
};

/** GET /referensi/:jenis — publik, hanya opsi aktif (dropdown proposal). */
export const getReferensiAktifController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const jenis = parseJenis(req.params.jenis);
  const data = await referensiService.getReferensiAktif(jenis);
  return res.status(200).json({ data });
};

/** GET /master/referensi/:jenis — ADMIN_SISTEM, semua baris. */
export const getAllReferensiController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const jenis = parseJenis(req.params.jenis);
  const data = await referensiService.getAllReferensi(jenis);
  return res.status(200).json({ data });
};

/** POST /master/referensi/:jenis — ADMIN_SISTEM. */
export const createReferensiController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const jenis = parseJenis(req.params.jenis);

  const validation = createReferensiSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      message: "Validasi data gagal.",
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const data = await referensiService.createReferensi(jenis, validation.data);

  res.locals.audit = {
    modul: JENIS_MODUL_LABEL[jenis],
    aksi: "CREATE",
    objek: `${JENIS_MODUL_LABEL[jenis]}: ${data.nama}`,
    objekId: data.id,
  };

  return res.status(201).json({ message: "Opsi berhasil ditambahkan.", data });
};

/** PATCH /master/referensi/:referensiId — ADMIN_SISTEM. */
export const updateReferensiController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = parseIdParam(req.params.referensiId);

  const validation = updateReferensiSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      message: "Validasi data gagal.",
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const data = await referensiService.updateReferensi(id, validation.data);
  const modul = JENIS_MODUL_LABEL[data.jenis as JenisReferensi] ?? "Master Data";

  res.locals.audit = {
    modul,
    aksi: "UPDATE",
    objek: `${modul}: ${data.nama}${validation.data.is_aktif === false ? " (dinonaktifkan)" : ""}`,
    objekId: data.id,
  };

  return res.status(200).json({ message: "Opsi berhasil diperbarui.", data });
};

/** DELETE /master/referensi/:referensiId — ADMIN_SISTEM (409 bila dipakai). */
export const deleteReferensiController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = parseIdParam(req.params.referensiId);

  const deleted = await referensiService.deleteReferensi(id);
  const modul =
    JENIS_MODUL_LABEL[deleted.jenis as JenisReferensi] ?? "Master Data";

  res.locals.audit = {
    modul,
    aksi: "DELETE",
    objek: `${modul}: ${deleted.nama}`,
    objekId: deleted.id,
  };

  return res.status(200).json({ message: "Opsi berhasil dihapus." });
};

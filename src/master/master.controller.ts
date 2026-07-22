import { Request, Response } from "express";
import { getAllFakultas, getProgramStudiByFakultasId } from "./master.service";

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
  } catch (error) {
    return res.status(500).json({ message: "Gagal mengambil data program studi." });
  }
};
import { Response } from "express";
import { AuthenticatedRequest } from "../../auth/types/auth.jwt.types";
import { HttpError } from "../../common/errors/http-error";
import { kkmSkemaPortalQuerySchema } from "./kkm-skema.validation";
import { getSkemaPortal } from "./kkm-skema.service";

export const getSkemaPortalController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) throw new HttpError("Unauthorized", 401);
    const parsed = kkmSkemaPortalQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Validasi query gagal.", errors: parsed.error.flatten().fieldErrors });
    }
    const data = await getSkemaPortal(parsed.data);
    return res.status(200).json({ message: "Berhasil mengambil daftar skema KKM.", ...data });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    console.error("[GET_SKEMA_PORTAL_ERROR]", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil daftar skema KKM." });
  }
};

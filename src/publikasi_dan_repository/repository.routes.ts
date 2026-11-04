import { Router } from "express";
import { getPublicPublikasiController } from "./publikasi.controller";
import { getPublicPengabdianRepositoryController } from "./repository.controller";

const router = Router();

router.get(
  "/public/repository/pengabdian",
  getPublicPengabdianRepositoryController,
);

router.get("/public/repository/publikasi", getPublicPublikasiController);

export default router;

import { Router } from "express";
import { getPublicPublikasiController } from "./publikasi.controller";
import { getPublicPengabdianRepositoryController } from "./repository.controller";
import {
  getPublicDosenPublikasiController,
  getPublicDosenRepositoryController,
} from "./dosen-repository.controller";

const router = Router();

router.get(
  "/public/repository/pengabdian",
  getPublicPengabdianRepositoryController,
);

router.get("/public/repository/publikasi", getPublicPublikasiController);

router.get("/public/repository/dosen", getPublicDosenRepositoryController);

router.get(
  "/public/repository/dosen/:id/publikasi",
  getPublicDosenPublikasiController,
);

export default router;

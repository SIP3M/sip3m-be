import { Router } from "express";
import { getPublicPengabdianRepositoryController } from "./repository.controller";

const router = Router();

router.get(
  "/public/repository/pengabdian",
  getPublicPengabdianRepositoryController,
);

export default router;

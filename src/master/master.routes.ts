import { Router } from "express";
import { getFakultasController, getProgramStudiController } from "./master.controller";

const router = Router();

router.get("/fakultas", getFakultasController);
router.get("/fakultas/:fakultasId/program-studi", getProgramStudiController);

export default router;
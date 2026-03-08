import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware";
import {
  getNotificationsController,
  markNotificationAsReadController,
} from "./notification.controller";

const router = Router();

router.get("/notifications", authMiddleware, getNotificationsController);

router.patch(
  "/notifications/:id/read",
  authMiddleware,
  markNotificationAsReadController,
);

export default router;

import { Response } from "express";
import { AuthenticatedRequest } from "../auth/types/auth.jwt.types";
import { HttpError } from "../common/errors/http-error";
import {
  getNotifications,
  markNotificationAsRead,
} from "./notification.service";

export const getNotificationsController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    const userId = Number(req.user.userId);
    const result = await getNotifications(userId);

    return res.status(200).json({
      message: "Berhasil mengambil notifikasi.",
      data: result,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[GET_NOTIFICATIONS_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat mengambil notifikasi.",
    });
  }
};

export const markNotificationAsReadController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.userId) {
      throw new HttpError("Unauthorized", 401);
    }

    const userId = Number(req.user.userId);
    const notificationId = Number(req.params.id);
    if (isNaN(notificationId)) {
      return res.status(400).json({ message: "ID notifikasi tidak valid." });
    }

    const notification = await markNotificationAsRead(notificationId, userId);

    return res.status(200).json({
      message: "Notifikasi berhasil ditandai sebagai dibaca.",
      data: notification,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("[MARK_NOTIFICATION_READ_ERROR]", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server saat memperbarui notifikasi.",
    });
  }
};

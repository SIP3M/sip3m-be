import { prisma } from "../prisma";
import { HttpError } from "../common/errors/http-error";


export const getNotifications = async (userId: number) => {
  const notifications = await prisma.notifications.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
  });

  const unreadCount = await prisma.notifications.count({
    where: { user_id: userId, is_read: false },
  });

  return {
    unread_count: unreadCount,
    notifications,
  };
};

export const markNotificationAsRead = async (
  notificationId: number,
  userId: number,
) => {
  const notification = await prisma.notifications.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new HttpError("Notifikasi tidak ditemukan.", 404);
  }

  if (notification.user_id !== userId) {
    throw new HttpError(
      "Anda tidak memiliki izin untuk mengakses notifikasi ini.",
      403,
    );
  }

  if (notification.is_read) {
    return notification;
  }

  const updated = await prisma.notifications.update({
    where: { id: notificationId },
    data: { is_read: true },
  });

  return updated;
};

import { prisma } from "../prisma";
import crypto from "crypto";

export const MAX_DEVICES_PER_USER = 3;

export const createOrRotateSession = async (params: {
  userId: number;
  deviceId: string;
  jti: string;
  userAgent?: string;
  ip?: string;
  expiresAt: Date;
}) => {
  const { userId, deviceId, jti, userAgent, ip, expiresAt } = params;

  // Enforce Single-Session per Browser: upsert by (user_id, device_id) -> revoke lama, ganti jti
  // Jika user sudah punya MAX_DEVICES, revoke yang terlama
  const activeCount = await prisma.userSession.count({
    where: { user_id: userId, revoked_at: null, expires_at: { gt: new Date() } },
  });
  const existing = await prisma.userSession.findUnique({
    where: { user_id_device_id: { user_id: userId, device_id: deviceId } },
  });

  if (!existing && activeCount >= MAX_DEVICES_PER_USER) {
    const oldest = await prisma.userSession.findFirst({
      where: { user_id: userId, revoked_at: null },
      orderBy: { created_at: "asc" },
    });
    if (oldest) {
      await prisma.userSession.update({
        where: { id: oldest.id },
        data: { revoked_at: new Date() },
      });
    }
  }

  const session = await prisma.userSession.upsert({
    where: { user_id_device_id: { user_id: userId, device_id: deviceId } },
    update: { jti, user_agent: userAgent, ip, expires_at: expiresAt, revoked_at: null },
    create: { user_id: userId, device_id: deviceId, jti, user_agent: userAgent, ip, expires_at: expiresAt },
  });

  return session;
};

export const isSessionActive = async (jti: string): Promise<boolean> => {
  if (!jti) return false;
  const s = await prisma.userSession.findUnique({ where: { jti } });
  if (!s) return false;
  if (s.revoked_at) return false;
  if (s.expires_at < new Date()) return false;
  return true;
};

export const revokeSessionByJti = async (jti: string) => {
  if (!jti) return;
  await prisma.userSession.updateMany({ where: { jti, revoked_at: null }, data: { revoked_at: new Date() } });
};

export const revokeAllUserSessions = async (userId: number) => {
  await prisma.userSession.updateMany({ where: { user_id: userId, revoked_at: null }, data: { revoked_at: new Date() } });
};

export const getActiveSessions = async (userId: number) => {
  return prisma.userSession.findMany({
    where: { user_id: userId, revoked_at: null, expires_at: { gt: new Date() } },
    orderBy: { created_at: "desc" },
  });
};

export const revokeDeviceSession = async (userId: number, deviceId: string) => {
  await prisma.userSession.updateMany({
    where: { user_id: userId, device_id: deviceId, revoked_at: null },
    data: { revoked_at: new Date() },
  });
};

export const generateJti = () => crypto.randomUUID();

import { prisma } from "../prisma";

export type AuditStatus = "SUCCESS" | "FAILED";

export interface AuditInput {
  userId?: number | null;
  userRole?: string | null;
  modul: string;
  aksi: string;
  objek: string;
  objekId?: string | number | null;
  ip?: string | null;
  status: AuditStatus;
}

/**
 * Menulis satu baris audit log.
 *
 * Fire-and-forget: fungsi ini SELALU menangkap error sendiri dan tidak pernah
 * melempar — kegagalan menulis audit tidak boleh menjatuhkan request utama.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    // Snapshot nama aktor saat kejadian (tetap ada walau user berubah/hapus).
    // JWT tidak memuat nama, jadi sekali lookup ringan.
    let userName: string | null = null;
    if (input.userId) {
      const u = await prisma.users.findUnique({
        where: { id: input.userId },
        select: { name: true },
      });
      userName = u?.name ?? null;
    }

    await prisma.auditLog.create({
      data: {
        user_id: input.userId ?? null,
        user_name: userName,
        user_role: input.userRole ?? null,
        modul: input.modul,
        aksi: input.aksi,
        objek: input.objek,
        objek_id: input.objekId != null ? String(input.objekId) : null,
        ip: input.ip ?? null,
        status: input.status,
      },
    });
  } catch (err) {
    console.error("[AUDIT] gagal menulis log:", err);
  }
}

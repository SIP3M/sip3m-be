import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { Prisma } from "../generated/prisma/client";

const EXPORT_MAX_ROWS = 10000;

const auditQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  modul: z.string().trim().min(1).max(100).optional(),
  aksi: z.string().trim().min(1).max(50).optional(),
  status: z.enum(["SUCCESS", "FAILED"]).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD.")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD.")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

type AuditQuery = z.infer<typeof auditQuerySchema>;

/** Buang query param bernilai "" supaya tidak gagal validasi. */
const stripEmpty = (query: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== "" && v != null),
  );

const buildWhere = (q: AuditQuery): Prisma.AuditLogWhereInput => {
  const and: Prisma.AuditLogWhereInput[] = [];
  if (q.q) {
    and.push({
      OR: [
        { objek: { contains: q.q, mode: "insensitive" } },
        { user_name: { contains: q.q, mode: "insensitive" } },
      ],
    });
  }
  if (q.modul) and.push({ modul: q.modul });
  if (q.aksi) and.push({ aksi: q.aksi });
  if (q.status) and.push({ status: q.status });
  if (q.from) and.push({ created_at: { gte: new Date(`${q.from}T00:00:00.000`) } });
  if (q.to) and.push({ created_at: { lte: new Date(`${q.to}T23:59:59.999`) } });
  return and.length ? { AND: and } : {};
};

/**
 * GET /audit-logs — daftar audit log (ADMIN_SISTEM).
 * Filter: q (objek/pengguna), modul, aksi, status, from, to + pagination.
 */
export const getAuditLogs = async (req: Request, res: Response): Promise<Response> => {
  const parsed = auditQuerySchema.safeParse(stripEmpty(req.query as Record<string, unknown>));
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validasi data gagal.",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const q = parsed.data;
  const where = buildWhere(q);
  const skip = (q.page - 1) * q.limit;

  const [total, data, modulRows, aksiRows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: q.limit,
    }),
    prisma.auditLog.findMany({
      distinct: ["modul"],
      select: { modul: true },
      orderBy: { modul: "asc" },
    }),
    prisma.auditLog.findMany({
      distinct: ["aksi"],
      select: { aksi: true },
      orderBy: { aksi: "asc" },
    }),
  ]);

  return res.status(200).json({
    data,
    meta: {
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
      filters: {
        moduls: modulRows.map((r) => r.modul),
        aksis: aksiRows.map((r) => r.aksi),
      },
    },
  });
};

/** Sel semua sel — quote & ganda tanda kutip agar aman untuk Excel. */
const csvCell = (value: unknown): string =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;

const STATUS_LABEL: Record<string, string> = {
  SUCCESS: "Berhasil",
  FAILED: "Gagal",
};

/**
 * GET /audit-logs/export — unduh CSV (filter sama dengan daftar).
 * Dibatasi EXPORT_MAX_ROWS baris terbaru.
 */
export const exportAuditLogs = async (req: Request, res: Response): Promise<Response> => {
  const parsed = auditQuerySchema.safeParse(stripEmpty(req.query as Record<string, unknown>));
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validasi data gagal.",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const rows = await prisma.auditLog.findMany({
    where: buildWhere(parsed.data),
    orderBy: { created_at: "desc" },
    take: EXPORT_MAX_ROWS,
  });

  const header = "Timestamp,Pengguna,Role,Modul,Aksi,Objek,IP,Status";
  const lines = rows.map((r) =>
    [
      r.created_at.toISOString(),
      r.user_name ?? "System",
      r.user_role ?? "",
      r.modul,
      r.aksi,
      r.objek,
      r.ip ?? "",
      STATUS_LABEL[r.status] ?? r.status,
    ]
      .map(csvCell)
      .join(","),
  );

  // BOM agar Excel membaca UTF-8 dengan benar
  const csv = "\uFEFF" + [header, ...lines].join("\r\n");
  const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(csv);
};

import { z } from "zod";
import {
  PENGUMUMAN_PRIORITAS,
  PENGUMUMAN_STATUS,
  PENGUMUMAN_TARGET_TYPES,
  TARGET_WITH_REF,
  type PengumumanTargetType,
} from "./kkm-pengumuman.types";

export interface PengumumanTargetInput {
  type: PengumumanTargetType;
  ref_id?: number | null;
}

/** Satu entri target: { "type": "KELOMPOK", "ref_id": 3 }. */
const targetItemSchema = z
  .object({
    type: z.enum(PENGUMUMAN_TARGET_TYPES),
    ref_id: z.coerce.number().int().positive().nullish(),
  })
  .superRefine((val, ctx) => {
    if (TARGET_WITH_REF.includes(val.type) && !val.ref_id) {
      ctx.addIssue({
        code: "custom",
        message: `Target ${val.type} memerlukan ref_id.`,
      });
    }
  });

/**
 * Multipart mengirim `targets` sebagai string JSON → transform lalu pipe
 * ke array. Kosong/tidak valid menghasilkan 400 dengan pesan field.
 */
const targetsSchema = z
  .string({ message: "Target penerima wajib diisi." })
  .min(1, "Target penerima wajib dipilih minimal satu.")
  .transform((raw, ctx) => {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "Format target tidak valid." });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(targetItemSchema)
      .min(1, "Pilih minimal satu target penerima."),
  );

const judulField = z
  .string({ message: "Judul wajib diisi." })
  .trim()
  .min(1, "Judul wajib diisi.")
  .max(255, "Judul maksimal 255 karakter.");

const isiField = z
  .string({ message: "Isi pengumuman wajib diisi." })
  .trim()
  .min(1, "Isi pengumuman wajib diisi.")
  .max(20000, "Isi pengumuman maksimal 20.000 karakter.");

const kategoriField = z
  .string({ message: "Kategori wajib dipilih." })
  .trim()
  .min(1, "Kategori wajib dipilih.")
  .max(100, "Kategori maksimal 100 karakter.");

/** POST /kkm/pengumuman (multipart). */
export const createPengumumanSchema = z
  .object({
    judul: judulField,
    isi: isiField,
    kategori: kategoriField,
    prioritas: z
      .enum(PENGUMUMAN_PRIORITAS, { message: "Prioritas tidak valid." })
      .default("SEDANG"),
    targets: targetsSchema,
    publish_mode: z
      .enum(["now", "scheduled"], { message: "Mode publikasi tidak valid." })
      .default("now"),
    scheduled_at: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.publish_mode === "scheduled") {
      const ts = val.scheduled_at ? Date.parse(val.scheduled_at) : NaN;
      if (Number.isNaN(ts)) {
        ctx.addIssue({
          code: "custom",
          path: ["scheduled_at"],
          message: "Waktu jadwal tidak valid.",
        });
      } else if (ts <= Date.now() + 30_000) {
        ctx.addIssue({
          code: "custom",
          path: ["scheduled_at"],
          message: "Waktu jadwal harus lebih lambat dari waktu sekarang.",
        });
      }
    }
  });

/** PATCH /kkm/pengumuman/:id — target & jadwal hanya sebelum publish. */
export const updatePengumumanSchema = z.object({
  judul: judulField.optional(),
  isi: isiField.optional(),
  kategori: kategoriField.optional(),
  prioritas: z
    .enum(PENGUMUMAN_PRIORITAS, { message: "Prioritas tidak valid." })
    .optional(),
  targets: targetsSchema.optional(),
  scheduled_at: z.string().optional(),
});

/** GET /kkm/pengumuman — filter daftar admin. */
export const pengumumanQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().trim().optional(),
  kategori: z.string().trim().optional(),
  prioritas: z.enum(PENGUMUMAN_PRIORITAS).optional(),
  status: z.enum(PENGUMUMAN_STATUS).optional(),
  audiens: z.enum(PENGUMUMAN_TARGET_TYPES).optional(),
});

export type CreatePengumumanInput = z.infer<typeof createPengumumanSchema>;
export type UpdatePengumumanInput = z.infer<typeof updatePengumumanSchema>;
export type PengumumanQueryInput = z.infer<typeof pengumumanQuerySchema>;

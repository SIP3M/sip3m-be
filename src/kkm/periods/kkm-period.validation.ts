import { z } from "zod";
import { JenisKkm, KkmPeriodStatus } from "../../generated/prisma/enums";

const dateField = z.coerce.date().optional().nullable();

/** Jam "HH:mm" (contoh: 23:59). */
const jamField = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam harus HH:mm, contoh: 23:59.")
  .optional()
  .nullable();

/** Hari deadline logbook kelompok: 1 = Senin .. 7 = Minggu. */
const logbookKelompokHariField = z.coerce
  .number({ message: "Hari deadline logbook kelompok harus berupa angka." })
  .int("Hari deadline logbook kelompok harus bilangan bulat.")
  .min(1, "Pilihan hari tidak valid (1 = Senin).")
  .max(7, "Pilihan hari tidak valid (7 = Minggu).")
  .optional()
  .nullable();

const tahunAkademikField = z
  .string()
  .trim()
  .regex(/^\d{4}\/\d{4}$/, "Format tahun akademik harus YYYY/YYYY, contoh: 2025/2026.")
  .refine(
    (v) => {
      const [a, b] = v.split("/").map(Number);
      return b === a + 1;
    },
    { message: "Tahun akademik harus berurutan, contoh: 2025/2026." },
  );

const validateDateOrder = (
  data: {
    tgl_buka_daftar?: Date | null;
    tgl_tutup_daftar?: Date | null;
    tgl_pembekalan?: Date | null;
    tgl_pelaksanaan?: Date | null;
    tgl_penarikan?: Date | null;
    deadline_laporan?: Date | null;
  },
  ctx: z.RefinementCtx,
) => {
  const order: Array<[keyof typeof data, string]> = [
    ["tgl_buka_daftar", "Tanggal buka pendaftaran"],
    ["tgl_tutup_daftar", "Tanggal tutup pendaftaran"],
    ["tgl_pembekalan", "Tanggal pembekalan"],
    ["tgl_pelaksanaan", "Tanggal pelaksanaan"],
    ["tgl_penarikan", "Tanggal penarikan"],
    ["deadline_laporan", "Deadline laporan akhir"],
  ];

  let prev: Date | null = null;
  let prevLabel = "";
  for (const [key, label] of order) {
    const cur = data[key] as Date | null | undefined;
    if (!cur) continue;
    if (prev && cur < prev) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${label} tidak boleh lebih awal dari ${prevLabel}.`,
      });
    }
    prev = cur;
    prevLabel = label;
  }
};

/**
 * Konsistensi deadline unggahan terhadap rentang kegiatan:
 * - Deadline logbook individu  harus antara pelaksanaan .. penarikan.
 * - Deadline laporan individu  tidak boleh lebih awal dari tgl_penarikan.
 */
const validateDeadlineUnggahan = (
  data: {
    tgl_pelaksanaan?: Date | null;
    tgl_penarikan?: Date | null;
    deadline_logbook_individu?: Date | null;
    deadline_laporan_individu?: Date | null;
  },
  ctx: z.RefinementCtx,
) => {
  const { tgl_pelaksanaan, tgl_penarikan, deadline_logbook_individu, deadline_laporan_individu } =
    data;

  if (
    deadline_logbook_individu &&
    tgl_pelaksanaan &&
    deadline_logbook_individu < tgl_pelaksanaan
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["deadline_logbook_individu"],
      message: "Deadline logbook individu tidak boleh lebih awal dari tanggal pelaksanaan.",
    });
  }

  if (
    deadline_logbook_individu &&
    tgl_penarikan &&
    deadline_logbook_individu > tgl_penarikan
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["deadline_logbook_individu"],
      message: "Deadline logbook individu tidak boleh melewati tanggal penarikan.",
    });
  }

  if (
    deadline_laporan_individu &&
    tgl_penarikan &&
    deadline_laporan_individu < tgl_penarikan
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["deadline_laporan_individu"],
      message: "Deadline laporan individu tidak boleh lebih awal dari tanggal penarikan.",
    });
  }
};

const baseFields = {
  nama_periode: z
    .string()
    .trim()
    .min(3, "Nama periode minimal 3 karakter.")
    .max(150, "Nama periode maksimal 150 karakter."),
  tahun_akademik: tahunAkademikField,
  tahun: z.coerce
    .number({ message: "Tahun harus berupa angka." })
    .int("Tahun harus bilangan bulat.")
    .min(2000, "Tahun minimal 2000.")
    .max(2100, "Tahun maksimal 2100."),
  jenis: z.nativeEnum(JenisKkm, {
    message: "Jenis KKM tidak valid. Pilihan: REGULER, TEMATIK.",
  }),
  deskripsi: z
    .string()
    .trim()
    .max(2000, "Deskripsi maksimal 2000 karakter.")
    .optional()
    .nullable(),

  tgl_buka_daftar: dateField,
  tgl_tutup_daftar: dateField,
  tgl_pembekalan: dateField,
  tgl_pelaksanaan: dateField,
  tgl_penarikan: dateField,
  deadline_laporan: dateField,

  // ===== Pengaturan deadline unggahan (diatur admin LPPM) =====
  deadline_logbook_individu: dateField,
  logbook_individu_hari: logbookKelompokHariField,
  logbook_individu_jam: jamField,
  logbook_kelompok_hari: logbookKelompokHariField,
  logbook_kelompok_jam: jamField,
  deadline_laporan_individu: dateField,
  jam_laporan_individu: jamField,
  jam_laporan_kelompok: jamField,

  target_peserta: z.coerce
    .number({ message: "Target peserta harus berupa angka." })
    .int("Target peserta harus bilangan bulat.")
    .min(0, "Target peserta minimal 0.")
    .default(0),
  minimal_semester: z.coerce
    .number({ message: "Minimal semester harus berupa angka." })
    .int()
    .min(1, "Minimal semester minimal 1.")
    .max(14, "Minimal semester maksimal 14.")
    .optional()
    .nullable(),
  maks_anggota_kelompok: z.coerce
    .number()
    .int()
    .min(1, "Maks anggota/kelompok minimal 1.")
    .max(50, "Maks anggota/kelompok maksimal 50.")
    .default(10),
  boleh_lintas_fakultas: z.coerce.boolean().default(false),
  wajib_campur_prodi: z.coerce.boolean().default(false),

  assign_dpl_otomatis: z.coerce.boolean().default(false),
  maks_kelompok_per_dosen: z.coerce
    .number()
    .int()
    .min(1, "Maks kelompok per dosen minimal 1.")
    .max(20, "Maks kelompok per dosen maksimal 20.")
    .optional()
    .nullable(),

  status: z
    .nativeEnum(KkmPeriodStatus, {
      message: "Status tidak valid. Pilihan: DRAFT, AKTIF, DIJADWALKAN, SELESAI.",
    })
    .default(KkmPeriodStatus.DRAFT),
};

export const createKkmPeriodSchema = z
  .object(baseFields)
  .superRefine((data, ctx) => {
    validateDateOrder(data, ctx);
    validateDeadlineUnggahan(data, ctx);
  });

export const updateKkmPeriodSchema = z
  .object({
    nama_periode: baseFields.nama_periode.optional(),
    tahun_akademik: baseFields.tahun_akademik.optional(),
    tahun: baseFields.tahun.optional(),
    jenis: baseFields.jenis.optional(),
    deskripsi: baseFields.deskripsi,
    tgl_buka_daftar: dateField,
    tgl_tutup_daftar: dateField,
    tgl_pembekalan: dateField,
    tgl_pelaksanaan: dateField,
    tgl_penarikan: dateField,
    deadline_laporan: dateField,
    deadline_logbook_individu: baseFields.deadline_logbook_individu.optional(),
    logbook_individu_hari: baseFields.logbook_individu_hari.optional(),
    logbook_individu_jam: baseFields.logbook_individu_jam,
    logbook_kelompok_hari: baseFields.logbook_kelompok_hari.optional(),
    logbook_kelompok_jam: baseFields.logbook_kelompok_jam,
    deadline_laporan_individu: baseFields.deadline_laporan_individu.optional(),
    jam_laporan_individu: baseFields.jam_laporan_individu,
    jam_laporan_kelompok: baseFields.jam_laporan_kelompok,
    target_peserta: baseFields.target_peserta.optional(),
    minimal_semester: baseFields.minimal_semester,
    maks_anggota_kelompok: baseFields.maks_anggota_kelompok.optional(),
    boleh_lintas_fakultas: baseFields.boleh_lintas_fakultas.optional(),
    wajib_campur_prodi: baseFields.wajib_campur_prodi.optional(),
    assign_dpl_otomatis: baseFields.assign_dpl_otomatis.optional(),
    maks_kelompok_per_dosen: baseFields.maks_kelompok_per_dosen,
    status: baseFields.status.optional(),
  })
  .superRefine((data, ctx) => {
    validateDateOrder(data as never, ctx);
    validateDeadlineUnggahan(data as never, ctx);
  });

export const updateKkmPeriodStatusSchema = z.object({
  status: z.nativeEnum(KkmPeriodStatus, {
    message: "Status tidak valid. Pilihan: DRAFT, AKTIF, DIJADWALKAN, SELESAI.",
  }),
});

export const kkmPeriodQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  search: z.string().trim().optional(),
  status: z.nativeEnum(KkmPeriodStatus).optional(),
  jenis: z.nativeEnum(JenisKkm).optional(),
  tahun: z.coerce.number().int().optional(),
  tahun_akademik: z.string().trim().optional(),
});

export const kkmPeriodIdParamSchema = z.object({
  id: z.coerce.number().int().positive("ID periode tidak valid."),
});

export type CreateKkmPeriodInput = z.infer<typeof createKkmPeriodSchema>;
export type UpdateKkmPeriodInput = z.infer<typeof updateKkmPeriodSchema>;
export type UpdateKkmPeriodStatusInput = z.infer<typeof updateKkmPeriodStatusSchema>;
export type KkmPeriodQueryInput = z.infer<typeof kkmPeriodQuerySchema>;
export type KkmPeriodIdParam = z.infer<typeof kkmPeriodIdParamSchema>;

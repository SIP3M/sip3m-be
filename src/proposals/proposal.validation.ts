import { z } from "zod";
import { ProposalStatus, SkemaProposal, SumberPendanaan } from "../generated/prisma/enums";

// =============================================
// Base Fields (DRY - reusable across schemas)
// =============================================
const titleField = z
  .string()
  .min(5, "Judul proposal minimal 5 karakter.")
  .max(255, "Judul proposal maksimal 255 karakter.");

const facultyField = z.string().max(100, "Fakultas maksimal 100 karakter.");

const skemaLabelToEnum: Record<string, SkemaProposal> = {
  "Penelitian Pengembangan": SkemaProposal.PENELITIAN_PENGEMBANGAN,
  "Penelitian Terapan": SkemaProposal.PENELITIAN_TERAPAN,
  "Penelitian Kolaborasi": SkemaProposal.PENELITIAN_KOLABORASI,
};

const skemaField = z
  .enum(
    ["Penelitian Pengembangan", "Penelitian Terapan", "Penelitian Kolaborasi"],
    {
      message:
        "Skema tidak valid. Pilihan: Penelitian Pengembangan, Penelitian Terapan, Penelitian Kolaborasi.",
    },
  )
  .transform((value) => skemaLabelToEnum[value]);

const sumberPendanaanLabelToEnum: Record<string, SumberPendanaan> = {
  "Internal Kampus": SumberPendanaan.INTERNAL_KAMPUS,
  Kemendikbudristek: SumberPendanaan.KEMENDIKBUDRISTEK,
  Mandiri: SumberPendanaan.MANDIRI,
  Lainnya: SumberPendanaan.LAINNYA,
};

const sumberPendanaanField = z
  .enum(["Internal Kampus", "Kemendikbudristek", "Mandiri", "Lainnya"], {
    message:
      "Sumber pendanaan tidak valid. Pilihan: Internal Kampus, Kemendikbudristek, Mandiri, Lainnya.",
  })
  .transform((value) => sumberPendanaanLabelToEnum[value]);

const dosenTerlibatField = z.string().trim().max(1000).optional();
const nidnDosenField = z.string().trim().max(1000).optional(); 
const namaAnggotaField = z.string().trim().max(1000).optional();
const nimAnggotaField = z.string().trim().max(1000).optional();
const namaKetuaField = z.string().trim().max(100, "Nama ketua peneliti maksimal 100 karakter.").optional();
const nidnKetuaField = z.string().trim().max(30, "NIDN ketua maksimal 30 karakter.").optional();

// --- Helpers anti-double ---
const splitList = (value?: string | null): string[] => {
  if (!value) return [];
  return value
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
};
const normalizeName = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
const normalizeId = (s: string) => s.trim().toLowerCase();

const assertNoDuplicateDosen = (
  data: { dosen_terlibat?: string; nidn_dosen_terlibat?: string; nama_ketua?: string; nidn_ketua?: string; nama_anggota?: string; nim_anggota?: string },
  ctx: z.RefinementCtx,
) => {
  const dosenNames = splitList(data.dosen_terlibat);
  const nidnDosens = splitList(data.nidn_dosen_terlibat);
  const mahasiswaNames = splitList(data.nama_anggota);
  const nimMahasiswas = splitList(data.nim_anggota);

  // duplikat dalam dosen anggota
  {
    const seen = new Set<string>();
    for (const raw of dosenNames) {
      const norm = normalizeName(raw);
      if (seen.has(norm)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dosen_terlibat"], message: `Nama dosen "${raw.trim()}" duplikat di daftar anggota. Tiap dosen hanya boleh 1 kali.` });
        break;
      }
      seen.add(norm);
    }
  }
  // duplikat dalam NIDN anggota
  {
    const seen = new Set<string>();
    for (const raw of nidnDosens) {
      const norm = normalizeId(raw);
      if (!norm) continue;
      if (seen.has(norm)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["nidn_dosen_terlibat"], message: `NIDN "${raw.trim()}" duplikat di daftar anggota.` });
        break;
      }
      seen.add(norm);
    }
  }
  // duplikat dalam nama anggota mahasiswa
  {
    const seen = new Set<string>();
    for (const raw of mahasiswaNames) {
      const norm = normalizeName(raw);
      if (seen.has(norm)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["nama_anggota"], message: `Nama anggota "${raw.trim()}" duplikat.` });
        break;
      }
      seen.add(norm);
    }
  }
  // duplikat dalam NIM anggota
  {
    const seen = new Set<string>();
    for (const raw of nimMahasiswas) {
      const norm = normalizeId(raw);
      if (!norm) continue;
      if (seen.has(norm)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["nim_anggota"], message: `NIM "${raw.trim()}" duplikat.` });
        break;
      }
      seen.add(norm);
    }
  }

  // ketua vs anggota dosen (by nama)
  const ketuaNamaRaw = data.nama_ketua?.trim();
  if (ketuaNamaRaw) {
    const ketuaNorm = normalizeName(ketuaNamaRaw);
    if (dosenNames.some((n) => normalizeName(n) === ketuaNorm)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["nama_ketua"], message: `Ketua peneliti "${ketuaNamaRaw}" sudah ada di daftar anggota dosen. Tidak boleh double.` });
    }
  }
  // ketua vs anggota dosen (by NIDN)
  const ketuaNidnRaw = data.nidn_ketua?.trim();
  if (ketuaNidnRaw) {
    const ketuaNidnNorm = normalizeId(ketuaNidnRaw);
    if (nidnDosens.some((n) => normalizeId(n) === ketuaNidnNorm)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["nidn_ketua"], message: `NIDN ketua "${ketuaNidnRaw}" sudah ada di daftar anggota. Tidak boleh double.` });
    }
  }
};

const sumberDataField = z
  .string()
  .trim()
  .max(1000, "Sumber data penelitian maksimal 1000 karakter.")
  .optional();

const detailSumberField = z
  .string()
  .trim()
  .max(2000, "Detail sumber penelitian maksimal 2000 karakter.")
  .optional();

const instansiField = z
  .string()
  .trim()
  .max(255, "Instansi maksimal 255 karakter.")
  .optional();

const fundingField = z
  .union([z.string(), z.number()])
  .transform((val) => Number(val))
  .pipe(z.number().min(0, "Jumlah pendanaan tidak boleh negatif."));

const isDraftField = z
  .union([z.string(), z.boolean()])
  .transform((val) => val === "true" || val === true);

export const createProposalSchema = z
  .object({
    title: titleField,
    faculty: facultyField.optional(),
    skema: skemaField,
    sumber_pendanaan: sumberPendanaanField.optional(),
    funding_request_amount: fundingField.optional().default(0),
    sumber_data_penelitian: sumberDataField,
    detail_sumber_penelitian: detailSumberField,
    instansi: instansiField,

    dosen_terlibat: dosenTerlibatField,
    nidn_dosen_terlibat: nidnDosenField,
    nama_anggota: namaAnggotaField,
    nim_anggota: nimAnggotaField,
    nama_ketua: namaKetuaField,
    nidn_ketua: nidnKetuaField,

    is_draft: isDraftField.optional().default(false),
  })
  .superRefine((data, ctx) => assertNoDuplicateDosen(data, ctx));

export const editProposalSchema = z
  .object({
    title: titleField.optional(),
    faculty: facultyField.optional(),
    skema: skemaField.optional(),
    sumber_pendanaan: sumberPendanaanField.optional(),
    funding_request_amount: fundingField.optional(),
    sumber_data_penelitian: sumberDataField,
    detail_sumber_penelitian: detailSumberField,
    instansi: instansiField,

    dosen_terlibat: dosenTerlibatField,
    nidn_dosen_terlibat: nidnDosenField,
    nama_anggota: namaAnggotaField,
    nim_anggota: nimAnggotaField,
    nama_ketua: namaKetuaField,
    nidn_ketua: nidnKetuaField,

    is_draft: isDraftField.optional(),
  })
  .superRefine((data, ctx) => {
    // edit: hanya validasi field yang sedang dikirim (partial update), jadi skip jika semua null/undefined
    const hasDosenInput =
      data.dosen_terlibat !== undefined ||
      data.nidn_dosen_terlibat !== undefined ||
      data.nama_ketua !== undefined ||
      data.nidn_ketua !== undefined ||
      data.nama_anggota !== undefined ||
      data.nim_anggota !== undefined;
    if (hasDosenInput) assertNoDuplicateDosen(data as never, ctx);
  });

const adminReviewerStatuses = Object.values(ProposalStatus).filter(
  (s) => s !== ProposalStatus.DRAFT && s !== ProposalStatus.SUBMITTED,
) as [string, ...string[]];

export const updateProposalStatusSchema = z.object({
  status: z.enum(adminReviewerStatuses, {
    message: `Status tidak valid. Status yang diperbolehkan: ${adminReviewerStatuses.join(", ")}.`,
  }),
  notes: z.string().max(500, "Catatan maksimal 500 karakter.").optional(),
});

export const assignReviewerSchema = z.object({
  proposalIds: z
    .array(z.number({ message: "Setiap ID proposal harus berupa angka." }))
    .min(1, "Minimal memilih 1 proposal untuk diproses."),
});

const scoreField = z
  .number({ message: "Nilai skor harus berupa angka." })
  .min(0, "Skor minimal 0.")
  .max(100, "Skor maksimal 100.");

const reviewDecisionStatuses = [
  ProposalStatus.ACCEPTED,
  ProposalStatus.REJECTED,
  ProposalStatus.REVISION,
] as const;

const catatanPerPointField = z
  .string()
  .trim()
  .max(2000, "Catatan per point maksimal 2000 karakter.")
  .optional();

const reviewDecisionField = z
  .enum(["APPROVED", "REJECTED", "REVISION_MINOR", "REVISION_MAJOR"], {
    message: "Keputusan review tidak valid. Pilihan: APPROVED, REJECTED, REVISION_MINOR, REVISION_MAJOR.",
  })
  .optional();

const draftEvaluateProposalSchema = z.object({
  is_draft: z.literal(true),
  status: z
    .enum(reviewDecisionStatuses, {
      message: `Status hasil review tidak valid. Pilihan: ${reviewDecisionStatuses.join(", ")}.`,
    })
    .optional(),
  score_perumusan: scoreField.optional(),
  score_tinjauan: scoreField.optional(),
  score_metode: scoreField.optional(),
  score_anggaran: scoreField.optional(),
  score_luaran: scoreField.optional(),
  catatan_perumusan: catatanPerPointField,
  catatan_tinjauan: catatanPerPointField,
  catatan_metode: catatanPerPointField,
  catatan_anggaran: catatanPerPointField,
  catatan_luaran: catatanPerPointField,
  kekuatan_proposal: z
    .string()
    .trim()
    .max(5000, "Kekuatan proposal maksimal 5000 karakter.")
    .optional(),
  kelemahan_proposal: z
    .string()
    .trim()
    .max(5000, "Kelemahan proposal maksimal 5000 karakter.")
    .optional(),
  rekomendasi_akhir: z
    .string()
    .trim()
    .max(50, "Rekomendasi akhir maksimal 50 karakter.")
    .optional(),
  notes: z
    .string()
    .trim()
    .max(2000, "Catatan reviewer maksimal 2000 karakter.")
    .optional(),
  decision: reviewDecisionField,
  revision_deadline: z.string().datetime().optional(),
});

const submitEvaluateProposalSchema = z.object({
  is_draft: z.literal(false),
  status: z.enum(reviewDecisionStatuses, {
    message: `Status hasil review tidak valid. Pilihan: ${reviewDecisionStatuses.join(", ")}.`,
  }),
  score_perumusan: scoreField,
  score_tinjauan: scoreField,
  score_metode: scoreField,
  score_anggaran: scoreField,
  score_luaran: scoreField,
  catatan_perumusan: catatanPerPointField,
  catatan_tinjauan: catatanPerPointField,
  catatan_metode: catatanPerPointField,
  catatan_anggaran: catatanPerPointField,
  catatan_luaran: catatanPerPointField,
  kekuatan_proposal: z
    .string()
    .trim()
    .min(1, "Kekuatan proposal wajib diisi saat submit review.")
    .max(5000, "Kekuatan proposal maksimal 5000 karakter."),
  kelemahan_proposal: z
    .string()
    .trim()
    .min(1, "Kelemahan proposal wajib diisi saat submit review.")
    .max(5000, "Kelemahan proposal maksimal 5000 karakter."),
  rekomendasi_akhir: z
    .string()
    .trim()
    .min(1, "Rekomendasi akhir wajib diisi saat submit review.")
    .max(50, "Rekomendasi akhir maksimal 50 karakter."),
  notes: z
    .string()
    .trim()
    .max(2000, "Catatan reviewer maksimal 2000 karakter.")
    .optional(),
  decision: z.enum(["APPROVED", "REJECTED", "REVISION_MINOR", "REVISION_MAJOR"], {
    message: "Keputusan review wajib diisi saat submit review.",
  }),
  revision_deadline: z.string().datetime().optional(),
});

export const evaluateProposalSchema = z.discriminatedUnion("is_draft", [
  draftEvaluateProposalSchema,
  submitEvaluateProposalSchema,
]);

export const getAllProposalsQuerySchema = z.object({
  page: z.coerce
    .number({ message: "page harus berupa angka." })
    .int("page harus berupa bilangan bulat.")
    .min(1, "page minimal 1.")
    .default(1),
  search: z.string().trim().optional(),
  status: z
    .enum(Object.values(ProposalStatus) as [string, ...string[]], {
      message: `status tidak valid. Status yang diperbolehkan: ${Object.values(ProposalStatus).join(", ")}.`,
    })
    .optional(),
});

export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type EditProposalInput = z.infer<typeof editProposalSchema>;
export type UpdateProposalStatusInput = z.infer<
  typeof updateProposalStatusSchema
>;
export type AssignReviewerInput = z.infer<typeof assignReviewerSchema>;
export type GetAllProposalsQueryInput = z.infer<
  typeof getAllProposalsQuerySchema
>;
export type EvaluateProposalInput = z.infer<typeof evaluateProposalSchema>;

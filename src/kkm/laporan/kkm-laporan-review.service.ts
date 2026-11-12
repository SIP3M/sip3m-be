// =============================================
// Laporan KKM — sisi admin/Ketua LPPM, Staff, & DPL
// ---------------------------------------------
// Daftar laporan kelompok seluruh jenis (Awal/Mingguan/Akhir),
// statistik untuk kartu & chart, review (setujui/revisi), bulk approve,
// export Excel, dan himpunan file untuk download ZIP.
//
// Scope: KETUA_LPPM / STAFF_LPPM / ADMIN_SISTEM → semua kelompok;
// DOSEN (DPL) → hanya kelompok bimbingannya (dipaksa server-side).
// =============================================

import ExcelJS from "exceljs";
import { prisma } from "../../prisma";
import { KkmPeriodStatus, KkmKelompokDocumentType } from "../../generated/prisma/enums";
import { HttpError } from "../../common/errors/http-error";
import { ROLES } from "../../auth/role";
import { supabase } from "../../config/storage";
import {
  JENIS_LAPORAN,
  JENIS_LABEL,
  STATUS_LABEL,
  deadlineOf,
  deadlineNoteFor,
  deriveStatusLaporan,
  type JenisLaporan,
  type StatusLaporan,
} from "./kkm-laporan.shared";
import type {
  KkmLaporanBulkInput,
  KkmLaporanQuery,
  KkmLaporanReviewInput,
} from "./kkm-laporan.validation";

const BUCKET = "lppm_documents";
const PER_PAGE = 10;
const ZIP_MAX_FILES = 300;

const fileUrlOf = (filePath: string): string =>
  supabase.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;

const sanitizeName = (name: string): string =>
  name.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, " ").trim();

export type Viewer = { userId: number; role: string };

export type StatusLaporanCounts = Record<StatusLaporan, number>;

export type LaporanRow = {
  id: string; // `${kelompok_id}:${jenis}` — key unik di FE (bukan id DB)
  kelompok_id: number;
  kelompok: string;
  desa: string;
  kecamatan: string;
  dpl: { id: number | null; nama: string | null };
  jenis: JenisLaporan;
  jenis_label: string;
  status: StatusLaporan;
  status_label: string;
  upload_date: string | null;
  deadline: string | null;
  deadline_tampil: string | null;
  deadline_note: { text: string; type: "warning" | "danger" } | null;
  file: {
    nama: string;
    url: string;
    ukuran: number | null;
    diunggah_pada: string;
    diunggah_oleh: string;
  } | null;
  catatan_revisi: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type LaporanListResult = {
  periode: {
    id: number;
    nama_periode: string;
    tahun_akademik: string;
    status: KkmPeriodStatus;
  } | null;
  periode_options: Array<{
    id: number;
    nama_periode: string;
    status: KkmPeriodStatus;
  }>;
  data: LaporanRow[];
  meta: { totalData: number; totalPages: number; currentPage: number; limit: number };
  stats: StatusLaporanCounts & { total: number };
  progress_desa: Array<{ desa: string; total: number; terupload: number; persentase: number }>;
  filters: { desa: string[]; dpl: Array<{ id: number; nama: string }> };
};

const EMPTY_STATS: StatusLaporanCounts = {
  BELUM_UPLOAD: 0,
  MENUNGGU_REVIEW: 0,
  DISETUJUI: 0,
  REVISI: 0,
  TERLAMBAT: 0,
};

// =============================================
// Resolusi periode (sama dgn monitoring & dashboard KKM)
// =============================================

const resolvePeriode = async (periodeId?: number) => {
  if (periodeId !== undefined) {
    const periode = await prisma.kkmPeriod.findUnique({ where: { id: periodeId } });
    if (!periode) throw new HttpError(`Periode KKM dengan ID ${periodeId} tidak ditemukan.`, 404);
    return periode;
  }
  return prisma.kkmPeriod.findFirst({
    where: { status: KkmPeriodStatus.AKTIF },
    orderBy: { created_at: "desc" },
  });
};

// =============================================
// Scope & otorisasi
// =============================================

const scopeKelompokWhere = (viewer: Viewer) =>
  viewer.role === ROLES.DOSEN ? { dpl_id: viewer.userId } : {};

/** Review hanya: admin LPPM (Ketua/Staff/Admin Sistem) atau DPL kelompok tsb. */
const assertBolehReview = (viewer: Viewer, dplId: number | null): void => {
  if (viewer.role === ROLES.DOSEN) {
    if (dplId !== viewer.userId) {
      throw new HttpError("Hanya DPL kelompok tersebut yang bisa me-review laporannya.", 403);
    }
    return;
  }
  const isAdmin =
    viewer.role === ROLES.KETUA_LPPM ||
    viewer.role === ROLES.STAFF_LPPM ||
    viewer.role === ROLES.ADMIN_SISTEM;
  if (!isAdmin) {
    throw new HttpError("Hanya Ketua LPPM, Staff LPPM, atau DPL yang bisa me-review laporan.", 403);
  }
};

// =============================================
// Bangun baris (kelompok × jenis laporan)
// =============================================

type KelompokDokumen = {
  id: number;
  nama: string;
  dpl_id: number | null;
  lokasi: { desa: string; kecamatan: string };
  dpl: { id: number; name: string } | null;
  documents: Array<{
    document_type: KkmKelompokDocumentType;
    file_path: string;
    file_size: number | null;
    uploaded_at: Date;
    status_review: string;
    catatan_revisi: string | null;
    reviewed_at: Date | null;
    uploader: { name: string };
    reviewer: { name: string } | null;
  }>;
};

const selectKelompokDokumen = {
  id: true,
  nama: true,
  dpl_id: true,
  lokasi: { select: { desa: true, kecamatan: true } },
  dpl: { select: { id: true, name: true } },
  documents: {
    where: { document_type: { in: JENIS_LAPORAN as unknown as KkmKelompokDocumentType[] } },
    select: {
      document_type: true,
      file_path: true,
      file_size: true,
      uploaded_at: true,
      status_review: true,
      catatan_revisi: true,
      reviewed_at: true,
      uploader: { select: { name: true } },
      reviewer: { select: { name: true } },
    },
  },
} as const;

const buildRow = (
  periode: {
    tgl_penarikan?: Date | null;
    tgl_pelaksanaan?: Date | null;
    deadline_laporan?: Date | null;
    jam_laporan_kelompok?: string | null;
    deadline_laporan_awal?: Date | null;
    jam_laporan_awal?: string | null;
    deadline_laporan_mingguan?: Date | null;
    jam_laporan_mingguan?: string | null;
  },
  k: KelompokDokumen,
  jenis: JenisLaporan,
  now: number,
): LaporanRow => {
  const doc = k.documents.find((d) => d.document_type === jenis) ?? null;
  const deadline = deadlineOf(periode, jenis);
  const status = deriveStatusLaporan(doc, deadline, now);

  return {
    id: `${k.id}:${jenis}`,
    kelompok_id: k.id,
    kelompok: k.nama,
    desa: k.lokasi.desa,
    kecamatan: k.lokasi.kecamatan,
    dpl: { id: k.dpl?.id ?? null, nama: k.dpl?.name ?? null },
    jenis,
    jenis_label: JENIS_LABEL[jenis],
    status,
    status_label: STATUS_LABEL[status],
    upload_date: doc ? doc.uploaded_at.toISOString() : null,
    deadline: deadline ? deadline.toISOString() : null,
    deadline_tampil: deadline
      ? deadline.toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null,
    deadline_note: deadlineNoteFor(Boolean(doc), deadline, now),
    file: doc
      ? {
          nama: doc.file_path.split("/").pop() ?? doc.file_path,
          url: fileUrlOf(doc.file_path),
          ukuran: doc.file_size,
          diunggah_pada: doc.uploaded_at.toISOString(),
          diunggah_oleh: doc.uploader.name,
        }
      : null,
    catatan_revisi: doc?.catatan_revisi ?? null,
    reviewed_at: doc?.reviewed_at ? doc.reviewed_at.toISOString() : null,
    reviewed_by: doc?.reviewer?.name ?? null,
  };
};

const buildRows = (
  periode: Parameters<typeof buildRow>[0],
  kelompoks: KelompokDokumen[],
): LaporanRow[] => {
  const now = Date.now();
  const rows: LaporanRow[] = [];
  for (const k of kelompoks) {
    for (const jenis of JENIS_LAPORAN) rows.push(buildRow(periode, k, jenis, now));
  }
  return rows;
};

// =============================================
// Filter
// =============================================

const applyFilters = (rows: LaporanRow[], query: KkmLaporanQuery): LaporanRow[] => {
  let out = rows;
  if (query.status) out = out.filter((r) => r.status === query.status);
  if (query.jenis) out = out.filter((r) => r.jenis === query.jenis);
  if (query.desa) out = out.filter((r) => r.desa === query.desa);
  if (query.dpl_id) out = out.filter((r) => r.dpl.id === query.dpl_id);
  if (query.search) {
    const q = query.search.toLowerCase();
    out = out.filter(
      (r) =>
        r.kelompok.toLowerCase().includes(q) ||
        r.desa.toLowerCase().includes(q) ||
        (r.dpl.nama ?? "").toLowerCase().includes(q) ||
        r.jenis_label.toLowerCase().includes(q) ||
        (r.file?.nama.toLowerCase().includes(q) ?? false),
    );
  }
  return out;
};

/** Kumpulkan seluruh baris periode dalam scope viewer (tanpa filter). */
const collectAllRows = async (viewer: Viewer, periodeId?: number) => {
  const periode = await resolvePeriode(periodeId);
  if (!periode) return { periode: null, allRows: [] as LaporanRow[] };

  const kelompoks = await prisma.kkmKelompok.findMany({
    where: { periode_id: periode.id, ...scopeKelompokWhere(viewer) },
    orderBy: { nama: "asc" },
    select: selectKelompokDokumen,
  });

  return { periode, allRows: buildRows(periode, kelompoks as KelompokDokumen[]) };
};

// =============================================
// GET /kkm/laporan — daftar + stats + opsi filter
// =============================================

export const getLaporanList = async (
  viewer: Viewer,
  query: KkmLaporanQuery,
): Promise<LaporanListResult> => {
  const { periode, allRows } = await collectAllRows(viewer, query.periode_id);

  const periodeOptions = await prisma.kkmPeriod.findMany({
    orderBy: [{ tahun: "desc" }, { created_at: "desc" }],
    select: { id: true, nama_periode: true, status: true },
  });

  if (!periode) {
    return {
      periode: null,
      periode_options: periodeOptions,
      data: [],
      meta: { totalData: 0, totalPages: 1, currentPage: query.page ?? 1, limit: PER_PAGE },
      stats: { ...EMPTY_STATS, total: 0 },
      progress_desa: [],
      filters: { desa: [], dpl: [] },
    };
  }

  // Stats, progress per desa & opsi filter dari SELURUH baris scope
  // (sebelum filter tab/search — konsisten dengan halaman monitoring).
  const stats: StatusLaporanCounts = { ...EMPTY_STATS };
  for (const r of allRows) stats[r.status] += 1;

  const desaMap = new Map<string, { total: number; terupload: number }>();
  const dplMap = new Map<number, string>();
  for (const r of allRows) {
    const cur = desaMap.get(r.desa) ?? { total: 0, terupload: 0 };
    cur.total += 1;
    if (r.status !== "BELUM_UPLOAD" && r.status !== "TERLAMBAT") cur.terupload += 1;
    desaMap.set(r.desa, cur);
    if (r.dpl.id != null) dplMap.set(r.dpl.id, r.dpl.nama ?? "");
  }

  const progressDesa = [...desaMap.entries()]
    .map(([desa, v]) => ({
      desa,
      total: v.total,
      terupload: v.terupload,
      persentase: v.total > 0 ? Math.round((v.terupload / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.persentase - a.persentase || a.desa.localeCompare(b.desa));

  const filtered = applyFilters(allRows, query);
  const page = query.page ?? 1;
  const totalData = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalData / PER_PAGE));
  const safePage = Math.min(page, totalPages);

  return {
    periode: {
      id: periode.id,
      nama_periode: periode.nama_periode,
      tahun_akademik: periode.tahun_akademik,
      status: periode.status,
    },
    periode_options: periodeOptions,
    data: filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE),
    meta: { totalData, totalPages, currentPage: safePage, limit: PER_PAGE },
    stats: { ...stats, total: allRows.length },
    progress_desa: progressDesa,
    filters: {
      desa: [...desaMap.keys()].sort((a, b) => a.localeCompare(b)),
      dpl: [...dplMap.entries()]
        .map(([id, nama]) => ({ id, nama }))
        .sort((a, b) => a.nama.localeCompare(b.nama)),
    },
  };
};

// =============================================
// GET /kkm/laporan/detail — satu baris (kelompok × jenis)
// =============================================

export const getLaporanDetail = async (
  viewer: Viewer,
  kelompokId: number,
  jenis: JenisLaporan,
): Promise<LaporanRow> => {
  const kelompok = await prisma.kkmKelompok.findUnique({
    where: { id: kelompokId },
    select: {
      ...selectKelompokDokumen,
      periode: {
        select: {
          tgl_penarikan: true,
          tgl_pelaksanaan: true,
          deadline_laporan: true,
          jam_laporan_kelompok: true,
          deadline_laporan_awal: true,
          jam_laporan_awal: true,
          deadline_laporan_mingguan: true,
          jam_laporan_mingguan: true,
        },
      },
    },
  });
  if (!kelompok) throw new HttpError("Kelompok KKM tidak ditemukan.", 404);
  if (viewer.role === ROLES.DOSEN && kelompok.dpl_id !== viewer.userId) {
    throw new HttpError("Kelompok ini bukan bimbingan Anda.", 403);
  }

  return buildRow(kelompok.periode, kelompok as KelompokDokumen, jenis, Date.now());
};

// =============================================
// PATCH /kkm/laporan/review — setujui / revisi
// =============================================

export const reviewLaporan = async (viewer: Viewer, input: KkmLaporanReviewInput) => {
  const kelompok = await prisma.kkmKelompok.findUnique({
    where: { id: input.kelompok_id },
    select: { id: true, nama: true, dpl_id: true },
  });
  if (!kelompok) throw new HttpError("Kelompok KKM tidak ditemukan.", 404);
  assertBolehReview(viewer, kelompok.dpl_id);

  const doc = await prisma.kkmKelompokDocument.findUnique({
    where: {
      kelompok_id_document_type: {
        kelompok_id: input.kelompok_id,
        document_type: input.jenis,
      },
    },
    select: { id: true },
  });
  if (!doc) {
    throw new HttpError(`Belum ada file ${JENIS_LABEL[input.jenis]} untuk kelompok ini.`, 404);
  }

  const updated = await prisma.kkmKelompokDocument.update({
    where: { id: doc.id },
    data: {
      status_review: input.status,
      catatan_revisi: input.status === "REVISI" ? (input.catatan ?? null) : null,
      reviewed_by: viewer.userId,
      reviewed_at: new Date(),
    },
    select: {
      kelompok_id: true,
      document_type: true,
      status_review: true,
      catatan_revisi: true,
      reviewed_at: true,
    },
  });

  const status = updated.status_review as StatusLaporan;
  return {
    kelompok_id: updated.kelompok_id,
    jenis: updated.document_type as JenisLaporan,
    status,
    status_label: STATUS_LABEL[status],
    catatan_revisi: updated.catatan_revisi,
    reviewed_at: updated.reviewed_at?.toISOString() ?? null,
  };
};

// =============================================
// POST /kkm/laporan/bulk-approve — setujui massal
// =============================================

export const bulkApproveLaporan = async (viewer: Viewer, input: KkmLaporanBulkInput) => {
  // Dedup baris (kelompok_id + jenis)
  const unique = new Map<string, { kelompok_id: number; jenis: JenisLaporan }>();
  for (const item of input.items) {
    unique.set(`${item.kelompok_id}:${item.jenis}`, {
      kelompok_id: item.kelompok_id,
      jenis: item.jenis as JenisLaporan,
    });
  }
  const items = [...unique.values()];
  if (items.length === 0) {
    throw new HttpError("Tidak ada laporan valid untuk disetujui.", 400);
  }

  // Otorisasi per kelompok (scope DPL ditegakkan server-side).
  const kelompokIds = [...new Set(items.map((i) => i.kelompok_id))];
  const kelompoks = await prisma.kkmKelompok.findMany({
    where: { id: { in: kelompokIds } },
    select: { id: true, dpl_id: true },
  });
  if (kelompoks.length !== kelompokIds.length) {
    throw new HttpError("Ada kelompok yang tidak ditemukan.", 404);
  }
  for (const k of kelompoks) assertBolehReview(viewer, k.dpl_id);

  // Hanya baris berstatus MENUNGGU_REVIEW yang berpindah ke DISETUJUI.
  let disetujui = 0;
  const byJenis = new Map<JenisLaporan, number[]>();
  for (const item of items) {
    const ids = byJenis.get(item.jenis) ?? [];
    ids.push(item.kelompok_id);
    byJenis.set(item.jenis, ids);
  }
  for (const [jenis, ids] of byJenis) {
    const result = await prisma.kkmKelompokDocument.updateMany({
      where: {
        kelompok_id: { in: ids },
        document_type: jenis,
        status_review: "MENUNGGU_REVIEW",
      },
      data: {
        status_review: "DISETUJUI",
        catatan_revisi: null,
        reviewed_by: viewer.userId,
        reviewed_at: new Date(),
      },
    });
    disetujui += result.count;
  }

  return { disetujui, dilewati: items.length - disetujui };
};

// =============================================
// Export Excel & himpunan file ZIP
// =============================================

/** Baris terfilter (tanpa pagination) untuk export. */
export const collectExportRows = async (
  viewer: Viewer,
  query: KkmLaporanQuery,
): Promise<LaporanRow[]> => {
  const { allRows } = await collectAllRows(viewer, query.periode_id);
  return applyFilters(allRows, query);
};

export const buildLaporanExcel = async (
  viewer: Viewer,
  query: KkmLaporanQuery,
): Promise<Buffer> => {
  const rows = await collectExportRows(viewer, query);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Laporan KKM");

  worksheet.columns = [
    { header: "Kelompok", key: "kelompok", width: 16 },
    { header: "Desa", key: "desa", width: 18 },
    { header: "Kecamatan", key: "kecamatan", width: 18 },
    { header: "DPL", key: "dpl", width: 24 },
    { header: "Jenis Laporan", key: "jenis", width: 18 },
    { header: "Status", key: "status", width: 16 },
    { header: "Tanggal Upload", key: "upload", width: 22 },
    { header: "Deadline", key: "deadline", width: 22 },
    { header: "File", key: "file", width: 34 },
    { header: "Catatan Revisi", key: "catatan", width: 40 },
    { header: "Reviewer", key: "reviewer", width: 22 },
    { header: "Tanggal Review", key: "reviewed", width: 22 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: "middle" };

  const fmt = (iso: string | null): string =>
    iso ? new Date(iso).toLocaleString("id-ID") : "-";

  for (const row of rows) {
    worksheet.addRow({
      kelompok: row.kelompok,
      desa: row.desa,
      kecamatan: row.kecamatan,
      dpl: row.dpl.nama ?? "-",
      jenis: row.jenis_label,
      status: row.status_label,
      upload: fmt(row.upload_date),
      deadline: row.deadline_tampil ?? "-",
      file: row.file?.nama ?? "Belum upload",
      catatan: row.catatan_revisi ?? "-",
      reviewer: row.reviewed_by ?? "-",
      reviewed: fmt(row.reviewed_at),
    });
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
};

export type ZipEntry = { name: string; url: string };

/** Himpunan file (maks ZIP_MAX_FILES) untuk download ZIP — ikut filter aktif. */
export const collectZipEntries = async (
  viewer: Viewer,
  query: KkmLaporanQuery,
): Promise<ZipEntry[]> => {
  const rows = await collectExportRows(viewer, query);
  const used = new Set<string>();
  const entries: ZipEntry[] = [];

  for (const row of rows) {
    if (!row.file) continue;
    if (entries.length >= ZIP_MAX_FILES) break;

    const base = `${sanitizeName(row.desa)}/${sanitizeName(row.kelompok)}/${row.jenis_label} - ${sanitizeName(row.file.nama)}`;
    let name = base;
    let n = 1;
    while (used.has(name)) {
      name = base.replace(/(\.[^.]+)?$/, ` (${n})$1`);
      n += 1;
    }
    used.add(name);
    entries.push({ name, url: row.file.url });
  }

  return entries;
};

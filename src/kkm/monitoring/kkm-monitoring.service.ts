import { prisma } from "../../prisma";
import { KkmPeriodStatus } from "../../generated/prisma/enums";
import { HttpError } from "../../common/errors/http-error";
import { supabase } from "../../config/storage";
import type { KkmPeriodeRef } from "../../dashboard/dashboard.types";
import type {
  KkmLogbookCreateInput,
  KkmLogbookReviewInput,
  KkmMonitoringMarkInput,
  KkmMonitoringQuery,
} from "./kkm-monitoring.validation";
import type {
  MonitoringFilterOptions,
  MonitoringIndikator,
  MonitoringResult,
  MonitoringRow,
  MonitoringStats,
  MonitoringStatus,
  MonitoringTahapan,
} from "./kkm-monitoring.types";

const PER_PAGE = 12;

// Threshold turunan (bukan kolom DB) — bisa disetel di sini saja.
const LOGBOOK_MIN_ENTRI = 5; // jumlah entri < ini → indikator LOGBOOK_KURANG
const AKTIVITAS_JENDELA_HARI = 7; // jendela delta & "aktivitas terbaru" (mingguan)

// Label Indonesia untuk enum (dipakai respons agar FE tinggal render)
const STATUS_LABEL: Record<MonitoringStatus, string> = {
  AKTIF: "Aktif",
  PERLU_PERHATIAN: "Perlu Perhatian",
  BERMASALAH: "Bermasalah",
  SELESAI: "Selesai",
};

const INDIKATOR_LABEL: Record<MonitoringIndikator, string> = {
  NORMAL: "Normal",
  DPL_BELUM_MONITORING: "DPL Blm. Monitoring",
  TIDAK_ADA_AKTIVITAS: "Tidak Ada Aktivitas",
  LOGBOOK_KURANG: "Logbook Kurang",
};

const TAHAPAN_LABEL: Record<MonitoringTahapan, string> = {
  MONITORING_DPL: "Monitoring DPL",
  PROGRAM_KERJA: "Program Kerja",
  LOGBOOK_AKTIF: "Logbook Aktif",
  LAPORAN_AKHIR: "Laporan Akhir",
  SELESAI: "Selesai",
};

// =============================================
// Resolusi periode (sama dgn Dashboard KKM)
// =============================================

const resolvePeriode = async (periodeId?: number) => {
  if (periodeId !== undefined) {
    const periode = await prisma.kkmPeriod.findUnique({
      where: { id: periodeId },
    });
    if (!periode) {
      throw new HttpError(`Periode KKM dengan ID ${periodeId} tidak ditemukan.`, 404);
    }
    return periode;
  }
  return prisma.kkmPeriod.findFirst({
    where: { status: KkmPeriodStatus.AKTIF },
    orderBy: { created_at: "desc" },
  });
};

const toPeriodeRef = (periode: {
  id: number;
  nama_periode: string;
  tahun_akademik: string;
  status: KkmPeriodStatus;
}): KkmPeriodeRef => ({
  id: periode.id,
  nama_periode: periode.nama_periode,
  tahun_akademik: periode.tahun_akademik,
  status: periode.status,
});

// =============================================
// Helper turunan
// =============================================

const dayMs = 24 * 60 * 60 * 1000;

/** "3 hari lalu" / "Belum pernah" — humanized dari timestamp DPL. */
const humanizeSince = (date: Date | null): string | null => {
  if (!date) return null;
  const diffMs = Date.now() - date.getTime();
  const hari = Math.floor(diffMs / dayMs);
  if (hari <= 0) return "Hari ini";
  if (hari === 1) return "Kemarin";
  return `${hari} hari lalu`;
};

type DeriveInput = {
  hasProgramKerja: boolean;
  hasLogbookDoc: boolean;
  hasLaporanAkhir: boolean;
  jumlahEntri: number;
  entriBaru: number; // entri N hari terakhir
  entriSebelumnya: number; // entri N hari sebelumnya (untuk delta)
  lastMonitoredAt: Date | null;
};

type DeriveOutput = {
  progress: number;
  tahapan: MonitoringTahapan;
  indikator: MonitoringIndikator;
  status: MonitoringStatus;
  delta: number;
};

/**
 * Turunan monitoring per kelompok:
 * - Progress : dokumen (Program Kerja 40 / Logbook 30 / Laporan Akhir 30) + bonus aktivitas logbook (max 10), cap 100.
 * - Tahapan  : dokumen tertinggi yang sudah diupload (SELESAI jika progress 100).
 * - Indikator: prioritas TIDAK_ADA_AKTIVITAS > DPL_BELUM_MONITORING > LOGBOOK_KURANG > NORMAL.
 * - Status   : SELESAI (progress 100) > BERMASALAH (tak ada entri) > PERLU_PERHATIAN (DPL blm / logbook kurang) > AKTIF.
 * - Delta    : entri 7 hari terakhir − entri 7 hari sebelumnya.
 */
const deriveMonitoring = (input: DeriveInput): DeriveOutput => {
  let progress = 0;
  if (input.hasProgramKerja) progress += 40;
  if (input.hasLogbookDoc) progress += 30;
  if (input.hasLaporanAkhir) progress += 30;
  // Bonus aktivitas logbook (max +10) — tidak berlaku bila sudah lengkap.
  if (!input.hasLaporanAkhir) progress = Math.min(100, progress + Math.min(10, input.jumlahEntri));
  else progress = Math.min(100, progress);

  const selesai = progress >= 100;

  const tahapan: MonitoringTahapan = selesai
    ? "SELESAI"
    : input.hasLaporanAkhir
      ? "LAPORAN_AKHIR"
      : input.hasLogbookDoc
        ? "LOGBOOK_AKTIF"
        : input.hasProgramKerja
          ? "PROGRAM_KERJA"
          : "MONITORING_DPL";

  let indikator: MonitoringIndikator = "NORMAL";
  if (selesai) {
    indikator = "NORMAL";
  } else if (input.jumlahEntri === 0) {
    indikator = "TIDAK_ADA_AKTIVITAS";
  } else if (input.lastMonitoredAt == null) {
    indikator = "DPL_BELUM_MONITORING";
  } else if (input.jumlahEntri < LOGBOOK_MIN_ENTRI) {
    indikator = "LOGBOOK_KURANG";
  }

  let status: MonitoringStatus;
  if (selesai) status = "SELESAI";
  else if (indikator === "TIDAK_ADA_AKTIVITAS") status = "BERMASALAH";
  else if (indikator === "DPL_BELUM_MONITORING" || indikator === "LOGBOOK_KURANG")
    status = "PERLU_PERHATIAN";
  else status = "AKTIF";

  return { progress, tahapan, indikator, status, delta: input.entriBaru - input.entriSebelumnya };
};

export type KelompokMonitoring = {
  progress: number;
  tahapan: MonitoringTahapan;
  tahapan_label: string;
  indikator: MonitoringIndikator;
  indikator_label: string;
  status: MonitoringStatus;
  status_label: string;
  logbook: { jumlah: number; delta: number };
};

/**
 * Turunan monitoring untuk SATU kelompok — dipakai halaman detail
 * (`GET /kkm/kelompok/:id`) agar FE cukup satu panggilan untuk
 * progress %, tahapan, dan indikator kelompok.
 */
export const deriveMonitoringForKelompok = async (kelompok: {
  id: number;
  last_monitored_at: Date | null;
  document_types: string[];
}): Promise<KelompokMonitoring> => {
  const now = Date.now();
  const sinceBaru = new Date(now - AKTIVITAS_JENDELA_HARI * dayMs);
  const sinceSebelum = new Date(now - 2 * AKTIVITAS_JENDELA_HARI * dayMs);

  const entries = await prisma.kkmLogbookEntry.findMany({
    where: { kelompok_id: kelompok.id },
    select: { created_at: true },
  });

  let total = 0;
  let baru = 0;
  let sebelum = 0;
  for (const entry of entries) {
    total += 1;
    if (entry.created_at >= sinceBaru) baru += 1;
    else if (entry.created_at >= sinceSebelum) sebelum += 1;
  }

  const derived = deriveMonitoring({
    hasProgramKerja: kelompok.document_types.includes("PROPOSAL_PROGRAM_KERJA"),
    hasLogbookDoc: kelompok.document_types.includes("LOGBOOK_KELOMPOK"),
    hasLaporanAkhir: kelompok.document_types.includes("LAPORAN_AKHIR"),
    jumlahEntri: total,
    entriBaru: baru,
    entriSebelumnya: sebelum,
    lastMonitoredAt: kelompok.last_monitored_at,
  });

  return {
    progress: derived.progress,
    tahapan: derived.tahapan,
    tahapan_label: TAHAPAN_LABEL[derived.tahapan],
    indikator: derived.indikator,
    indikator_label: INDIKATOR_LABEL[derived.indikator],
    status: derived.status,
    status_label: STATUS_LABEL[derived.status],
    logbook: { jumlah: total, delta: derived.delta },
  };
};

// =============================================
// List monitoring (list + stats + opsi filter)
// =============================================

export const getMonitoringList = async (query: KkmMonitoringQuery): Promise<MonitoringResult> => {
  const periode = await resolvePeriode(query.periode_id);

  // Belum ada periode (aktif) → respons ter-null dgn angka 0, bukan error.
  if (!periode) {
    return {
      periode: null,
      data: [],
      meta: { totalData: 0, totalPages: 1, currentPage: query.page ?? 1, limit: PER_PAGE },
      stats: {
        total_kelompok: 0,
        kelompok_aktif: 0,
        perlu_perhatian: 0,
        bermasalah: 0,
        selesai: 0,
        rata_rata_progress: 0,
      },
      filters: { desa: [], dpl: [] },
    };
  }

  const periodeRef = toPeriodeRef(periode);

  // Ambil semua kelompok periode beserta relasi yang dibutuhkan turunan.
  const kelompoks = await prisma.kkmKelompok.findMany({
    where: { periode_id: periode.id },
    orderBy: { nama: "asc" },
    select: {
      id: true,
      nama: true,
      last_monitored_at: true,
      lokasi: { select: { desa: true, kecamatan: true, kabupaten: true } },
      dpl: { select: { id: true, name: true } },
      peserta: { select: { user_id: true } },
      documents: { select: { document_type: true } },
    },
  });

  // Semua entri logbook periode ini sekali ambil (hindari N+1), lalu group by kelompok.
  const entries = await prisma.kkmLogbookEntry.findMany({
    where: { kelompok: { periode_id: periode.id } },
    select: { kelompok_id: true, created_at: true },
  });

  const now = Date.now();
  const sinceBaru = new Date(now - AKTIVITAS_JENDELA_HARI * dayMs);
  const sinceSebelum = new Date(now - 2 * AKTIVITAS_JENDELA_HARI * dayMs);

  // Group entri per kelompok + hitung jendela mingguan.
  const entriPerKelompok = new Map<number, { total: number; baru: number; sebelum: number }>();
  for (const e of entries) {
    const cur = entriPerKelompok.get(e.kelompok_id) ?? { total: 0, baru: 0, sebelum: 0 };
    cur.total += 1;
    if (e.created_at >= sinceBaru) cur.baru += 1;
    else if (e.created_at >= sinceSebelum) cur.sebelum += 1;
    entriPerKelompok.set(e.kelompok_id, cur);
  }

  const buildRow = (k: (typeof kelompoks)[number]): MonitoringRow => {
    const docs = k.documents.map((d) => d.document_type);
    const counts = entriPerKelompok.get(k.id) ?? { total: 0, baru: 0, sebelum: 0 };

    const derived = deriveMonitoring({
      hasProgramKerja: docs.includes("PROPOSAL_PROGRAM_KERJA"),
      hasLogbookDoc: docs.includes("LOGBOOK_KELOMPOK"),
      hasLaporanAkhir: docs.includes("LAPORAN_AKHIR"),
      jumlahEntri: counts.total,
      entriBaru: counts.baru,
      entriSebelumnya: counts.sebelum,
      lastMonitoredAt: k.last_monitored_at,
    });

    return {
      id: k.id,
      nama: k.nama,
      jumlah_anggota: k.peserta.length,
      desa: k.lokasi.desa,
      kecamatan: k.lokasi.kecamatan,
      kabupaten: k.lokasi.kabupaten,
      dpl: {
        id: k.dpl?.id ?? null,
        nama: k.dpl?.name ?? null,
        last_monitored_at: k.last_monitored_at ? k.last_monitored_at.toISOString() : null,
        terakhir: humanizeSince(k.last_monitored_at),
      },
      logbook: { jumlah: counts.total, delta: derived.delta },
      tahapan: derived.tahapan,
      tahapan_label: TAHAPAN_LABEL[derived.tahapan],
      progress: derived.progress,
      indikator: derived.indikator,
      indikator_label: INDIKATOR_LABEL[derived.indikator],
      status: derived.status,
      status_label: STATUS_LABEL[derived.status],
    };
  };

  const allRows = kelompoks.map(buildRow);

  // Stats dihitung dari SELURUH kelompok periode (sebelum filter status/search).
  const stats: MonitoringStats = {
    total_kelompok: allRows.length,
    kelompok_aktif: allRows.filter((r) => r.status === "AKTIF").length,
    perlu_perhatian: allRows.filter((r) => r.status === "PERLU_PERHATIAN").length,
    bermasalah: allRows.filter((r) => r.status === "BERMASALAH").length,
    selesai: allRows.filter((r) => r.status === "SELESAI").length,
    rata_rata_progress:
      allRows.length > 0
        ? Math.round(allRows.reduce((sum, r) => sum + r.progress, 0) / allRows.length)
        : 0,
  };

  // Opsi filter (dari seluruh kelompok, agar tidak berubah halaman).
  const filters: MonitoringFilterOptions = {
    desa: [...new Set(allRows.map((r) => r.desa))].sort((a, b) => a.localeCompare(b)),
    dpl: [
      ...new Map(
        allRows
          .filter((r) => r.dpl.id != null)
          .map((r) => [r.dpl.id as number, { id: r.dpl.id as number, nama: r.dpl.nama ?? "" }]),
      ).values(),
    ].sort((a, b) => a.nama.localeCompare(b.nama)),
  };

  // Filter turunan & teks (status dihitung jadi in-memory).
  const search = query.search?.toLowerCase();
  const filtered = allRows.filter((r) => {
    if (query.status && r.status !== query.status) return false;
    if (query.desa && r.desa.toLowerCase() !== query.desa.toLowerCase()) return false;
    if (query.dpl_id && r.dpl.id !== query.dpl_id) return false;
    if (search) {
      const haystack = [r.nama, r.desa, r.kecamatan, r.dpl.nama ?? ""].join(" ").toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  const page = query.page ?? 1;
  const start = (page - 1) * PER_PAGE;
  const data = filtered.slice(start, start + PER_PAGE);

  return {
    periode: periodeRef,
    data,
    meta: {
      totalData: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / PER_PAGE)),
      currentPage: page,
      limit: PER_PAGE,
    },
    stats,
    filters,
  };
};

// =============================================
// Logbook entries (daftar + tambah + review + "logbook saya")
// =============================================

const LOGBOOK_BUCKET = "lppm_documents";
const LOGBOOK_MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB (PDF)

const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

const fileUrlOf = (filePath: string | null): string | null =>
  filePath ? supabase.storage.from(LOGBOOK_BUCKET).getPublicUrl(filePath).data.publicUrl : null;

const assertMembership = async (kelompokId: number, userId: number, role: string) => {
  const kelompok = await prisma.kkmKelompok.findUnique({
    where: { id: kelompokId },
    select: {
      id: true,
      dpl_id: true,
      periode: { select: { status: true } },
      peserta: { select: { user_id: true, status: true } },
    },
  });
  if (!kelompok) throw new HttpError("Kelompok KKM tidak ditemukan.", 404);
  if (kelompok.periode.status === KkmPeriodStatus.SELESAI) {
    throw new HttpError("Periode sudah SELESAI, tidak bisa menulis logbook.", 400);
  }

  if (role === "MAHASISWA") {
    const isMember = kelompok.peserta.some((p) => p.user_id === userId);
    if (!isMember) {
      throw new HttpError("Anda bukan anggota kelompok ini.", 403);
    }
    return;
  }

  if (role === "DOSEN") {
    if (kelompok.dpl_id !== userId) {
      throw new HttpError("Anda bukan DPL kelompok ini.", 403);
    }
    return;
  }

  throw new HttpError("Hanya mahasiswa anggota atau DPL kelompok yang boleh menulis logbook.", 403);
};

export const getLogbookEntries = async (
  kelompokId: number,
  viewer?: { userId: number; role?: string },
) => {
  const kelompok = await prisma.kkmKelompok.findUnique({
    where: { id: kelompokId },
    select: {
      id: true,
      dpl_id: true,
      peserta: { select: { user_id: true } },
    },
  });
  if (!kelompok) throw new HttpError("Kelompok KKM tidak ditemukan.", 404);

  // Penegakan akses per-kelompok: mahasiswa harus anggota, dosen harus DPL.
  if (viewer) {
    const { userId, role } = viewer;
    if (role === "MAHASISWA" && !kelompok.peserta.some((p) => p.user_id === userId)) {
      throw new HttpError("Anda bukan anggota kelompok ini.", 403);
    }
    if (role === "DOSEN" && kelompok.dpl_id !== userId) {
      throw new HttpError("Anda bukan DPL kelompok ini.", 403);
    }
  }

  const rows = await prisma.kkmLogbookEntry.findMany({
    where: { kelompok_id: kelompokId },
    orderBy: [{ tanggal: "desc" }, { created_at: "desc" }],
    select: {
      id: true,
      tanggal: true,
      judul: true,
      deskripsi: true,
      lokasi_kegiatan: true,
      status: true,
      file_path: true,
      file_size: true,
      catatan_revisi: true,
      created_at: true,
      author: { select: { id: true, name: true, nidn_nip: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    tanggal: r.tanggal.toISOString(),
    judul: r.judul,
    deskripsi: r.deskripsi,
    lokasi_kegiatan: r.lokasi_kegiatan,
    status: r.status,
    file_url: fileUrlOf(r.file_path),
    file_size: r.file_size,
    catatan_revisi: r.catatan_revisi,
    created_at: r.created_at.toISOString(),
    penulis: { id: r.author.id, nama: r.author.name, nim_nip: r.author.nidn_nip },
  }));
};

export const createLogbookEntry = async (
  kelompokId: number,
  input: KkmLogbookCreateInput,
  userId: number,
  role: string,
  file?: Express.Multer.File,
) => {
  await assertMembership(kelompokId, userId, role);

  // File logbook PDF (opsional) — simpan ke Supabase sebelum row dibuat,
  // agar row tidak menunjuk file yang gagal terupload.
  let filePath: string | null = null;
  if (file) {
    if (file.mimetype !== "application/pdf") {
      throw new HttpError("File logbook harus berformat PDF.", 400);
    }
    if (file.size > LOGBOOK_MAX_FILE_BYTES) {
      throw new HttpError("Ukuran file logbook terlalu besar. Maksimal 10 MB.", 400);
    }
    filePath = `kkm-logbook/${kelompokId}/${Date.now()}-${safeFileName(file.originalname)}`;
    const { error: uploadError } = await supabase.storage
      .from(LOGBOOK_BUCKET)
      .upload(filePath, file.buffer, { contentType: file.mimetype, cacheControl: "3600" });
    if (uploadError) {
      throw new HttpError(`Gagal upload ke Supabase: ${uploadError.message}`, 500);
    }
  }

  const created = await prisma.kkmLogbookEntry.create({
    data: {
      kelompok_id: kelompokId,
      user_id: userId,
      tanggal: new Date(input.tanggal),
      judul: input.judul,
      deskripsi: input.deskripsi,
      lokasi_kegiatan: input.lokasi_kegiatan ?? null,
      file_path: filePath,
      file_size: file?.size ?? null,
    },
    select: { id: true, tanggal: true, judul: true, created_at: true, file_path: true, file_size: true },
  });

  return {
    id: created.id,
    tanggal: created.tanggal.toISOString(),
    judul: created.judul,
    created_at: created.created_at.toISOString(),
    file_url: fileUrlOf(created.file_path),
    file_size: created.file_size,
  };
};

/**
 * Review entri logbook (DPL kelompok / admin LPPM): APPROVED atau REVISI.
 * Catatan wajib saat REVISI (sudah divalidasi zod).
 */
export const reviewLogbookEntry = async (
  kelompokId: number,
  entryId: number,
  input: KkmLogbookReviewInput,
  userId: number,
  role: string,
) => {
  const kelompok = await prisma.kkmKelompok.findUnique({
    where: { id: kelompokId },
    select: { id: true, dpl_id: true },
  });
  if (!kelompok) throw new HttpError("Kelompok KKM tidak ditemukan.", 404);

  const isDpl = role === "DOSEN" && kelompok.dpl_id === userId;
  const isAdmin = role === "ADMIN_LPPM" || role === "STAFF_LPPM";
  if (!isDpl && !isAdmin) {
    throw new HttpError("Hanya DPL kelompok atau admin LPPM yang bisa me-review logbook.", 403);
  }

  const entry = await prisma.kkmLogbookEntry.findFirst({
    where: { id: entryId, kelompok_id: kelompokId },
    select: { id: true },
  });
  if (!entry) throw new HttpError("Entri logbook tidak ditemukan.", 404);

  const updated = await prisma.kkmLogbookEntry.update({
    where: { id: entryId },
    data: {
      status: input.status,
      catatan_revisi: input.status === "REVISI" ? input.catatan ?? null : null,
      reviewed_by: userId,
      reviewed_at: new Date(),
    },
    select: { id: true, status: true, catatan_revisi: true, reviewed_at: true },
  });

  return updated;
};

/**
 * "Logbook Saya" — halaman logbook mahasiswa (GET /kkm/logbook/me).
 * Kelompok dari keanggotaan (prioritas periode AKTIF), entri = milik sendiri.
 */
export const getLogbookSaya = async (userId: number) => {
  const findRow = (aktifOnly: boolean) =>
    prisma.kkmPeserta.findFirst({
      where: {
        user_id: userId,
        kelompok_id: { not: null },
        ...(aktifOnly ? { periode: { status: KkmPeriodStatus.AKTIF } } : {}),
      },
      orderBy: { updated_at: "desc" },
      select: { kelompok_id: true },
    });

  const mine = (await findRow(true)) ?? (await findRow(false));
  if (!mine?.kelompok_id) {
    throw new HttpError(
      "Kelompok KKM Anda belum ditetapkan, logbook belum bisa diisi. Hubungi panitia/LPPM.",
      404,
    );
  }

  const kelompok = await prisma.kkmKelompok.findUnique({
    where: { id: mine.kelompok_id },
    select: {
      id: true,
      nama: true,
      periode: { select: { id: true, nama_periode: true, status: true } },
    },
  });
  if (!kelompok) {
    throw new HttpError(
      "Kelompok KKM Anda belum ditetapkan, logbook belum bisa diisi. Hubungi panitia/LPPM.",
      404,
    );
  }

  const rows = await prisma.kkmLogbookEntry.findMany({
    where: { kelompok_id: kelompok.id, user_id: userId },
    orderBy: [{ tanggal: "desc" }, { created_at: "desc" }],
    select: {
      id: true,
      tanggal: true,
      judul: true,
      deskripsi: true,
      lokasi_kegiatan: true,
      status: true,
      file_path: true,
      file_size: true,
      catatan_revisi: true,
      created_at: true,
    },
  });

  const entries = rows.map((r) => ({
    id: r.id,
    tanggal: r.tanggal.toISOString(),
    judul: r.judul,
    deskripsi: r.deskripsi,
    lokasi_kegiatan: r.lokasi_kegiatan,
    status: r.status,
    file_url: fileUrlOf(r.file_path),
    file_size: r.file_size,
    catatan_revisi: r.catatan_revisi,
    created_at: r.created_at.toISOString(),
  }));

  return {
    kelompok: {
      id: kelompok.id,
      nama: kelompok.nama,
      periode: kelompok.periode,
    },
    entries,
  };
};

// =============================================
// Validasi logbook (DPL / admin LPPM)
// =============================================

const VALIDASI_PER_PAGE = 15;

/**
 * Daftar entri logbook untuk halaman "Validasi Logbook" (lintas kelompok).
 * Stats dihitung dari seluruh cakupan (tanpa filter status/search).
 */
export const getLogbookValidasi = async (
  query: { status?: "PENDING" | "APPROVED" | "REVISI"; page?: number; search?: string },
  viewer: { userId: number; role?: string },
) => {
  const whereScope = {
    ...(viewer.role === "DOSEN" ? { kelompok: { dpl_id: viewer.userId } } : {}),
  };

  const [stats, rows] = await Promise.all([
    prisma.kkmLogbookEntry.groupBy({
      by: ["status"],
      where: whereScope,
      _count: { _all: true },
    }),
    prisma.kkmLogbookEntry.findMany({
      where: {
        ...whereScope,
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: [{ created_at: "desc" }],
      select: {
        id: true,
        kelompok_id: true,
        tanggal: true,
        judul: true,
        deskripsi: true,
        status: true,
        catatan_revisi: true,
        file_path: true,
        file_size: true,
        created_at: true,
        author: { select: { id: true, name: true, nidn_nip: true } },
        kelompok: {
          select: { id: true, nama: true, lokasi: { select: { desa: true } } },
        },
      },
    }),
  ]);

  const statsByStatus = { menunggu: 0, approved: 0, revisi: 0 };
  for (const s of stats) {
    if (s.status === "PENDING") statsByStatus.menunggu = s._count._all;
    else if (s.status === "APPROVED") statsByStatus.approved = s._count._all;
    else if (s.status === "REVISI") statsByStatus.revisi = s._count._all;
  }

  // Filter teks (in-memory, konsisten dgn pola monitoring list).
  const search = query.search?.toLowerCase();
  const filtered = rows.filter((r) => {
    if (!search) return true;
    const haystack = [r.author.name, r.judul, r.kelompok.nama, r.kelompok.lokasi.desa]
      .join(" ")
      .toLowerCase();
    return haystack.includes(search);
  });

  const page = query.page ?? 1;
  const start = (page - 1) * VALIDASI_PER_PAGE;
  const data = filtered.slice(start, start + VALIDASI_PER_PAGE).map((r) => ({
    id: r.id,
    kelompok_id: r.kelompok_id,
    kelompok: { nama: r.kelompok.nama, desa: r.kelompok.lokasi.desa },
    mahasiswa: { id: r.author.id, nama: r.author.name, nim: r.author.nidn_nip },
    tanggal: r.tanggal.toISOString(),
    judul: r.judul,
    deskripsi: r.deskripsi,
    status: r.status,
    catatan_revisi: r.catatan_revisi,
    file_url: fileUrlOf(r.file_path),
    file_size: r.file_size,
    created_at: r.created_at.toISOString(),
  }));

  return {
    data,
    stats: statsByStatus,
    meta: {
      totalData: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / VALIDASI_PER_PAGE)),
      currentPage: page,
      limit: VALIDASI_PER_PAGE,
    },
  };
};

/** Detail satu entri logbook utk halaman detail validasi (DPL kelompok / admin). */
export const getLogbookValidasiDetail = async (
  entryId: number,
  viewer: { userId: number; role?: string },
) => {
  const entry = await prisma.kkmLogbookEntry.findUnique({
    where: { id: entryId },
    select: {
      id: true,
      kelompok_id: true,
      tanggal: true,
      judul: true,
      deskripsi: true,
      lokasi_kegiatan: true,
      status: true,
      catatan_revisi: true,
      file_path: true,
      file_size: true,
      reviewed_at: true,
      created_at: true,
      author: { select: { id: true, name: true, nidn_nip: true } },
      reviewer: { select: { id: true, name: true } },
      kelompok: {
        select: {
          id: true,
          nama: true,
          dpl_id: true,
          lokasi: { select: { desa: true, kecamatan: true, kabupaten: true } },
        },
      },
    },
  });
  if (!entry) throw new HttpError("Entri logbook tidak ditemukan.", 404);

  // DPL hanya boleh membaca entri kelompok bimbingannya sendiri.
  if (viewer.role === "DOSEN" && entry.kelompok.dpl_id !== viewer.userId) {
    throw new HttpError("Anda bukan DPL kelompok entri ini.", 403);
  }

  return {
    id: entry.id,
    kelompok_id: entry.kelompok_id,
    kelompok: { nama: entry.kelompok.nama, lokasi: entry.kelompok.lokasi },
    mahasiswa: { id: entry.author.id, nama: entry.author.name, nim: entry.author.nidn_nip },
    tanggal: entry.tanggal.toISOString(),
    judul: entry.judul,
    deskripsi: entry.deskripsi,
    lokasi_kegiatan: entry.lokasi_kegiatan,
    status: entry.status,
    catatan_revisi: entry.catatan_revisi,
    file_url: fileUrlOf(entry.file_path),
    file_size: entry.file_size,
    reviewer: entry.reviewer ? { id: entry.reviewer.id, nama: entry.reviewer.name } : null,
    reviewed_at: entry.reviewed_at?.toISOString() ?? null,
    created_at: entry.created_at.toISOString(),
  };
};

// =============================================
// Monitoring DPL (set last_monitored_at)
// =============================================

export const markMonitored = async (
  kelompokId: number,
  _input: KkmMonitoringMarkInput,
  userId: number,
  role: string,
) => {
  const kelompok = await prisma.kkmKelompok.findUnique({
    where: { id: kelompokId },
    select: { id: true, dpl_id: true, periode: { select: { status: true } } },
  });
  if (!kelompok) throw new HttpError("Kelompok KKM tidak ditemukan.", 404);
  if (kelompok.periode.status === KkmPeriodStatus.SELESAI) {
    throw new HttpError("Periode sudah SELESAI, tidak bisa mencatat monitoring.", 400);
  }

  // Hanya DPL kelompok ini (atau admin/staff untuk uji/demo) yang boleh.
  if (role === "DOSEN" && kelompok.dpl_id !== userId) {
    throw new HttpError("Anda bukan DPL kelompok ini.", 403);
  }

  const now = new Date();
  const updated = await prisma.kkmKelompok.update({
    where: { id: kelompokId },
    data: { last_monitored_at: now },
    select: { id: true, last_monitored_at: true },
  });

  return {
    id: updated.id,
    last_monitored_at: updated.last_monitored_at?.toISOString() ?? null,
    terakhir: humanizeSince(updated.last_monitored_at),
  };
};

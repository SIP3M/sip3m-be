import { prisma } from "../../prisma";
import { KkmPeriodStatus } from "../../generated/prisma/enums";
import { HttpError } from "../../common/errors/http-error";
import { ROLES } from "../../auth/role";
import { supabase } from "../../config/storage";
import { deriveMonitoringForKelompok } from "../monitoring/kkm-monitoring.service";
import type {
  KkmKelompokAddAnggotaInput,
  KkmKelompokDocType,
  KkmKelompokListQuery,
  KkmKelompokUpdateInput,
} from "./kkm-kelompok.validation";

const PER_PAGE = 12;
const BUCKET = "lppm_documents";

export type KelompokStatus = "AKTIF" | "BELUM_LENGKAP" | "BERMASALAH";
export type KelompokKomposisi = "SEIMBANG" | "DOMINASI" | "PERLU_PENYESUAIAN";

// =============================================
// Derived helpers (bukan kolom DB)
// =============================================

/**
 * Status kelompok berdasarkan isi vs kuota desa:
 * - AKTIF        : terisi >= 80% kuota
 * - BELUM_LENGKAP: terisi 50% - <80% kuota
 * - BERMASALAH   : terisi < 50% kuota
 */
export const deriveStatus = (terisi: number, kuota: number): KelompokStatus => {
  if (kuota <= 0) return "BERMASALAH";
  const ratio = terisi / kuota;
  if (ratio >= 0.8) return "AKTIF";
  if (ratio >= 0.5) return "BELUM_LENGKAP";
  return "BERMASALAH";
};

/**
 * Komposisi anggota:
 * - PERLU_PENYESUAIAN: status BERMASALAH atau ada gender null (data belum lengkap)
 * - DOMINASI         : satu gender > 60% atau satu prodi > 50% anggota
 * - SEIMBANG         : selainnya
 */
export const deriveKomposisi = (
  status: KelompokStatus,
  gender: { laki: number; perempuan: number; unknown: number },
  prodiCounts: number[],
  total: number,
): KelompokKomposisi => {
  if (status === "BERMASALAH") return "PERLU_PENYESUAIAN";
  if (gender.unknown > 0) return "PERLU_PENYESUAIAN";
  if (total > 0) {
    if (Math.max(gender.laki, gender.perempuan) / total > 0.6) return "DOMINASI";
    if (prodiCounts.length > 0 && Math.max(...prodiCounts) / total > 0.5) return "DOMINASI";
  }
  return "SEIMBANG";
};

// =============================================
// Aggregate per periode (dipakai stats + list + detail)
// =============================================

type KelompokAggregate = {
  id: number;
  nama: string;
  dpl_id: number | null;
  dpl_name: string | null;
  lokasi: { desa: string; kecamatan: string; kabupaten: string; kuota: number };
  jumlah_anggota: number;
  terverifikasi: number;
  pending: number;
  rejected: number;
  gender: { laki: number; perempuan: number; unknown: number };
  prodi: { nama: string; jumlah: number }[];
  status: KelompokStatus;
  komposisi: KelompokKomposisi;
  persentase_terisi: number;
};

const buildAggregates = async (periode_id: number): Promise<KelompokAggregate[]> => {
  const kelompoks = await prisma.kkmKelompok.findMany({
    where: { periode_id },
    orderBy: { nama: "asc" },
    include: {
      lokasi: { select: { desa: true, kecamatan: true, kabupaten: true, kuota: true } },
      dpl: { select: { id: true, name: true } },
      peserta: {
        select: {
          status: true,
          user: {
            select: {
              jenis_kelamin: true,
              ProgramStudi: { select: { nama: true } },
            },
          },
        },
      },
    },
  });

  return kelompoks.map((k) => {
    const jumlah = k.peserta.length;
    const verified = k.peserta.filter((p) => p.status === "VERIFIED").length;
    const pending = k.peserta.filter((p) => p.status === "PENDING").length;
    const rejected = k.peserta.filter((p) => p.status === "REJECTED").length;

    const gender = { laki: 0, perempuan: 0, unknown: 0 };
    const prodiMap = new Map<string, number>();
    for (const p of k.peserta) {
      const jk = p.user.jenis_kelamin;
      if (jk === "Laki-laki") gender.laki += 1;
      else if (jk === "Perempuan") gender.perempuan += 1;
      else gender.unknown += 1;

      const prodi = p.user.ProgramStudi?.nama ?? "Lainnya";
      prodiMap.set(prodi, (prodiMap.get(prodi) ?? 0) + 1);
    }
    const prodi = [...prodiMap.entries()]
      .map(([nama, jumlah_prodi]) => ({ nama, jumlah: jumlah_prodi }))
      .sort((a, b) => b.jumlah - a.jumlah || a.nama.localeCompare(b.nama));

    const status = deriveStatus(jumlah, k.lokasi.kuota);
    const komposisi = deriveKomposisi(status, gender, prodi.map((p) => p.jumlah), jumlah);

    return {
      id: k.id,
      nama: k.nama,
      dpl_id: k.dpl_id,
      dpl_name: k.dpl?.name ?? null,
      lokasi: k.lokasi,
      jumlah_anggota: jumlah,
      terverifikasi: verified,
      pending,
      rejected,
      gender,
      prodi,
      status,
      komposisi,
      persentase_terisi:
        k.lokasi.kuota > 0 ? Math.round((jumlah / k.lokasi.kuota) * 100) : 0,
    };
  });
};

// =============================================
// Stats (5 kartu)
// =============================================

export const getKelompokStats = async (periode_id: number) => {
  const periode = await prisma.kkmPeriod.findUnique({
    where: { id: periode_id },
    select: { id: true, nama_periode: true, tahun_akademik: true },
  });
  if (!periode) throw new HttpError("Periode KKM tidak ditemukan.", 404);

  const aggregates = await buildAggregates(periode_id);
  const total_mahasiswa = aggregates.reduce((sum, k) => sum + k.jumlah_anggota, 0);

  return {
    periode,
    total_kelompok: aggregates.length,
    aktif: aggregates.filter((k) => k.status === "AKTIF").length,
    belum_lengkap: aggregates.filter((k) => k.status === "BELUM_LENGKAP").length,
    bermasalah: aggregates.filter((k) => k.status === "BERMASALAH").length,
    total_mahasiswa,
  };
};

// =============================================
// List (card list + filter + pagination)
// =============================================

export const getKelompokList = async (query: KkmKelompokListQuery) => {
  const periode = await prisma.kkmPeriod.findUnique({
    where: { id: query.periode_id },
    select: { id: true },
  });
  if (!periode) throw new HttpError("Periode KKM tidak ditemukan.", 404);

  const aggregates = await buildAggregates(query.periode_id);

  // Filter turunan & teks (status/komposisi dihitung, jadi filter in-memory)
  const search = query.search?.toLowerCase();
  const filtered = aggregates.filter((k) => {
    if (query.status && k.status !== query.status) return false;
    if (query.komposisi && k.komposisi !== query.komposisi) return false;
    if (query.desa && k.lokasi.desa.toLowerCase() !== query.desa.toLowerCase()) return false;
    if (query.dpl_id && k.dpl_id !== query.dpl_id) return false;
    if (search) {
      const haystack = [k.nama, k.dpl_name ?? "", k.lokasi.desa, k.lokasi.kecamatan, k.lokasi.kabupaten]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  const page = query.page ?? 1;
  const start = (page - 1) * PER_PAGE;
  const data = filtered.slice(start, start + PER_PAGE);

  return {
    data,
    meta: {
      totalData: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / PER_PAGE)),
      currentPage: page,
      limit: PER_PAGE,
    },
  };
};

// =============================================
// Detail
// =============================================

const deriveProgress = (periode: {
  tgl_pembekalan: Date | null;
  tgl_pelaksanaan: Date | null;
  tgl_penarikan: Date | null;
  deadline_laporan: Date | null;
}) => {
  const now = new Date();
  const isDone = (d: Date | null) => (d ? now >= d : false);

  const stages = [
    { key: "PEMBENTUKAN", label: "Pembentukan", date: null, done: true },
    { key: "PEMBEKALAN", label: "Pembekalan", date: periode.tgl_pembekalan, done: isDone(periode.tgl_pembekalan) },
    { key: "PELAKSANAAN", label: "Pelaksanaan", date: periode.tgl_pelaksanaan, done: isDone(periode.tgl_pelaksanaan) },
    // Logbook berjalan selama pelaksanaan, dianggap selesai saat tgl_penarikan
    { key: "LOGBOOK", label: "Logbook", date: periode.tgl_penarikan, done: isDone(periode.tgl_penarikan) },
    { key: "LAPORAN_AKHIR", label: "Laporan Akhir", date: periode.deadline_laporan, done: isDone(periode.deadline_laporan) },
  ];

  const current = stages.find((s) => !s.done)?.label ?? "Laporan Akhir";
  return { stages, tahap_saat_ini: current };
};

export const getKelompokDetail = async (
  id: number,
  viewer?: { id: number; role?: string },
) => {
  const kelompok = await prisma.kkmKelompok.findUnique({
    where: { id },
    include: {
      lokasi: { select: { id: true, desa: true, kecamatan: true, kabupaten: true, kuota: true } },
      dpl: { select: { id: true, name: true, email: true, nidn_nip: true } },
      periode: {
        select: {
          id: true,
          nama_periode: true,
          tahun_akademik: true,
          jenis: true,
          status: true,
          tgl_pembekalan: true,
          tgl_pelaksanaan: true,
          tgl_penarikan: true,
          deadline_laporan: true,
        },
      },
      documents: {
        select: {
          id: true,
          document_type: true,
          title: true,
          file_size: true,
          mime_type: true,
          uploaded_at: true,
          file_path: true,
          uploader: { select: { name: true } },
        },
        orderBy: { uploaded_at: "desc" },
      },
    },
  });
  if (!kelompok) throw new HttpError("Kelompok KKM tidak ditemukan.", 404);

  // DOSEN (DPL) hanya boleh membuka kelompok bimbingannya sendiri.
  if (viewer?.role === ROLES.DOSEN && kelompok.dpl_id !== viewer.id) {
    throw new HttpError("Anda bukan DPL kelompok ini.", 403);
  }

  const pesertaRows = await prisma.kkmPeserta.findMany({
    where: { kelompok_id: id },
    orderBy: { created_at: "asc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          nidn_nip: true,
          email: true,
          semester: true,
          nomor_hp: true,
          jenis_kelamin: true,
          Fakultas: { select: { nama: true } },
          ProgramStudi: { select: { nama: true } },
        },
      },
    },
  });

  const gender = { laki: 0, perempuan: 0, unknown: 0 };
  const prodiMap = new Map<string, number>();
  for (const p of pesertaRows) {
    if (p.user.jenis_kelamin === "Laki-laki") gender.laki += 1;
    else if (p.user.jenis_kelamin === "Perempuan") gender.perempuan += 1;
    else gender.unknown += 1;
    const prodi = p.user.ProgramStudi?.nama ?? "Lainnya";
    prodiMap.set(prodi, (prodiMap.get(prodi) ?? 0) + 1);
  }
  const prodi = [...prodiMap.entries()]
    .map(([nama, jumlah]) => ({ nama, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah || a.nama.localeCompare(b.nama));

  const status = deriveStatus(pesertaRows.length, kelompok.lokasi.kuota);
  const komposisi = deriveKomposisi(status, gender, prodi.map((p) => p.jumlah), pesertaRows.length);

  return {
    id: kelompok.id,
    nama: kelompok.nama,
    status,
    komposisi,
    persentase_terisi:
      kelompok.lokasi.kuota > 0 ? Math.round((pesertaRows.length / kelompok.lokasi.kuota) * 100) : 0,
    jumlah_anggota: pesertaRows.length,
    kuota: kelompok.lokasi.kuota,
    verifikasi: {
      verified: pesertaRows.filter((p) => p.status === "VERIFIED").length,
      pending: pesertaRows.filter((p) => p.status === "PENDING").length,
      rejected: pesertaRows.filter((p) => p.status === "REJECTED").length,
    },
    periode: {
      id: kelompok.periode.id,
      nama_periode: kelompok.periode.nama_periode,
      tahun_akademik: kelompok.periode.tahun_akademik,
      jenis: kelompok.periode.jenis,
      status: kelompok.periode.status,
    },
    progress: deriveProgress(kelompok.periode),
    // Turunan monitoring (progress %, tahapan, indikator, status) —
    // sumber angka "Progress KKM" di halaman Kelompok Bimbingan DPL.
    monitoring: await deriveMonitoringForKelompok({
      id: kelompok.id,
      last_monitored_at: kelompok.last_monitored_at,
      document_types: kelompok.documents.map((doc) => doc.document_type),
    }),
    lokasi: kelompok.lokasi,
    dpl: kelompok.dpl,
    gender,
    prodi,
    anggota: pesertaRows.map((p) => ({
      peserta_id: p.id,
      user_id: p.user.id,
      nim: p.user.nidn_nip,
      nama: p.user.name,
      email: p.user.email,
      semester: p.user.semester,
      nomor_hp: p.user.nomor_hp,
      jenis_kelamin: p.user.jenis_kelamin,
      fakultas: p.user.Fakultas?.nama ?? null,
      prodi: p.user.ProgramStudi?.nama ?? null,
      status: p.status,
    })),
    dokumen: kelompok.documents.map((d) => ({
      id: d.id,
      document_type: d.document_type,
      title: d.title,
      file_size: d.file_size,
      mime_type: d.mime_type,
      uploaded_at: d.uploaded_at,
      uploaded_by: d.uploader.name,
      url: supabase.storage.from(BUCKET).getPublicUrl(d.file_path).data.publicUrl,
    })),
  };
};

// =============================================
// Edit kelompok (DPL; desa read-only — 1 Desa = 1 Kelompok)
// =============================================

export const updateKelompok = async (id: number, input: KkmKelompokUpdateInput) => {
  const kelompok = await prisma.kkmKelompok.findUnique({
    where: { id },
    include: { periode: { select: { status: true, maks_kelompok_per_dosen: true } } },
  });
  if (!kelompok) throw new HttpError("Kelompok KKM tidak ditemukan.", 404);
  if (kelompok.periode.status === KkmPeriodStatus.SELESAI) {
    throw new HttpError("Periode sudah SELESAI, tidak bisa mengedit kelompok.", 400);
  }

  if (input.dpl_id === undefined) {
    // Tidak ada perubahan
    return { id: kelompok.id, dpl_id: kelompok.dpl_id };
  }

  if (input.dpl_id === null) {
    // Cabut DPL dari kelompok ini saja
    await prisma.kkmKelompok.update({ where: { id }, data: { dpl_id: null } });
    return { id: kelompok.id, dpl_id: null };
  }

  const dosen = await prisma.users.findUnique({
    where: { id: input.dpl_id },
    include: { roles: true },
  });
  if (!dosen) throw new HttpError("Dosen tidak ditemukan.", 404);
  if (dosen.roles.roles !== "DOSEN") throw new HttpError("User bukan DOSEN.", 400);

  // Kelompok sudah punya DPL lain?
  if (kelompok.dpl_id != null && kelompok.dpl_id !== input.dpl_id) {
    throw new HttpError(
      "Kelompok sudah ditugaskan ke DPL lain. Gunakan Ganti DPL / assign ulang dari menu DPL.",
      409,
    );
  }

  // Kuota dosen: KkmDplQuota (fallback periode.maks_kelompok_per_dosen; null = tanpa batas)
  const quota = await prisma.kkmDplQuota.findUnique({
    where: { periode_id_dosen_id: { periode_id: kelompok.periode_id, dosen_id: input.dpl_id } },
    select: { maksimal_kelompok: true },
  });
  const maks = quota?.maksimal_kelompok ?? kelompok.periode.maks_kelompok_per_dosen ?? null;
  if (maks != null) {
    const current = await prisma.kkmKelompok.count({
      where: { periode_id: kelompok.periode_id, dpl_id: input.dpl_id },
    });
    if (current >= maks) {
      throw new HttpError(
        `Dosen sudah mencapai maksimal kelompok (${maks}). Tambah / ubah kuota di menu DPL.`,
        400,
      );
    }
  }

  await prisma.kkmKelompok.update({ where: { id }, data: { dpl_id: input.dpl_id } });
  return { id: kelompok.id, dpl_id: input.dpl_id };
};

// =============================================
// Anggota: tambah / hapus
// =============================================

export const addAnggota = async (kelompok_id: number, input: KkmKelompokAddAnggotaInput) => {
  const kelompok = await prisma.kkmKelompok.findUnique({
    where: { id: kelompok_id },
    select: {
      id: true,
      periode_id: true,
      periode: { select: { status: true } },
      lokasi: { select: { kuota: true } },
    },
  });
  if (!kelompok) throw new HttpError("Kelompok KKM tidak ditemukan.", 404);
  if (kelompok.periode.status === KkmPeriodStatus.SELESAI) {
    throw new HttpError("Periode sudah SELESAI, tidak bisa menambah anggota.", 400);
  }

  const pesertas = await prisma.kkmPeserta.findMany({
    where: { id: { in: input.peserta_ids } },
    select: { id: true, periode_id: true, kelompok_id: true },
  });
  if (pesertas.length !== input.peserta_ids.length) {
    throw new HttpError("Beberapa peserta tidak ditemukan.", 404);
  }
  for (const p of pesertas) {
    if (p.periode_id !== kelompok.periode_id) {
      throw new HttpError(`Peserta ${p.id} beda periode dengan kelompok.`, 400);
    }
  }

  // Hanya peserta yang belum ditempatkan / sudah di kelompok ini (yang pindah = lewat assign-kelompok)
  const moving = pesertas.filter((p) => p.kelompok_id != null && p.kelompok_id !== kelompok_id);
  if (moving.length > 0) {
    throw new HttpError(
      `${moving.length} peserta sudah berada di kelompok lain. Gunakan pindah kelompok (assign-kelompok) untuk memindahkannya.`,
      400,
    );
  }

  const terisi = await prisma.kkmPeserta.count({ where: { kelompok_id } });
  const kuota = kelompok.lokasi.kuota;
  const baru = pesertas.filter((p) => p.kelompok_id == null).length;
  if (terisi + baru > kuota) {
    throw new HttpError(`Kelompok penuh (kuota ${kuota}, sudah ${terisi}).`, 400);
  }

  const res = await prisma.kkmPeserta.updateMany({
    where: { id: { in: input.peserta_ids } },
    data: { kelompok_id },
  });
  return res;
};

export const removeAnggota = async (kelompok_id: number, peserta_id: number) => {
  const peserta = await prisma.kkmPeserta.findUnique({
    where: { id: peserta_id },
    select: { id: true, kelompok_id: true },
  });
  if (!peserta) throw new HttpError("Peserta tidak ditemukan.", 404);
  if (peserta.kelompok_id !== kelompok_id) {
    throw new HttpError("Peserta bukan anggota kelompok ini.", 400);
  }
  await prisma.kkmPeserta.update({
    where: { id: peserta_id },
    data: { kelompok_id: null },
  });
  return { id: peserta_id, kelompok_id: null };
};

// =============================================
// Dokumen kelompok (Supabase Storage, 1 jenis = 1 file, upload baru gantikan lama)
// =============================================

const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

export const uploadDokumen = async (
  kelompok_id: number,
  document_type: KkmKelompokDocType,
  file: Express.Multer.File,
  uploaded_by: number,
) => {
  const kelompok = await prisma.kkmKelompok.findUnique({
    where: { id: kelompok_id },
    select: { id: true },
  });
  if (!kelompok) throw new HttpError("Kelompok KKM tidak ditemukan.", 404);

  const existing = await prisma.kkmKelompokDocument.findUnique({
    where: { kelompok_id_document_type: { kelompok_id, document_type } },
  });

  const filePath = `kkm-kelompok/${kelompok_id}/${document_type}/${Date.now()}-${safeFileName(file.originalname)}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file.buffer, { contentType: file.mimetype, cacheControl: "3600" });
  if (uploadError) {
    throw new HttpError(`Gagal upload ke Supabase: ${uploadError.message}`, 500);
  }

  // Gantikan yang lama (hapus file storage + row lama)
  if (existing) {
    await supabase.storage.from(BUCKET).remove([existing.file_path]);
    await prisma.kkmKelompokDocument.delete({ where: { id: existing.id } });
  }

  const doc = await prisma.kkmKelompokDocument.create({
    data: {
      kelompok_id,
      document_type,
      title: file.originalname,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.mimetype,
      uploaded_by,
    },
  });
  return doc;
};

export const deleteDokumen = async (doc_id: number) => {
  const doc = await prisma.kkmKelompokDocument.findUnique({ where: { id: doc_id } });
  if (!doc) throw new HttpError("Dokumen kelompok tidak ditemukan.", 404);

  await supabase.storage.from(BUCKET).remove([doc.file_path]);
  await prisma.kkmKelompokDocument.delete({ where: { id: doc_id } });
  return { id: doc_id };
};

import { prisma } from "../../prisma";
import { KkmPeriodStatus } from "../../generated/prisma/enums";
import { HttpError } from "../../common/errors/http-error";
import { supabase } from "../../config/storage";
import {
  NAMA_HARI,
  hitungJadwalMingguan,
} from "../common/kkm-deadline";
import type { KkmLogbookKelompokUploadInput } from "./kkm-logbook-kelompok.validation";

const BUCKET = "lppm_documents";
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB (PDF)

const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

const fileUrlOf = (filePath: string): string =>
  supabase.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;

export type JabatanKelompokValue = "ANGGOTA" | "KETUA" | "SEKRETARIS";

/** Jabatan yang boleh mengunggah dokumen kelompok (logbook & laporan). */
export const isJabatanPenunggah = (
  jabatan?: { nama: string } | null,
): jabatan is { nama: "KETUA" | "SEKRETARIS" } =>
  jabatan?.nama === "KETUA" || jabatan?.nama === "SEKRETARIS";

/**
 * Keanggotaan mahasiswa pada periode aktif (fallback: periode mana pun).
 * Mengembalikan peserta_id, kelompok_id, periode_id, dan jabatan.
 */
export const getKeanggotaanSaya = async (userId: number) => {
  const findRow = (aktifOnly: boolean) =>
    prisma.kkmPeserta.findFirst({
      where: {
        user_id: userId,
        kelompok_id: { not: null },
        ...(aktifOnly ? { periode: { status: KkmPeriodStatus.AKTIF } } : {}),
      },
      orderBy: { updated_at: "desc" },
      select: {
        id: true,
        kelompok_id: true,
        periode_id: true,
        jabatan: { select: { id: true, nama: true } },
        status: true,
      },
    });

  return (await findRow(true)) ?? (await findRow(false)) ?? null;
};

// =============================================
// Jadwal & riwayat logbook kelompok saya
// =============================================

export const getLogbookKelompokSaya = async (userId: number) => {
  const keanggotaan = await getKeanggotaanSaya(userId);
  if (!keanggotaan?.kelompok_id) {
    throw new HttpError(
      "Kelompok KKM Anda belum ditetapkan, logbook kelompok belum bisa diakses. Hubungi panitia/LPPM.",
      404,
    );
  }

  const kelompok = await prisma.kkmKelompok.findUnique({
    where: { id: keanggotaan.kelompok_id },
    select: {
      id: true,
      nama: true,
      periode: {
        select: {
          id: true,
          nama_periode: true,
          tahun_akademik: true,
          status: true,
          tgl_pelaksanaan: true,
          tgl_penarikan: true,
          logbook_kelompok_hari: true,
          logbook_kelompok_jam: true,
        },
      },
    },
  });
  if (!kelompok) {
    throw new HttpError(
      "Kelompok KKM Anda belum ditetapkan, logbook kelompok belum bisa diakses. Hubungi panitia/LPPM.",
      404,
    );
  }

  const { periode } = kelompok;
  const jadwal = hitungJadwalMingguan({
    tgl_pelaksanaan: periode.tgl_pelaksanaan,
    tgl_penarikan: periode.tgl_penarikan,
    hari: periode.logbook_kelompok_hari,
    jam: periode.logbook_kelompok_jam,
  });

  const riwayat = await prisma.kkmLogbookKelompok.findMany({
    where: { kelompok_id: kelompok.id },
    orderBy: { minggu_ke: "asc" },
    select: {
      minggu_ke: true,
      file_path: true,
      file_size: true,
      mime_type: true,
      created_at: true,
      uploader: { select: { id: true, name: true } },
    },
  });
  const riwayatMap = new Map(riwayat.map((r) => [r.minggu_ke, r]));

  const jabatan = keanggotaan.jabatan;
  const bolehUnggah = isJabatanPenunggah(jabatan);

  const minggu = jadwal.minggu.map((m) => {
    const row = riwayatMap.get(m.minggu_ke);
    return {
      ...m,
      sudah_unggah: Boolean(row),
      berkas: row
        ? {
            nama: row.file_path.split("/").pop() ?? row.file_path,
            url: fileUrlOf(row.file_path),
            ukuran: row.file_size,
            mime: row.mime_type,
            diunggah_pada: row.created_at.toISOString(),
            diunggah_oleh: row.uploader.name,
          }
        : null,
      // Minggu terkunci permanen bila sudah lewat deadline dan belum diunggah.
      bisa_unggah: bolehUnggah && m.status === "TERBUKA",
    };
  });

  const adaJadwal = jadwal.minggu_total > 0;
  const pengaturan = {
    teratur: adaJadwal,
    hari: periode.logbook_kelompok_hari,
    nama_hari: periode.logbook_kelompok_hari
      ? NAMA_HARI[periode.logbook_kelompok_hari]
      : null,
    jam: periode.logbook_kelompok_jam ?? "23:59",
    tampilan: adaJadwal
      ? `Setiap ${NAMA_HARI[periode.logbook_kelompok_hari as number]} pukul ${
          periode.logbook_kelompok_jam ?? "23:59"
        }`
      : "Jadwal upload logbook kelompok belum diatur admin LPPM.",
    pelaksanaan: periode.tgl_pelaksanaan?.toISOString() ?? null,
    penarikan: periode.tgl_penarikan?.toISOString() ?? null,
  };

  const tersimpan = minggu.filter((m) => m.sudah_unggah).length;
  const terbuka = minggu.filter((m) => m.status === "TERBUKA").length;

  return {
    kelompok: { id: kelompok.id, nama: kelompok.nama },
    periode: {
      id: periode.id,
      nama_periode: periode.nama_periode,
      tahun_akademik: periode.tahun_akademik,
      status: periode.status,
    },
    jabatan: jabatan?.nama ?? "ANGGOTA",
    jabatan_label: jabatan?.nama === "KETUA" ? "Ketua" : jabatan?.nama === "SEKRETARIS" ? "Sekretaris" : "Anggota",
    boleh_unggah: bolehUnggah,
    alasan_tidak_boleh_unggah: bolehUnggah
      ? null
      : "Hanya Ketua dan Sekretaris kelompok yang dapat mengunggah logbook kelompok.",
    pengaturan,
    minggu_total: jadwal.minggu_total,
    minggu,
    stats: {
      total_minggu: jadwal.minggu_total,
      sudah_unggah: tersimpan,
      belum_unggah: Math.max(0, jadwal.minggu_total - tersimpan),
      minggu_terbuka: terbuka,
    },
  };
};

// =============================================
// Unggah logbook kelompok mingguan
// =============================================

export const uploadLogbookKelompok = async (
  kelompokId: number,
  input: KkmLogbookKelompokUploadInput,
  userId: number,
  file?: Express.Multer.File,
) => {
  if (!file) throw new HttpError("File logbook wajib diunggah (field: file).", 400);
  if (file.mimetype !== "application/pdf") {
    throw new HttpError("File logbook harus berformat PDF.", 400);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new HttpError("Ukuran file logbook terlalu besar. Maksimal 10 MB.", 400);
  }

  const kelompok = await prisma.kkmKelompok.findUnique({
    where: { id: kelompokId },
    select: {
      id: true,
      nama: true,
      periode: {
        select: {
          id: true,
          status: true,
          tgl_pelaksanaan: true,
          tgl_penarikan: true,
          logbook_kelompok_hari: true,
          logbook_kelompok_jam: true,
        },
      },
      peserta: { select: { user_id: true, jabatan: true, status: true } },
    },
  });
  if (!kelompok) throw new HttpError("Kelompok KKM tidak ditemukan.", 404);

  const saya = kelompok.peserta.find((p) => p.user_id === userId);
  if (!saya) throw new HttpError("Anda bukan anggota kelompok ini.", 403);
  if (!isJabatanPenunggah(saya.jabatan)) {
    throw new HttpError(
      "Hanya Ketua dan Sekretaris kelompok yang dapat mengunggah logbook kelompok.",
      403,
    );
  }
  if (kelompok.periode.status === KkmPeriodStatus.SELESAI) {
    throw new HttpError("Periode sudah SELESAI, tidak bisa mengunggah logbook kelompok.", 400);
  }

  const jadwal = hitungJadwalMingguan({
    tgl_pelaksanaan: kelompok.periode.tgl_pelaksanaan,
    tgl_penarikan: kelompok.periode.tgl_penarikan,
    hari: kelompok.periode.logbook_kelompok_hari,
    jam: kelompok.periode.logbook_kelompok_jam,
  });

  if (jadwal.minggu_total === 0) {
    throw new HttpError(
      "Jadwal upload logbook kelompok belum diatur admin LPPM. Hubungi admin untuk mengatur hari & jam deadline.",
      400,
    );
  }

  const target = jadwal.minggu.find((m) => m.minggu_ke === input.minggu_ke);
  if (!target) {
    throw new HttpError(
      `Minggu ke-${input.minggu_ke} di luar rentang jadwal (1 - ${jadwal.minggu_total}).`,
      400,
    );
  }
  if (target.status === "BELUM_DIBUKA") {
    throw new HttpError(
      `Minggu ke-${target.minggu_ke} belum dibuka (mulai ${target.tanggal_mulai}).`,
      400,
    );
  }
  if (target.status === "TERKUNCI") {
    throw new HttpError(
      `Deadline minggu ke-${target.minggu_ke} sudah lewat (${target.deadline_tampil}). Minggu ini terkunci permanen.`,
      400,
    );
  }

  const existing = await prisma.kkmLogbookKelompok.findUnique({
    where: { kelompok_id_minggu_ke: { kelompok_id: kelompokId, minggu_ke: input.minggu_ke } },
  });

  const filePath = `kkm-logbook-kelompok/${kelompokId}/minggu-${input.minggu_ke}/${Date.now()}-${safeFileName(file.originalname)}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file.buffer, { contentType: file.mimetype, cacheControl: "3600" });
  if (uploadError) {
    throw new HttpError(`Gagal upload ke Supabase: ${uploadError.message}`, 500);
  }

  // Upload ulang menimpa minggu yang sama — hapus berkas lama lebih dulu.
  if (existing) {
    await supabase.storage.from(BUCKET).remove([existing.file_path]);
    await prisma.kkmLogbookKelompok.delete({ where: { id: existing.id } });
  }

  const created = await prisma.kkmLogbookKelompok.create({
    data: {
      kelompok_id: kelompokId,
      periode_id: kelompok.periode.id,
      minggu_ke: input.minggu_ke,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.mimetype,
      uploaded_by: userId,
    },
    select: {
      id: true,
      minggu_ke: true,
      file_path: true,
      file_size: true,
      created_at: true,
    },
  });

  return {
    id: created.id,
    minggu_ke: created.minggu_ke,
    nama: created.file_path.split("/").pop() ?? created.file_path,
    url: fileUrlOf(created.file_path),
    ukuran: created.file_size,
    diunggah_pada: created.created_at.toISOString(),
    deadline_tampil: target.deadline_tampil,
  };
};


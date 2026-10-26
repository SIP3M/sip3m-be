import { supabase } from "../../config/storage";
import { prisma } from "../../prisma";
import { HttpError } from "../../common/errors/http-error";
import {
  KkmPeriodStatus,
  KkmPesertaStatus,
} from "../../generated/prisma/enums";
import { SYARAT_SEMESTER } from "./kkm-pendaftaran.types";
import type {
  ListPendaftaranQuery,
  UpsertPendaftaranInput,
} from "./kkm-pendaftaran.validation";

const BUCKET = "lppm_documents";
const UKT_FOLDER = "kkm/ukt";

/** "YYYY-MM-DD" versi UTC — cukup untuk perbandingan tanggal pendaftaran. */
const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

/** Nomor HP: digit, boleh diawali +, 9–15 digit (spasi/dash diabaikan). */
const isValidPhone = (v: string): boolean =>
  /^\+?\d{9,15}$/.test(v.replace(/[\s-]/g, ""));

const uploadUktToSupabase = async (
  file: Express.Multer.File,
  userId: number,
): Promise<string> => {
  const sanitizedName = file.originalname.replace(/\s+/g, "_");
  const filePath = `${UKT_FOLDER}/${userId}_${Date.now()}_${sanitizedName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
  if (error) {
    throw new HttpError(`Gagal mengunggah bukti UKT: ${error.message}`, 500);
  }
  return filePath;
};

const toPublicUrl = (filePath: string | null): string | null => {
  if (!filePath) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;
};

const mapRow = (r: {
  id: number;
  periode_id: number;
  status: KkmPesertaStatus;
  no_wa: string | null;
  ukuran_jaket: string | null;
  nama_kontak_darurat: string | null;
  no_hp_kontak_darurat: string | null;
  alamat_domisili: string | null;
  bukti_ukt_path: string | null;
  created_at: Date;
  updated_at: Date;
  periode?: unknown;
}) => ({
  id: r.id,
  periode_id: r.periode_id,
  status: r.status,
  no_wa: r.no_wa,
  ukuran_jaket: r.ukuran_jaket,
  nama_kontak_darurat: r.nama_kontak_darurat,
  no_hp_kontak_darurat: r.no_hp_kontak_darurat,
  alamat_domisili: r.alamat_domisili,
  bukti_ukt_url: toPublicUrl(r.bukti_ukt_path),
  periode: r.periode ?? null,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

const periodeSelect = {
  select: {
    id: true,
    nama_periode: true,
    tahun_akademik: true,
    jenis: true,
    status: true,
  },
} as const;

// =============================================
// Baca (mahasiswa)
// =============================================

/** Riwayat pendaftaran saya; bila periode_id diberikan, hanya periode itu. */
export const getPendaftaranSaya = async (
  userId: number,
  query: ListPendaftaranQuery,
) => {
  const rows = await prisma.kkmPeserta.findMany({
    where: {
      user_id: userId,
      ...(query.periode_id ? { periode_id: query.periode_id } : {}),
    },
    orderBy: { updated_at: "desc" },
    include: { periode: periodeSelect },
  });
  return rows.map(mapRow);
};

// =============================================
// Tulis (mahasiswa): draft / kirim
// =============================================

const periodeOpenForKirim = (periode: {
  tgl_buka_daftar: Date | null;
  tgl_tutup_daftar: Date | null;
}): string | null => {
  const today = isoDate(new Date());
  if (periode.tgl_buka_daftar && today < isoDate(periode.tgl_buka_daftar)) {
    return "Pendaftaran belum dibuka untuk periode ini.";
  }
  if (periode.tgl_tutup_daftar && today > isoDate(periode.tgl_tutup_daftar)) {
    return "Pendaftaran sudah ditutup untuk periode ini.";
  }
  return null;
};

export const upsertPendaftaran = async (
  userId: number,
  input: UpsertPendaftaranInput,
  file: Express.Multer.File | undefined,
) => {
  // 1) Syarat: mahasiswa semester 7
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { semester: true },
  });
  if (!user) throw new HttpError("Pengguna tidak ditemukan.", 404);
  if (user.semester !== SYARAT_SEMESTER) {
    throw new HttpError(
      `Hanya mahasiswa semester ${SYARAT_SEMESTER} yang dapat mendaftar KKM.`,
      403,
    );
  }

  // 2) Periode harus AKTIF
  const periode = await prisma.kkmPeriod.findUnique({
    where: { id: input.periode_id },
    select: {
      id: true,
      nama_periode: true,
      status: true,
      tgl_buka_daftar: true,
      tgl_tutup_daftar: true,
    },
  });
  if (!periode) throw new HttpError("Periode KKM tidak ditemukan.", 404);
  if (periode.status !== KkmPeriodStatus.AKTIF) {
    throw new HttpError(
      "Pendaftaran pada periode ini belum dibuka (status periode bukan AKTIF). Periode DIJADWALKAN baru dapat didaftarkan setelah diaktifkan panitia.",
      400,
    );
  }

  // 3) Kirim penuh: jendela tanggal, data wajib, pernyataan
  if (input.aksi === "kirim") {
    const tutupMsg = periodeOpenForKirim(periode);
    if (tutupMsg) throw new HttpError(tutupMsg, 400);

    const kurang = [
      ["no_wa", input.no_wa],
      ["ukuran_jaket", input.ukuran_jaket],
      ["nama_kontak_darurat", input.nama_kontak_darurat],
      ["no_hp_kontak_darurat", input.no_hp_kontak_darurat],
      ["alamat_domisili", input.alamat_domisili],
    ].filter(([, v]) => !v);
    if (kurang.length > 0) {
      throw new HttpError(
        "Lengkapi seluruh data wajib pada formulir sebelum mengirim pendaftaran.",
        400,
      );
    }
    if (!input.pernyataan) {
      throw new HttpError(
        "Centang pernyataan kebenaran data & kelunasan UKT sebelum mengirim.",
        400,
      );
    }
  }

  if (input.no_wa && !isValidPhone(input.no_wa)) {
    throw new HttpError("Nomor WA tidak valid (9–15 digit, boleh diawali +).", 400);
  }
  if (input.no_hp_kontak_darurat && !isValidPhone(input.no_hp_kontak_darurat)) {
    throw new HttpError(
      "Nomor HP kontak darurat tidak valid (9–15 digit, boleh diawali +).",
      400,
    );
  }

  // 4) Baris existing — PENDING/VERIFIED terkunci; DRAFT/REJECTED boleh diperbarui
  const existing = await prisma.kkmPeserta.findUnique({
    where: { periode_id_user_id: { periode_id: input.periode_id, user_id: userId } },
  });
  if (existing?.status === KkmPesertaStatus.VERIFIED) {
    throw new HttpError(
      "Anda sudah terverifikasi sebagai peserta periode ini.",
      409,
    );
  }
  if (existing?.status === KkmPesertaStatus.PENDING) {
    throw new HttpError(
      "Pendaftaran Anda sudah dikirim dan sedang menunggu verifikasi admin LPPM.",
      409,
    );
  }

  // 5) Berkas bukti UKT — file baru bila diunggah; kirim wajib punya berkas
  let buktiPath = existing?.bukti_ukt_path ?? null;
  if (file) {
    buktiPath = await uploadUktToSupabase(file, userId);
    if (existing?.bukti_ukt_path) {
      // ganti berkas lama — best effort
      await supabase.storage
        .from(BUCKET)
        .remove([existing.bukti_ukt_path])
        .catch(() => undefined);
    }
  }
  if (input.aksi === "kirim" && !buktiPath) {
    throw new HttpError(
      "Bukti pembayaran UKT wajib diunggah sebelum mengirim pendaftaran.",
      400,
    );
  }

  // 6) Simpan — isian kosong pada draft dianggap mempertahankan nilai lama
  const status =
    input.aksi === "kirim" ? KkmPesertaStatus.PENDING : KkmPesertaStatus.DRAFT;

  const next = {
    status,
    no_wa: input.no_wa?.trim() || existing?.no_wa || null,
    ukuran_jaket: input.ukuran_jaket || existing?.ukuran_jaket || null,
    nama_kontak_darurat:
      input.nama_kontak_darurat?.trim() || existing?.nama_kontak_darurat || null,
    no_hp_kontak_darurat:
      input.no_hp_kontak_darurat?.trim() ||
      existing?.no_hp_kontak_darurat ||
      null,
    alamat_domisili:
      input.alamat_domisili?.trim() || existing?.alamat_domisili || null,
    bukti_ukt_path: buktiPath,
  };

  const row = existing
    ? await prisma.kkmPeserta.update({
        where: { id: existing.id },
        data: next,
        include: { periode: periodeSelect },
      })
    : await prisma.kkmPeserta.create({
        data: { periode_id: input.periode_id, user_id: userId, ...next },
        include: { periode: periodeSelect },
      });

  return {
    row,
    created: !existing,
    message:
      input.aksi === "kirim"
        ? "Pendaftaran berhasil dikirim — menunggu verifikasi admin LPPM."
        : "Draft pendaftaran berhasil disimpan.",
  };
};

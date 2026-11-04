/* eslint-disable @typescript-eslint/no-explicit-any -- tipe dinamis untuk relasi prisma */
import { prisma } from "../../prisma";
import { HttpError } from "../../common/errors/http-error";
import type { UpsertPenilaianInput } from "./kkm-penilaian.validation";

/**
 * Bobot komponen penilaian KKM (Total 100%):
 * Kehadiran: 15%
 * Keaktifan: 15%
 * Logbook: 20%
 * Program Kerja: 20%
 * Laporan: 20%
 * Sikap: 10%
 */
const BOBOT = {
  kehadiran: 0.15,
  keaktifan: 0.15,
  logbook: 0.20,
  program_kerja: 0.20,
  laporan: 0.20,
  sikap: 0.10,
};

export const calculateGrade = (score: number): string => {
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "E";
};

export const computeNilaiAkhir = (komponen: {
  kehadiran: number;
  keaktifan: number;
  logbook: number;
  program_kerja: number;
  laporan: number;
  sikap: number;
}) => {
  const akhir =
    komponen.kehadiran * BOBOT.kehadiran +
    komponen.keaktifan * BOBOT.keaktifan +
    komponen.logbook * BOBOT.logbook +
    komponen.program_kerja * BOBOT.program_kerja +
    komponen.laporan * BOBOT.laporan +
    komponen.sikap * BOBOT.sikap;

  const rounded = Math.round(akhir * 10) / 10;
  return {
    nilai_akhir: rounded,
    grade: calculateGrade(rounded),
  };
};

/** Ambil daftar mahasiswa bimbingan DPL beserta nilai KKM-nya (untuk DPL). */
export const getPenilaianBimbinganByDpl = async (dplId: number) => {
  // Cari kelompok yang dibimbing oleh DPL ini
  const kelompokList = await prisma.kkmKelompok.findMany({
    where: { dpl_id: dplId },
    select: {
      id: true,
      nama: true,
      periode: { select: { id: true, nama_periode: true, tahun_akademik: true } },
      peserta: {
        where: { status: { not: "REJECTED" } },
        include: {
          user: { select: { id: true, name: true, email: true, username: true } },
          penilaian: true,
        },
        orderBy: { user: { name: "asc" } },
      },
    },
  });

  // Flatten peserta dengan info kelompoknya
  const result: Array<{
    peserta_id: number;
    nama: string;
    nim: string;
    kelompok_id: number;
    kelompok_nama: string;
    periode: any;
    penilaian: any;
  }> = [];
  for (const k of kelompokList) {
    for (const p of k.peserta) {
      result.push({
        peserta_id: p.id,
        nama: p.user.name,
        nim: p.user.username ?? p.user.email.split("@")[0],
        kelompok_id: k.id,
        kelompok_nama: k.nama,
        periode: k.periode,
        penilaian: p.penilaian ?? {
          kehadiran: 0,
          keaktifan: 0,
          logbook: 0,
          program_kerja: 0,
          laporan: 0,
          sikap: 0,
          nilai_akhir: 0,
          grade: "E",
          catatan_dpl: "",
          is_saved: false,
          dinilai_at: null,
        },
      });
    }
  }

  return {
    bobot: {
      kehadiran: "15%",
      keaktifan: "15%",
      logbook: "20%",
      program_kerja: "20%",
      laporan: "20%",
      sikap: "10%",
    },
    kelompok_list: kelompokList.map((k) => ({ id: k.id, nama: k.nama })),
    peserta: result,
  };
};

/** Simpan atau perbarui nilai satu peserta oleh DPL. */
export const upsertPenilaianMahasiswa = async (
  input: UpsertPenilaianInput,
  dplId: number,
) => {
  // Verifikasi peserta ada dan berada di kelompok bimbingan DPL ini
  const peserta = await prisma.kkmPeserta.findUnique({
    where: { id: input.peserta_id },
    include: {
      kelompok: { select: { dpl_id: true } },
    },
  });

  if (!peserta) {
    throw new HttpError("Peserta KKM tidak ditemukan.", 404);
  }

  if (peserta.kelompok?.dpl_id !== dplId) {
    throw new HttpError("Anda tidak memiliki akses menilai mahasiswa di luar bimbingan Anda.", 403);
  }

  const { nilai_akhir, grade } = computeNilaiAkhir({
    kehadiran: input.kehadiran,
    keaktifan: input.keaktifan,
    logbook: input.logbook,
    program_kerja: input.program_kerja,
    laporan: input.laporan,
    sikap: input.sikap,
  });

  const saved = await prisma.kkmPenilaian.upsert({
    where: { peserta_id: input.peserta_id },
    create: {
      peserta_id: input.peserta_id,
      kehadiran: input.kehadiran,
      keaktifan: input.keaktifan,
      logbook: input.logbook,
      program_kerja: input.program_kerja,
      laporan: input.laporan,
      sikap: input.sikap,
      nilai_akhir,
      grade,
      catatan_dpl: input.catatan_dpl ?? null,
      is_saved: true,
      dinilai_oleh: dplId,
      dinilai_at: new Date(),
    },
    update: {
      kehadiran: input.kehadiran,
      keaktifan: input.keaktifan,
      logbook: input.logbook,
      program_kerja: input.program_kerja,
      laporan: input.laporan,
      sikap: input.sikap,
      nilai_akhir,
      grade,
      catatan_dpl: input.catatan_dpl ?? null,
      is_saved: true,
      dinilai_oleh: dplId,
      dinilai_at: new Date(),
    },
  });

  return saved;
};

/** Ambil nilai & evaluasi untuk mahasiswa yang sedang login. */
export const getPenilaianMahasiswaSaya = async (userId: number) => {
  const peserta = await prisma.kkmPeserta.findFirst({
    where: { user_id: userId, status: { not: "REJECTED" } },
    include: {
      periode: { select: { id: true, nama_periode: true, tahun_akademik: true } },
      kelompok: {
        include: {
          lokasi: { select: { desa: true, kecamatan: true } },
          dpl: { select: { id: true, name: true, nidn_nip: true } },
        },
      },
      penilaian: {
        include: {
          penilai: { select: { id: true, name: true, nidn_nip: true } },
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  if (!peserta) {
    throw new HttpError("Anda belum terdaftar sebagai peserta KKM aktif.", 404);
  }

  return {
    peserta_id: peserta.id,
    periode: peserta.periode,
    kelompok: peserta.kelompok
      ? {
          nama: peserta.kelompok.nama,
          desa: peserta.kelompok.lokasi.desa,
          dpl: peserta.kelompok.dpl,
        }
      : null,
    penilaian: peserta.penilaian ?? {
      kehadiran: 0,
      keaktifan: 0,
      logbook: 0,
      program_kerja: 0,
      laporan: 0,
      sikap: 0,
      nilai_akhir: 0,
      grade: "E",
      catatan_dpl: null,
      is_saved: false,
      dinilai_at: null,
    },
    bobot_komponen: [
      { komponen: "Kehadiran", bobot: "15%" },
      { komponen: "Keaktifan", bobot: "15%" },
      { komponen: "Logbook", bobot: "20%" },
      { komponen: "Program Kerja", bobot: "20%" },
      { komponen: "Laporan", bobot: "20%" },
      { komponen: "Sikap", bobot: "10%" },
    ],
  };
};

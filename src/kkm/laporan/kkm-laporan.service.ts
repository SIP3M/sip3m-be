import { prisma } from "../../prisma";
import { HttpError } from "../../common/errors/http-error";
import { supabase } from "../../config/storage";
import {
  bukaSetelahPenarikan,
  cekJendelaUpload,
  formatDeadline,
  atJam,
} from "../common/kkm-deadline";
import {
  getKeanggotaanSaya,
  isJabatanPenunggah,
  type JabatanKelompokValue,
} from "../logbook-kelompok/kkm-logbook-kelompok.service";

const BUCKET = "lppm_documents";
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB (PDF)

const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");
const fileUrlOf = (filePath: string): string =>
  supabase.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;

const assertPdf = (file: Express.Multer.File | undefined, label: string): Express.Multer.File => {
  if (!file) throw new HttpError(`File ${label} wajib diunggah (field: file).`, 400);
  if (file.mimetype !== "application/pdf") {
    throw new HttpError(`File ${label} harus berformat PDF.`, 400);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new HttpError(`Ukuran file ${label} terlalu besar. Maksimal 10 MB.`, 400);
  }
  return file;
};

// =============================================
// LAPORAN INDIVIDU
// =============================================

/**
 * Status laporan individu milik mahasiswa yang login.
 * Terbuka setelah tgl_penarikan lewat, ditutup pada deadline_laporan_individu + jam.
 */
export const getLaporanIndividuSaya = async (userId: number) => {
  const keanggotaan = await getKeanggotaanSaya(userId);
  if (!keanggotaan?.kelompok_id) {
    throw new HttpError(
      "Kelompok KKM Anda belum ditetapkan, laporan individu belum bisa diakses. Hubungi panitia/LPPM.",
      404,
    );
  }

  const peserta = await prisma.kkmPeserta.findUnique({
    where: { id: keanggotaan.id },
    select: {
      id: true,
      status: true,
      user: { select: { id: true, name: true, nidn_nip: true } },
      periode: {
        select: {
          id: true,
          nama_periode: true,
          tahun_akademik: true,
          status: true,
          tgl_penarikan: true,
          deadline_laporan_individu: true,
          jam_laporan_individu: true,
        },
      },
    },
  });
  if (!peserta) throw new HttpError("Data kepesertaan Anda tidak ditemukan.", 404);

  const { periode } = peserta;
  const jendela = cekJendelaUpload({
    bukaSetelah: bukaSetelahPenarikan(periode.tgl_penarikan),
    tutupPada: periode.deadline_laporan_individu
      ? atJam(periode.deadline_laporan_individu, periode.jam_laporan_individu)
      : null,
    alasanTertutup: periode.tgl_penarikan
      ? `Laporan individu dibuka setelah kegiatan KKM selesai (${formatDeadline(
          bukaSetelahPenarikan(periode.tgl_penarikan) as Date,
        )}).`
      : "Jadwal pelaksanaan KKM belum ditentukan, laporan individu belum dapat diunggah.",
  });

  const dokumen = await prisma.kkmLaporanIndividu.findUnique({
    where: { peserta_id: peserta.id },
    select: {
      file_path: true,
      file_size: true,
      mime_type: true,
      uploaded_at: true,
      uploader: { select: { name: true } },
    },
  });

  // Selama jendela terbuka, berkas boleh diganti (upload ulang menimpa).
  const bisaUnggah = jendela.terbuka;

  return {
    peserta: {
      id: peserta.id,
      nama: peserta.user.name,
      nim: peserta.user.nidn_nip,
    },
    periode: {
      id: periode.id,
      nama_periode: periode.nama_periode,
      tahun_akademik: periode.tahun_akademik,
      status: periode.status,
    },
    jendela: {
      ...jendela,
      // Deadline hanya ditampilkan bila sudah diatur admin.
      ditutup_pada: periode.deadline_laporan_individu
        ? jendela.ditutup_pada
        : null,
      deadline_tampil: periode.deadline_laporan_individu
        ? jendela.deadline_tampil
        : null,
      tanpa_batas: !periode.deadline_laporan_individu,
    },
    bisa_unggah: bisaUnggah,
    laporan: dokumen
      ? {
          nama: dokumen.file_path.split("/").pop() ?? dokumen.file_path,
          url: fileUrlOf(dokumen.file_path),
          ukuran: dokumen.file_size,
          mime: dokumen.mime_type,
          diunggah_pada: dokumen.uploaded_at.toISOString(),
          diunggah_oleh: dokumen.uploader.name,
          terkunci: !jendela.terbuka,
        }
      : null,
  };
};

/** Unggah / ganti laporan individu (1 PDF per mahasiswa). */
export const uploadLaporanIndividu = async (
  userId: number,
  file?: Express.Multer.File,
) => {
  const f = assertPdf(file, "laporan individu");

  const keanggotaan = await getKeanggotaanSaya(userId);
  if (!keanggotaan?.kelompok_id) {
    throw new HttpError(
      "Kelompok KKM Anda belum ditetapkan, laporan individu belum bisa diunggah.",
      404,
    );
  }

  const peserta = await prisma.kkmPeserta.findUnique({
    where: { id: keanggotaan.id },
    select: {
      id: true,
      periode: {
        select: {
          status: true,
          tgl_penarikan: true,
          deadline_laporan_individu: true,
          jam_laporan_individu: true,
        },
      },
    },
  });
  if (!peserta) throw new HttpError("Data kepesertaan Anda tidak ditemukan.", 404);

  const { periode } = peserta;
  const jendela = cekJendelaUpload({
    bukaSetelah: bukaSetelahPenarikan(periode.tgl_penarikan),
    tutupPada: periode.deadline_laporan_individu
      ? atJam(periode.deadline_laporan_individu, periode.jam_laporan_individu)
      : null,
    alasanTertutup: periode.tgl_penarikan
      ? `Laporan individu dibuka setelah kegiatan KKM selesai (${formatDeadline(
          bukaSetelahPenarikan(periode.tgl_penarikan) as Date,
        )}).`
      : "Jadwal pelaksanaan KKM belum ditentukan, laporan individu belum dapat diunggah.",
  });
  if (!jendela.terbuka) {
    throw new HttpError(jendela.alasan ?? "Jendela unggah laporan individu tertutup.", 400);
  }

  const existing = await prisma.kkmLaporanIndividu.findUnique({
    where: { peserta_id: peserta.id },
  });

  const filePath = `kkm-laporan-individu/${peserta.id}/${Date.now()}-${safeFileName(f.originalname)}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, f.buffer, { contentType: f.mimetype, cacheControl: "3600" });
  if (uploadError) {
    throw new HttpError(`Gagal upload ke Supabase: ${uploadError.message}`, 500);
  }

  // Upload ulang menimpa laporan lama — hapus berkas & row sebelumnya.
  if (existing) {
    await supabase.storage.from(BUCKET).remove([existing.file_path]);
    await prisma.kkmLaporanIndividu.delete({ where: { id: existing.id } });
  }

  const created = await prisma.kkmLaporanIndividu.create({
    data: {
      peserta_id: peserta.id,
      periode_id: keanggotaan.periode_id,
      file_path: filePath,
      file_size: f.size,
      mime_type: f.mimetype,
      uploaded_by: userId,
    },
    select: {
      id: true,
      file_path: true,
      file_size: true,
      uploaded_at: true,
    },
  });

  return {
    id: created.id,
    nama: created.file_path.split("/").pop() ?? created.file_path,
    url: fileUrlOf(created.file_path),
    ukuran: created.file_size,
    diunggah_pada: created.uploaded_at.toISOString(),
    deadline_tampil: jendela.deadline_tampil,
  };
};

// =============================================
// LAPORAN KELOMPOK
// =============================================

/**
 * Status laporan kelompok (dokumen tipe LAPORAN_AKHIR).
 * Terbuka setelah tgl_penarikan lewat, ditutup pada deadline_laporan + jam.
 * Hanya Ketua/Sekretaris yang boleh mengunggah; anggota hanya melihat.
 */
export const getLaporanKelompokSaya = async (userId: number) => {
  const keanggotaan = await getKeanggotaanSaya(userId);
  if (!keanggotaan?.kelompok_id) {
    throw new HttpError(
      "Kelompok KKM Anda belum ditetapkan, laporan kelompok belum bisa diakses. Hubungi panitia/LPPM.",
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
          tgl_penarikan: true,
          deadline_laporan: true,
          jam_laporan_kelompok: true,
        },
      },
      peserta: {
        select: {
          user_id: true,
          jabatan: { select: { id: true, nama: true } },
          user: { select: { id: true, name: true, nidn_nip: true } },
        },
      },
      documents: {
        where: { document_type: "LAPORAN_AKHIR" },
        select: {
          id: true,
          title: true,
          file_path: true,
          file_size: true,
          mime_type: true,
          uploaded_at: true,
          uploader: { select: { name: true } },
        },
      },
    },
  });
  if (!kelompok) {
    throw new HttpError(
      "Kelompok KKM Anda belum ditetapkan, laporan kelompok belum bisa diakses. Hubungi panitia/LPPM.",
      404,
    );
  }

  const { periode } = kelompok;
  const jendela = cekJendelaUpload({
    bukaSetelah: bukaSetelahPenarikan(periode.tgl_penarikan),
    tutupPada: periode.deadline_laporan
      ? atJam(periode.deadline_laporan, periode.jam_laporan_kelompok)
      : null,
    alasanTertutup: periode.tgl_penarikan
      ? `Laporan kelompok dibuka setelah kegiatan KKM selesai (${formatDeadline(
          bukaSetelahPenarikan(periode.tgl_penarikan) as Date,
        )}).`
      : "Jadwal pelaksanaan KKM belum ditentukan, laporan kelompok belum dapat diunggah.",
  });

  const dokumen = kelompok.documents[0] ?? null;
  const jabatan = keanggotaan.jabatan;
  const bolehUnggah = isJabatanPenunggah(jabatan);

  return {
    kelompok: { id: kelompok.id, nama: kelompok.nama },
    periode: {
      id: periode.id,
      nama_periode: periode.nama_periode,
      tahun_akademik: periode.tahun_akademik,
      status: periode.status,
    },
    jabatan: jabatan?.nama ?? "ANGGOTA",
    jabatan_label:
      jabatan?.nama === "KETUA" ? "Ketua" : jabatan?.nama === "SEKRETARIS" ? "Sekretaris" : "Anggota",
    boleh_unggah: bolehUnggah,
    alasan_tidak_boleh_unggah: bolehUnggah
      ? null
      : "Hanya Ketua dan Sekretaris kelompok yang dapat mengunggah laporan kelompok.",
    jendela: {
      ...jendela,
      ditutup_pada: periode.deadline_laporan ? jendela.ditutup_pada : null,
      deadline_tampil: periode.deadline_laporan ? jendela.deadline_tampil : null,
      tanpa_batas: !periode.deadline_laporan,
    },
    bisa_unggah: bolehUnggah && jendela.terbuka,
    ketua: kelompok.peserta
      .filter((p) => p.jabatan?.nama === "KETUA")
      .map((p) => ({ nama: p.user.name, nim: p.user.nidn_nip })),
    sekretaris: kelompok.peserta
      .filter((p) => p.jabatan?.nama === "SEKRETARIS")
      .map((p) => ({ nama: p.user.name, nim: p.user.nidn_nip })),
    laporan: dokumen
      ? {
          id: dokumen.id,
          nama: dokumen.file_path.split("/").pop() ?? dokumen.file_path,
          judul: dokumen.title,
          url: fileUrlOf(dokumen.file_path),
          ukuran: dokumen.file_size,
          mime: dokumen.mime_type,
          diunggah_pada: dokumen.uploaded_at.toISOString(),
          diunggah_oleh: dokumen.uploader.name,
          terkunci: !jendela.terbuka,
        }
      : null,
  };
};

/** Unggah / ganti laporan kelompok (dokumen LAPORAN_AKHIR) — ketua/sekretaris. */
export const uploadLaporanKelompok = async (
  kelompokId: number,
  userId: number,
  file?: Express.Multer.File,
) => {
  const f = assertPdf(file, "laporan kelompok");

  const kelompok = await prisma.kkmKelompok.findUnique({
    where: { id: kelompokId },
    select: {
      id: true,
      periode: {
        select: {
          status: true,
          tgl_penarikan: true,
          deadline_laporan: true,
          jam_laporan_kelompok: true,
        },
      },
      peserta: { select: { user_id: true, jabatan: { select: { id: true, nama: true } } } },
    },
  });
  if (!kelompok) throw new HttpError("Kelompok KKM tidak ditemukan.", 404);

  const saya = kelompok.peserta.find((p) => p.user_id === userId);
  if (!saya) throw new HttpError("Anda bukan anggota kelompok ini.", 403);
  if (!isJabatanPenunggah(saya.jabatan)) {
    throw new HttpError(
      "Hanya Ketua dan Sekretaris kelompok yang dapat mengunggah laporan kelompok.",
      403,
    );
  }

  const { periode } = kelompok;
  const jendela = cekJendelaUpload({
    bukaSetelah: bukaSetelahPenarikan(periode.tgl_penarikan),
    tutupPada: periode.deadline_laporan
      ? atJam(periode.deadline_laporan, periode.jam_laporan_kelompok)
      : null,
    alasanTertutup: periode.tgl_penarikan
      ? `Laporan kelompok dibuka setelah kegiatan KKM selesai (${formatDeadline(
          bukaSetelahPenarikan(periode.tgl_penarikan) as Date,
        )}).`
      : "Jadwal pelaksanaan KKM belum ditentukan, laporan kelompok belum dapat diunggah.",
  });
  if (!jendela.terbuka) {
    throw new HttpError(jendela.alasan ?? "Jendela unggah laporan kelompok tertutup.", 400);
  }

  const existing = await prisma.kkmKelompokDocument.findUnique({
    where: { kelompok_id_document_type: { kelompok_id: kelompokId, document_type: "LAPORAN_AKHIR" } },
  });

  const filePath = `kkm-kelompok/${kelompokId}/LAPORAN_AKHIR/${Date.now()}-${safeFileName(f.originalname)}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, f.buffer, { contentType: f.mimetype, cacheControl: "3600" });
  if (uploadError) {
    throw new HttpError(`Gagal upload ke Supabase: ${uploadError.message}`, 500);
  }

  if (existing) {
    await supabase.storage.from(BUCKET).remove([existing.file_path]);
    await prisma.kkmKelompokDocument.delete({ where: { id: existing.id } });
  }

  const created = await prisma.kkmKelompokDocument.create({
    data: {
      kelompok_id: kelompokId,
      document_type: "LAPORAN_AKHIR",
      title: f.originalname,
      file_path: filePath,
      file_size: f.size,
      mime_type: f.mimetype,
      uploaded_by: userId,
    },
    select: {
      id: true,
      title: true,
      file_path: true,
      file_size: true,
      uploaded_at: true,
    },
  });

  return {
    id: created.id,
    judul: created.title,
    nama: created.file_path.split("/").pop() ?? created.file_path,
    url: fileUrlOf(created.file_path),
    ukuran: created.file_size,
    diunggah_pada: created.uploaded_at.toISOString(),
    deadline_tampil: jendela.deadline_tampil,
  };
};

export type { JabatanKelompokValue };

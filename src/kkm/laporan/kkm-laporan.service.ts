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
import {
  JENIS_LAPORAN,
  JENIS_LABEL,
  STATUS_LABEL,
  alasanTertutupForJenis,
  deadlineOf,
  deriveStatusLaporan,
  jendelaForJenis,
  type JenisLaporan,
} from "./kkm-laporan.shared";

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
 * Status laporan kelompok — seluruh jenis (Awal/Mingguan/Akhir).
 * Setiap jenis punya jendela & deadline sendiri (diatur admin LPPM).
 * Hanya Ketua/Sekretaris yang boleh mengunggah; anggota hanya melihat.
 *
 * Field `jendela`/`bisa_unggah`/`laporan` paling lama tetap ada dan
 * menunjuk jenis LAPORAN_AKHIR (kompatibel dengan konsumen lama).
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
          tgl_pelaksanaan: true,
          tgl_penarikan: true,
          deadline_laporan: true,
          jam_laporan_kelompok: true,
          deadline_laporan_awal: true,
          jam_laporan_awal: true,
          deadline_laporan_mingguan: true,
          jam_laporan_mingguan: true,
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
        where: { document_type: { in: [...JENIS_LAPORAN] } },
        select: {
          id: true,
          document_type: true,
          title: true,
          file_path: true,
          file_size: true,
          mime_type: true,
          uploaded_at: true,
          status_review: true,
          catatan_revisi: true,
          reviewed_at: true,
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
  const jabatan = keanggotaan.jabatan;
  const bolehUnggah = isJabatanPenunggah(jabatan);

  const toBerkas = (doc: (typeof kelompok.documents)[number] | null) =>
    doc
      ? {
          id: doc.id,
          nama: doc.file_path.split("/").pop() ?? doc.file_path,
          judul: doc.title,
          url: fileUrlOf(doc.file_path),
          ukuran: doc.file_size,
          mime: doc.mime_type,
          diunggah_pada: doc.uploaded_at.toISOString(),
          diunggah_oleh: doc.uploader.name,
          terkunci: false,
        }
      : null;

  // Satu entri per jenis laporan: jendela, status review, & berkasnya.
  const daftar = JENIS_LAPORAN.map((jenis: JenisLaporan) => {
    const { bukaSetelah, tutupPada } = jendelaForJenis(periode, jenis);
    const jendela = cekJendelaUpload({
      bukaSetelah,
      tutupPada,
      alasanTertutup: alasanTertutupForJenis(jenis, periode),
    });
    const doc = kelompok.documents.find((d) => d.document_type === jenis) ?? null;
    const deadline = deadlineOf(periode, jenis);
    const status = deriveStatusLaporan(doc, deadline);

    return {
      jenis,
      label: JENIS_LABEL[jenis],
      jendela: {
        ...jendela,
        ditutup_pada: deadline ? jendela.ditutup_pada : null,
        deadline_tampil: deadline ? jendela.deadline_tampil : null,
        tanpa_batas: !deadline,
      },
      bisa_unggah: bolehUnggah && jendela.terbuka,
      status,
      status_label: STATUS_LABEL[status],
      catatan_revisi: doc?.catatan_revisi ?? null,
      reviewed_at: doc?.reviewed_at ? doc.reviewed_at.toISOString() : null,
      laporan: doc
        ? { ...toBerkas(doc)!, terkunci: !jendela.terbuka }
        : null,
    };
  });

  // Kompatibel lama: field tunggal = jenis LAPORAN_AKHIR.
  const akhir = daftar.find((d) => d.jenis === "LAPORAN_AKHIR")!;

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
    daftar,
    jendela: akhir.jendela,
    bisa_unggah: akhir.bisa_unggah,
    ketua: kelompok.peserta
      .filter((p) => p.jabatan?.nama === "KETUA")
      .map((p) => ({ nama: p.user.name, nim: p.user.nidn_nip })),
    sekretaris: kelompok.peserta
      .filter((p) => p.jabatan?.nama === "SEKRETARIS")
      .map((p) => ({ nama: p.user.name, nim: p.user.nidn_nip })),
    laporan: akhir.laporan,
  };
};

/**
 * Unggah / ganti laporan kelompok per jenis (Awal/Mingguan/Akhir) —
 * ketua/sekretaris. Upload ulang menimpa dokumen sejenis dan mereset
 * status review ke MENUNGGU_REVIEW (catatan revisi terakhir dipertahankan).
 */
export const uploadLaporanKelompok = async (
  kelompokId: number,
  userId: number,
  file?: Express.Multer.File,
  jenisRaw?: string,
) => {
  const f = assertPdf(file, "laporan kelompok");

  const jenis = (jenisRaw || "LAPORAN_AKHIR") as JenisLaporan;
  if (!JENIS_LAPORAN.includes(jenis)) {
    throw new HttpError(
      `Jenis laporan tidak valid. Pilihan: ${JENIS_LAPORAN.map((j) => JENIS_LABEL[j]).join(", ")}.`,
      400,
    );
  }

  const kelompok = await prisma.kkmKelompok.findUnique({
    where: { id: kelompokId },
    select: {
      id: true,
      periode: {
        select: {
          status: true,
          tgl_pelaksanaan: true,
          tgl_penarikan: true,
          deadline_laporan: true,
          jam_laporan_kelompok: true,
          deadline_laporan_awal: true,
          jam_laporan_awal: true,
          deadline_laporan_mingguan: true,
          jam_laporan_mingguan: true,
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
  const { bukaSetelah, tutupPada } = jendelaForJenis(periode, jenis);
  const jendela = cekJendelaUpload({
    bukaSetelah,
    tutupPada,
    alasanTertutup: alasanTertutupForJenis(jenis, periode),
  });
  if (!jendela.terbuka) {
    throw new HttpError(jendela.alasan ?? "Jendela unggah laporan kelompok tertutup.", 400);
  }

  const existing = await prisma.kkmKelompokDocument.findUnique({
    where: { kelompok_id_document_type: { kelompok_id: kelompokId, document_type: jenis } },
  });

  const filePath = `kkm-kelompok/${kelompokId}/${jenis}/${Date.now()}-${safeFileName(f.originalname)}`;
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

  // status_review ikut default MENUNGGU_REVIEW (reset hasil review lama);
  // catatan revisi terakhir dipertahankan sebagai referensi sampai review berikutnya.
  const created = await prisma.kkmKelompokDocument.create({
    data: {
      kelompok_id: kelompokId,
      document_type: jenis,
      title: f.originalname,
      file_path: filePath,
      file_size: f.size,
      mime_type: f.mimetype,
      uploaded_by: userId,
      catatan_revisi: existing?.catatan_revisi ?? null,
    },
    select: {
      id: true,
      title: true,
      file_path: true,
      file_size: true,
      uploaded_at: true,
      status_review: true,
    },
  });

  return {
    id: created.id,
    jenis,
    status_review: created.status_review,
    judul: created.title,
    nama: created.file_path.split("/").pop() ?? created.file_path,
    url: fileUrlOf(created.file_path),
    ukuran: created.file_size,
    diunggah_pada: created.uploaded_at.toISOString(),
    deadline_tampil: jendela.deadline_tampil,
  };
};

export type { JabatanKelompokValue };

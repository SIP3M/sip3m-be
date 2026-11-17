/**
 * Seed DEMO flow KKM end-to-end — untuk presentasi & testing internal.
 *
 * Membuat periode demo BARU "KKM REGULER 2026 DEMO" (AKTIF) beserta data
 * flow lengkap: 20 lokasi → 20 kelompok + DPL → 200 peserta (190 VERIFIED
 * terkelompok, 7 PENDING, 3 REJECTED) → jabatan → logbook individu →
 * logbook kelompok minggu 1-2 → dokumen kelompok (5 jenis) → laporan
 * individu → penilaian DPL → pengumuman + notifikasi.
 *
 * File PDF dibuat nyata (pdfkit) dan diunggah ke bucket Supabase
 * `lppm_documents` dengan path yang sama seperti aplikasi, sehingga tombol
 * lihat/unduh berfungsi saat presentasi.
 *
 * Idempoten: aman dijalankan berulang (upsert / cek-ada dulu).
 * Satu-satunya data existing yang diubah: periode AKTIF lain diturunkan
 * menjadi DIJADWALKAN (sistem menjaga tepat 1 periode AKTIF).
 *
 * Pakai:
 *   npx ts-node -r dotenv/config prisma/seed-kkm-demo.ts --dry-run   # rencana saja
 *   npx ts-node -r dotenv/config prisma/seed-kkm-demo.ts             # tulis data
 */
import "dotenv/config";
import PDFDocument from "pdfkit";
import { prisma } from "../src/prisma";
import { supabase } from "../src/config/storage";
import { computeNilaiAkhir } from "../src/kkm/penilaian/kkm-penilaian.service";
import {
  JenisKkm,
  KkmKelompokDocumentType,
  KkmLaporanReviewStatus,
  KkmLogbookStatus,
  KkmPeriodStatus,
  KkmPesertaStatus,
  PengumumanPrioritas,
  PengumumanStatus,
  PengumumanTargetType,
} from "../src/generated/prisma/enums";

const DRY_RUN = process.argv.includes("--dry-run");
const BUCKET = "lppm_documents";

const NAMA_PERIODE = "KKM REGULER 2026 DEMO";
const TAHUN_AKADEMIK = "2025/2026";
const TOTAL_KELOMPOK = 20;
const TOTAL_MAHASISWA = 200;

/** hari ini (seed dirancang untuk demo pada 17 Nov 2026) */
const HARI_INI = new Date(2026, 10, 17);

// ── Akun yang sudah ada di DB ──
const ADMIN_ID = 1; // Admin LPPM (KETUA_LPPM)
const STAFF_ID = 2; // Staff LPPM 1 (reviewer dokumen)

// ── Dosen aktif → DPL (round-robin ke 20 kelompok) ──
const DOSEN_IDS = [4, 5, 6, 7, 8, 9, 726, 729];

// ── Master jabatan (sudah ada di DB) ──
const JABATAN_ANGGOTA = 1;
const JABATAN_KETUA = 2;
const JABATAN_SEKRETARIS = 3;

const tgl = (y: number, m: number, d: number): Date => new Date(y, m - 1, d);
const jam = (dasar: Date, h: number, mnt = 0): Date => {
  const x = new Date(dasar);
  x.setHours(h, mnt, 0, 0);
  return x;
};

// Tanggal periode demo — pelaksanaan 1 Nov s/d 10 Des 2026, hari ini 17 Nov
// = minggu ke-3. logbook hari=Jumat(5) → minggu 1&2 TERKUNCI (berisi data),
// minggu 3 TERBUKA (demo upload live), minggu 4+ BELUM_DIBUKA.
const T = {
  bukaDaftar: tgl(2026, 10, 20),
  tutupDaftar: tgl(2026, 10, 31),
  pembekalan: tgl(2026, 10, 30),
  pelaksanaan: tgl(2026, 11, 1),
  penarikan: tgl(2026, 12, 10),
  deadlineLaporan: tgl(2026, 12, 17),
  laporanAwal: tgl(2026, 11, 8),
  laporanMingguan: tgl(2026, 11, 22),
  laporanIndividu: tgl(2026, 12, 20),
  // unggahan dokumen (waktu)
  uploadProposal: jam(tgl(2026, 10, 28), 9),
  uploadLaporanAwal: jam(tgl(2026, 11, 4), 10),
  uploadLogbookKelompok1: jam(tgl(2026, 11, 5), 21),
  uploadLogbookKelompok2: jam(tgl(2026, 11, 12), 21),
  uploadLaporanMingguan: jam(tgl(2026, 11, 15), 16),
  uploadLaporanAkhir: jam(tgl(2026, 11, 16), 9),
  uploadLaporanIndividu: jam(tgl(2026, 11, 16), 14),
  reviewLaporanAwal: jam(tgl(2026, 11, 5), 11),
  reviewLaporanMingguan: jam(tgl(2026, 11, 16), 10),
  penilaian: jam(tgl(2026, 11, 16), 15),
};

const DESA_LIST: Array<[string, string, string]> = [
  ["Cirebon", "Plumbon", "Karangmulya"],
  ["Cirebon", "Plumbon", "Lurah"],
  ["Cirebon", "Plumbon", "Pamijahan"],
  ["Cirebon", "Weru", "Kalijaga"],
  ["Cirebon", "Weru", "Cilengkrang"],
  ["Cirebon", "Greged", "Cikalahang"],
  ["Cirebon", "Greged", "Cikedang"],
  ["Cirebon", "Pabean", "Bandengan"],
  ["Cirebon", "Kedawung", "Ciawigajah"],
  ["Cirebon", "Kedawung", "Cipeujeuh"],
  ["Cirebon", "Tuk", "Kalikuning"],
  ["Cirebon", "Tuk", "Kertawinangun"],
  ["Cirebon", "Palimanan", "Leuweungseureuh"],
  ["Cirebon", "Palimanan", "Cempaka"],
  ["Cirebon", "Sindanglaut", "Pelayangan"],
  ["Cirebon", "Sindanglaut", "Cisima"],
  ["Cirebon", "Lemahabang", "Watulawang"],
  ["Cirebon", "Jawa", "Cisantana"],
  ["Cirebon", "Jawa", "Benda"],
  ["Cirebon", "Mojongapit", "Sukaluyu"],
];

// ── Util: PDF dummy nyata via pdfkit ──
const makePdf = (judul: string, baris: string[]): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(16).text(judul, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Dokumen DEMO — ${NAMA_PERIODE}`, { align: "center" });
    doc.moveDown();
    for (const b of baris) {
      doc.fontSize(10).text(b, { paragraphGap: 4 });
    }
    doc.moveDown();
    doc.fontSize(8).fillColor("#888888").text(
      "Dokumen ini dihasilkan oleh seed-kkm-demo.ts untuk keperluan presentasi/testing.",
      { align: "center" },
    );
    doc.end();
  });

const uploadPdf = async (path: string, buf: Buffer): Promise<number> => {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: true,
    });
  if (error) throw new Error(`Upload gagal (${path}): ${error.message}`);
  return buf.length;
};

// Deterministik supaya idempoten (pseudo-random dari indeks).
const rand = (i: number, salt: number): number => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const skor = (i: number, salt: number): number => Math.round(55 + rand(i, salt) * 40); // 55–95

// ═══════════════════════════════════════════════════════════
// 1. PERIODE DEMO (baru) + jaga tepat 1 periode AKTIF
// ═══════════════════════════════════════════════════════════
const ensurePeriode = async (): Promise<number> => {
  const existing = await prisma.kkmPeriod.findFirst({
    where: { nama_periode: NAMA_PERIODE, tahun_akademik: TAHUN_AKADEMIK },
    select: { id: true, status: true },
  });

  if (DRY_RUN) {
    console.log(
      existing
        ? `  [dry-run] periode demo sudah ada (#${existing.id}) — akan dipakai ulang`
        : `  [dry-run] akan membuat periode "${NAMA_PERIODE}" (AKTIF)`,
    );
    console.log("  [dry-run] periode AKTIF lain akan diturunkan ke DIJADWALKAN");
    return existing?.id ?? -1;
  }

  let periodeId: number;
  if (existing) {
    periodeId = existing.id;
    // enforceSingleActive — turunkan periode AKTIF lain SEBELUM mengaktifkan
    // (DB punya unique index parsial: tepat 1 baris status=AKTIF)
    const diturunkan = await prisma.kkmPeriod.updateMany({
      where: { status: KkmPeriodStatus.AKTIF, id: { not: periodeId } },
      data: { status: KkmPeriodStatus.DIJADWALKAN },
    });
    if (diturunkan.count > 0) {
      console.log(`  ✓ ${diturunkan.count} periode AKTIF lain → DIJADWALKAN`);
    }
    if (existing.status !== KkmPeriodStatus.AKTIF) {
      await prisma.kkmPeriod.update({
        where: { id: periodeId },
        data: { status: KkmPeriodStatus.AKTIF },
      });
      console.log(`  ✓ periode demo #${periodeId} dikembalikan ke AKTIF`);
    }
  } else {
    // Turunkan dulu periode AKTIF lama (unique index parsial mencegah 2 AKTIF)
    const diturunkan = await prisma.kkmPeriod.updateMany({
      where: { status: KkmPeriodStatus.AKTIF },
      data: { status: KkmPeriodStatus.DIJADWALKAN },
    });
    if (diturunkan.count > 0) {
      console.log(`  ✓ ${diturunkan.count} periode AKTIF lain → DIJADWALKAN`);
    }
    const created = await prisma.kkmPeriod.create({
      data: {
        nama_periode: NAMA_PERIODE,
        tahun_akademik: TAHUN_AKADEMIK,
        tahun: 2026,
        jenis: JenisKkm.REGULER,
        deskripsi:
          "Periode DEMO untuk presentasi flow KKM end-to-end (pendaftaran → kelompok → logbook → laporan → penilaian → pengumuman).",
        tgl_buka_daftar: T.bukaDaftar,
        tgl_tutup_daftar: T.tutupDaftar,
        tgl_pembekalan: T.pembekalan,
        tgl_pelaksanaan: T.pelaksanaan,
        tgl_penarikan: T.penarikan,
        deadline_laporan: T.deadlineLaporan,
        deadline_laporan_awal: T.laporanAwal,
        deadline_laporan_mingguan: T.laporanMingguan,
        deadline_laporan_individu: T.laporanIndividu,
        jam_laporan_awal: "23:59",
        jam_laporan_mingguan: "23:59",
        jam_laporan_kelompok: "23:59",
        jam_laporan_individu: "23:59",
        // Jumat (5) → minggu 3 (15–21 Nov) TERBUKA pada hari ini 17 Nov
        logbook_individu_hari: 5,
        logbook_individu_jam: "23:59",
        logbook_kelompok_hari: 5,
        logbook_kelompok_jam: "23:59",
        target_peserta: TOTAL_MAHASISWA,
        minimal_semester: 7,
        maks_anggota_kelompok: 10,
        status: KkmPeriodStatus.AKTIF,
        created_by: ADMIN_ID,
      },
      select: { id: true },
    });
    periodeId = created.id;
    console.log(`  ✓ periode demo baru #${periodeId} "${NAMA_PERIODE}" dibuat (AKTIF)`);
  }

  // enforceSingleActive — sistem menjaga tepat 1 periode AKTIF
  const diturunkan = await prisma.kkmPeriod.updateMany({
    where: { status: KkmPeriodStatus.AKTIF, id: { not: periodeId } },
    data: { status: KkmPeriodStatus.DIJADWALKAN },
  });
  if (diturunkan.count > 0) {
    console.log(`  ✓ ${diturunkan.count} periode AKTIF lain → DIJADWALKAN`);
  }

  return periodeId;
};

// ═══════════════════════════════════════════════════════════
// 2. LOKASI (20 desa) + KELOMPOK (20) + DPL
// ═══════════════════════════════════════════════════════════
const ensureLokasiKelompok = async (
  periodeId: number,
): Promise<Array<{ id: number; nama: string; dpl_id: number }>> => {
  const hasil: Array<{ id: number; nama: string; dpl_id: number }> = [];

  for (let i = 0; i < TOTAL_KELOMPOK; i++) {
    const [kabupaten, kecamatan, desa] = DESA_LIST[i];
    const dplId = DOSEN_IDS[i % DOSEN_IDS.length];

    if (DRY_RUN) {
      if (i === 0) console.log(`  [dry-run] ${TOTAL_KELOMPOK} lokasi + ${TOTAL_KELOMPOK} kelompok (DPL round-robin ${DOSEN_IDS.length} dosen)`);
      hasil.push({ id: -i - 1, nama: `Kelompok ${String(i + 1).padStart(2, "0")}`, dpl_id: dplId });
      continue;
    }

    const lokasi = await prisma.kkmLocation.upsert({
      where: {
        periode_id_kabupaten_kecamatan_desa: {
          periode_id: periodeId,
          kabupaten,
          kecamatan,
          desa,
        },
      },
      update: { kuota: 10, created_by: ADMIN_ID },
      create: {
        periode_id: periodeId,
        kabupaten,
        kecamatan,
        desa,
        kuota: 10,
        created_by: ADMIN_ID,
      },
      select: { id: true },
    });

    const nama = `Kelompok ${String(i + 1).padStart(2, "0")}`;
    const kelompok = await prisma.kkmKelompok.upsert({
      where: { lokasi_id: lokasi.id },
      update: { nama, dpl_id: dplId, periode_id: periodeId },
      create: { periode_id: periodeId, lokasi_id: lokasi.id, nama, dpl_id: dplId },
      select: { id: true, nama: true, dpl_id: true },
    });

    hasil.push({ id: kelompok.id, nama: kelompok.nama, dpl_id: kelompok.dpl_id ?? dplId });
  }

  if (!DRY_RUN) console.log(`  ✓ ${TOTAL_KELOMPOK} lokasi + ${TOTAL_KELOMPOK} kelompok siap`);

  // Kuota DPL (upsert unik periode_id + dosen_id)
  if (!DRY_RUN) {
    for (const dosenId of DOSEN_IDS) {
      await prisma.kkmDplQuota.upsert({
        where: { periode_id_dosen_id: { periode_id: periodeId, dosen_id: dosenId } },
        update: { maksimal_kelompok: 3 },
        create: { periode_id: periodeId, dosen_id: dosenId, maksimal_kelompok: 3 },
      });
    }
    console.log(`  ✓ kuota DPL untuk ${DOSEN_IDS.length} dosen siap`);
  }

  return hasil;
};

// ═══════════════════════════════════════════════════════════
// 3. PESERTA (200 mahasiswa dummy) — 190 VERIFIED terkelompok,
//    7 PENDING, 3 REJECTED + jabatan KETUA/SEKRETARIS per kelompok
// ═══════════════════════════════════════════════════════════
type PesertaRow = {
  id: number;
  user_id: number;
  kelompok_id: number | null;
  status: KkmPesertaStatus;
};

const ensurePeserta = async (
  periodeId: number,
  kelompok: Array<{ id: number }>,
): Promise<PesertaRow[]> => {
  const nimList = Array.from(
    { length: TOTAL_MAHASISWA },
    (_, i) => `210411${String(i + 1).padStart(3, "0")}`,
  );
  const users = await prisma.users.findMany({
    where: { nidn_nip: { in: nimList } },
    orderBy: { nidn_nip: "asc" },
    select: { id: true },
  });
  if (users.length < TOTAL_MAHASISWA) {
    throw new Error(
      `Mahasiswa dummy kurang: ${users.length}/${TOTAL_MAHASISWA}. Jalankan seed.ts dulu.`,
    );
  }

  // Distribusi: 190 pertama VERIFIED & terkelompok (10 kelompok ×10 + 10 ×9),
  // 7 berikutnya PENDING, 3 terakhir REJECTED.
  const verifiedCount = 190;
  const pendingCount = 7;
  const penugasan = users.slice(0, TOTAL_MAHASISWA).map((u, idx) => {
    if (idx < verifiedCount) {
      const kapasitas = (k: number): number => (k < 10 ? 10 : 9);
      let sisa = idx;
      let ki = 0;
      while (ki < kelompok.length - 1 && sisa >= kapasitas(ki)) {
        sisa -= kapasitas(ki);
        ki += 1;
      }
      return { user_id: u.id, status: KkmPesertaStatus.VERIFIED, kelompok_idx: ki };
    }
    if (idx < verifiedCount + pendingCount) {
      return { user_id: u.id, status: KkmPesertaStatus.PENDING, kelompok_idx: -1 };
    }
    return { user_id: u.id, status: KkmPesertaStatus.REJECTED, kelompok_idx: -1 };
  });

  if (DRY_RUN) {
    console.log(
      `  [dry-run] ${TOTAL_MAHASISWA} peserta: 190 VERIFIED terkelompok, ${pendingCount} PENDING, ${TOTAL_MAHASISWA - verifiedCount - pendingCount} REJECTED`,
    );
    return [];
  }

  const rows: PesertaRow[] = [];
  for (const p of penugasan) {
    const kelompokId = p.kelompok_idx >= 0 ? kelompok[p.kelompok_idx].id : null;
    const row = await prisma.kkmPeserta.upsert({
      where: { periode_id_user_id: { periode_id: periodeId, user_id: p.user_id } },
      update: { status: p.status, kelompok_id: kelompokId, jabatan_id: null },
      create: {
        periode_id: periodeId,
        user_id: p.user_id,
        status: p.status,
        kelompok_id: kelompokId,
        jabatan_id: null,
      },
      select: { id: true, user_id: true, kelompok_id: true, status: true },
    });
    rows.push(row);
  }

  // Jabatan: anggota urut id per kelompok → pertama KETUA, kedua SEKRETARIS
  const byKelompok = new Map<number, PesertaRow[]>();
  for (const r of rows) {
    if (r.kelompok_id === null) continue;
    const list = byKelompok.get(r.kelompok_id) ?? [];
    list.push(r);
    byKelompok.set(r.kelompok_id, list);
  }
  let ketuaCount = 0;
  let sekretarisCount = 0;
  for (const list of byKelompok.values()) {
    list.sort((a, b) => a.id - b.id);
    if (list[0]) {
      await prisma.kkmPeserta.update({
        where: { id: list[0].id },
        data: { jabatan_id: JABATAN_KETUA },
      });
      ketuaCount += 1;
    }
    if (list[1]) {
      await prisma.kkmPeserta.update({
        where: { id: list[1].id },
        data: { jabatan_id: JABATAN_SEKRETARIS },
      });
      sekretarisCount += 1;
    }
  }

  console.log(
    `  ✓ ${rows.length} peserta, ${ketuaCount} ketua, ${sekretarisCount} sekretaris (ANGGOTA=id ${JABATAN_ANGGOTA} default null di service)`,
  );
  return rows;
};

// ═══════════════════════════════════════════════════════════
// 4. LOGBOOK INDIVIDU (~50 entri, tgl 1–17 Nov, status campuran)
// ═══════════════════════════════════════════════════════════
const JUDUL_LOGBOOK = [
  "Sosialisasi Program Kerja",
  "Penyusunan RAB Kegiatan",
  "Pembuatan Pot Desa",
  "Kerja Bakti Lingkungan",
  "Penyuluhan Kesehatan Ibu & Anak",
  "Pembuatan Papan Informasi Desa",
  "Pendataan Warga Terdampak",
  "Bakti Sosial RT/RW",
];

const ensureLogbookIndividu = async (
  kelompok: Array<{ id: number; dpl_id: number }>,
  peserta: PesertaRow[],
): Promise<void> => {
  const byKelompok = new Map<number, PesertaRow[]>();
  for (const p of peserta) {
    if (p.kelompok_id === null || p.status !== KkmPesertaStatus.VERIFIED) continue;
    const list = byKelompok.get(p.kelompok_id) ?? [];
    list.push(p);
    byKelompok.set(p.kelompok_id, list);
  }

  if (DRY_RUN) {
    console.log("  [dry-run] ~50 logbook individu (APPROVED/REVISI/PENDING, sebagian ber-PDF)");
    return;
  }

  // ~50 entri: 2–3 per kelompok untuk 20 kelompok
  let dibuat = 0;
  let sudah = 0;
  for (const [ki, k] of kelompok.entries()) {
    const anggota = (byKelompok.get(k.id) ?? []).sort((a, b) => a.id - b.id);
    if (anggota.length === 0) continue;
    const jumlah = 2 + (ki % 2); // 2 atau 3 → total 50

    for (let j = 0; j < jumlah; j++) {
      const p = anggota[(ki + j) % anggota.length];
      const hari = 1 + ((ki * 3 + j) % 16); // 1–17 Nov
      const tanggal = tgl(2026, 11, hari);
      const judul = JUDUL_LOGBOOK[(ki + j) % JUDUL_LOGBOOK.length];

      // idempoten: kunci kelompok + user + judul + tanggal
      const ada = await prisma.kkmLogbookEntry.findFirst({
        where: { kelompok_id: k.id, user_id: p.user_id, judul, tanggal },
        select: { id: true },
      });
      if (ada) {
        sudah += 1;
        continue;
      }

      const pola = (ki + j) % 5;
      const status =
        pola < 2
          ? KkmLogbookStatus.APPROVED
          : pola === 2
            ? KkmLogbookStatus.REVISI
            : KkmLogbookStatus.PENDING;
      const direview = status !== KkmLogbookStatus.PENDING;

      let file_path: string | null = null;
      let file_size: number | null = null;
      if ((ki + j) % 2 === 0) {
        const namaFile = `${Date.now()}-${judul.replace(/[^\w]+/g, "-").toLowerCase()}.pdf`;
        file_path = `kkm-logbook/${k.id}/${namaFile}`;
        const buf = await makePdf(judul, [
          `Kelompok: ${k.id}`,
          `Tanggal: ${tanggal.toISOString().slice(0, 10)}`,
          `Kegiatan: ${judul}`,
          "",
          "Deskripsi kegiatan pelaksanaan KKM di desa binaan, dilaksanakan bersama warga setempat.",
          "Dokumen ini merupakan lampiran logbook harian mahasiswa peserta KKM.",
        ]);
        file_size = await uploadPdf(file_path, buf);
      }

      await prisma.kkmLogbookEntry.create({
        data: {
          kelompok_id: k.id,
          user_id: p.user_id,
          tanggal,
          judul,
          deskripsi: `Pelaksanaan ${judul.toLowerCase()} bersama warga desa binaan. Mahasiswa mendokumentasikan proses dan hasil kegiatan.`,
          lokasi_kegiatan: "Desa binaan KKM",
          status,
          file_path,
          file_size,
          catatan_revisi:
            status === KkmLogbookStatus.REVISI
              ? "Foto kegiatan kurang jelas, mohon unggah ulang dengan dokumentasi terbaru."
              : null,
          reviewed_by: direview ? k.dpl_id : null,
          reviewed_at: direview ? jam(tanggal, 20) : null,
        },
      });
      dibuat += 1;
    }
  }

  if (!DRY_RUN) console.log(`  ✓ ${dibuat} logbook individu dibuat, ${sudah} sudah ada sebelumnya`);
};

// ═══════════════════════════════════════════════════════════
// 5. LOGBOOK KELOMPOK — minggu 1 & 2 untuk SEMUA kelompok
//    (minggu 1&2 TERKUNCI berisi data, minggu 3 TERBUKA utk demo live)
// ═══════════════════════════════════════════════════════════
const ensureLogbookKelompok = async (
  periodeId: number,
  kelompok: Array<{ id: number }>,
): Promise<void> => {
  if (DRY_RUN) {
    console.log(`  [dry-run] ${TOTAL_KELOMPOK * 2} logbook kelompok (minggu 1 & 2, PDF nyata)`);
    return;
  }

  const ketuaRows = await prisma.kkmPeserta.findMany({
    where: {
      periode_id: periodeId,
      jabatan_id: JABATAN_KETUA,
      kelompok_id: { not: null },
    },
    select: { user_id: true, kelompok_id: true },
  });
  const ketuaByKelompok = new Map<number, number>();
  for (const r of ketuaRows) {
    if (r.kelompok_id !== null) ketuaByKelompok.set(r.kelompok_id, r.user_id);
  }

  const uploadMingguan = [
    { minggu: 1, waktu: T.uploadLogbookKelompok1 },
    { minggu: 2, waktu: T.uploadLogbookKelompok2 },
  ];

  let dibuat = 0;
  for (const k of kelompok) {
    const uploader = ketuaByKelompok.get(k.id);
    if (uploader === undefined) continue;

    for (const m of uploadMingguan) {
      const buf = await makePdf(`Logbook Kelompok Minggu ke-${m.minggu}`, [
        `Kelompok: #${k.id}`,
        `Minggu ke-${m.minggu} pelaksanaan KKM`,
        `Tanggal unggah: ${m.waktu.toISOString().slice(0, 10)}`,
        "",
        "Rekap kegiatan mingguan kelompok:",
        "- Pertemuan rutin dan pembagian tugas anggota",
        "- Pelaksanaan program kerja di desa binaan",
        "- Dokumentasi kegiatan dan kendala di lapangan",
        "",
        "Disusun oleh Ketua Kelompok dan diverifikasi DPL.",
      ]);
      const namaFile = `${Date.now()}-logbook-minggu-${m.minggu}.pdf`;
      const file_path = `kkm-logbook-kelompok/${k.id}/minggu-${m.minggu}/${namaFile}`;
      const file_size = await uploadPdf(file_path, buf);

      await prisma.kkmLogbookKelompok.upsert({
        where: { kelompok_id_minggu_ke: { kelompok_id: k.id, minggu_ke: m.minggu } },
        update: { file_path, file_size, mime_type: "application/pdf", uploaded_by: uploader },
        create: {
          kelompok_id: k.id,
          periode_id: periodeId,
          minggu_ke: m.minggu,
          file_path,
          file_size,
          mime_type: "application/pdf",
          uploaded_by: uploader,
          created_at: m.waktu,
        },
      });
      dibuat += 1;
    }
  }
  console.log(`  ✓ ${dibuat} logbook kelompok (minggu 1 & 2) siap`);
};

// ═══════════════════════════════════════════════════════════
// 6. DOKUMEN KELOMPOK — 5 jenis × 20 kelompok (PDF nyata)
//    Proposal & Logbook = DISETUJUI; Laporan Awal/Mingguan campuran;
//    Laporan Akhir = MENUNGGU_REVIEW (deadline 17 Des, belum lewat)
// ═══════════════════════════════════════════════════════════
const JENIS_DOKUMEN: KkmKelompokDocumentType[] = [
  KkmKelompokDocumentType.PROPOSAL_PROGRAM_KERJA,
  KkmKelompokDocumentType.LOGBOOK_KELOMPOK,
  KkmKelompokDocumentType.LAPORAN_AWAL,
  KkmKelompokDocumentType.LAPORAN_MINGGUAN,
  KkmKelompokDocumentType.LAPORAN_AKHIR,
];

const JUDUL_DOKUMEN: Record<KkmKelompokDocumentType, string> = {
  [KkmKelompokDocumentType.PROPOSAL_PROGRAM_KERJA]: "Proposal Program Kerja",
  [KkmKelompokDocumentType.LOGBOOK_KELOMPOK]: "Logbook Kelompok",
  [KkmKelompokDocumentType.LAPORAN_AWAL]: "Laporan Awal Kegiatan",
  [KkmKelompokDocumentType.LAPORAN_MINGGUAN]: "Laporan Mingguan",
  [KkmKelompokDocumentType.LAPORAN_AKHIR]: "Laporan Akhir Kegiatan",
};

const ensureDokumenKelompok = async (
  kelompok: Array<{ id: number }>,
): Promise<void> => {
  if (DRY_RUN) {
    console.log(`  [dry-run] ${TOTAL_KELOMPOK * JENIS_DOKUMEN.length} dokumen kelompok (PDF nyata, status review bervariasi)`);
    return;
  }

  const ketuaRows = await prisma.kkmPeserta.findMany({
    where: { jabatan_id: JABATAN_KETUA, kelompok_id: { not: null } },
    select: { user_id: true, kelompok_id: true },
  });
  const ketuaByKelompok = new Map<number, number>();
  for (const r of ketuaRows) {
    if (r.kelompok_id !== null) ketuaByKelompok.set(r.kelompok_id, r.user_id);
  }

  let dibuat = 0;
  for (const [ki, k] of kelompok.entries()) {
    const uploader = ketuaByKelompok.get(k.id);
    if (uploader === undefined) continue;

    for (const jenis of JENIS_DOKUMEN) {
      const judul = `${JUDUL_DOKUMEN[jenis]} — Kelompok ${String(ki + 1).padStart(2, "0")}`;

      // status review bervariasi per jenis & indeks kelompok
      let status: KkmLaporanReviewStatus;
      let catatan: string | null = null;
      let reviewed_by: number | null = null;
      let reviewed_at: Date | null = null;

      if (jenis === KkmKelompokDocumentType.PROPOSAL_PROGRAM_KERJA) {
        status = KkmLaporanReviewStatus.DISETUJUI;
        reviewed_by = STAFF_ID;
        reviewed_at = T.uploadProposal;
      } else if (jenis === KkmKelompokDocumentType.LOGBOOK_KELOMPOK) {
        status = KkmLaporanReviewStatus.DISETUJUI;
        reviewed_by = STAFF_ID;
        reviewed_at = T.uploadLogbookKelompok2;
      } else if (jenis === KkmKelompokDocumentType.LAPORAN_AWAL) {
        // deadline 8 Nov (lampau) → wajib sudah direview: campuran
        const pola = ki % 3;
        status =
          pola === 0
            ? KkmLaporanReviewStatus.DISETUJUI
            : pola === 1
              ? KkmLaporanReviewStatus.REVISI
              : KkmLaporanReviewStatus.DISETUJUI;
        if (pola === 1) catatan = "Bagian latar belakang perlu diperjelas dengan data desa terbaru.";
        reviewed_by = pola === 1 ? STAFF_ID : ADMIN_ID;
        reviewed_at = T.reviewLaporanAwal;
      } else if (jenis === KkmKelompokDocumentType.LAPORAN_MINGGUAN) {
        // deadline 22 Nov (masa depan) → masih ada yang menunggu review
        const pola = ki % 3;
        if (pola === 0) {
          status = KkmLaporanReviewStatus.DISETUJUI;
          reviewed_by = ADMIN_ID;
          reviewed_at = T.reviewLaporanMingguan;
        } else if (pola === 1) {
          status = KkmLaporanReviewStatus.REVISI;
          catatan = "Lampiran foto kegiatan belum lengkap, mohon dilengkapi.";
          reviewed_by = STAFF_ID;
          reviewed_at = T.reviewLaporanMingguan;
        } else {
          status = KkmLaporanReviewStatus.MENUNGGU_REVIEW;
        }
      } else {
        // LAPORAN_AKHIR — semua MENUNGGU_REVIEW
        status = KkmLaporanReviewStatus.MENUNGGU_REVIEW;
      }

      const buf = await makePdf(judul, [
        `Kelompok: #${k.id}`,
        `Jenis dokumen: ${JUDUL_DOKUMEN[jenis]}`,
        "",
        "Isi dokumen program kerja/laporan kegiatan KKM di desa binaan.",
        "Dokumen ini merupakan berkas demo untuk pengujian fitur review laporan.",
        "",
        `Status review: ${status}`,
      ]);
      const namaFile = `${Date.now()}-${JUDUL_DOKUMEN[jenis].replace(/[^\w]+/g, "-").toLowerCase()}.pdf`;
      const file_path = `kkm-kelompok/${k.id}/${jenis}/${namaFile}`;
      const file_size = await uploadPdf(file_path, buf);

      await prisma.kkmKelompokDocument.upsert({
        where: { kelompok_id_document_type: { kelompok_id: k.id, document_type: jenis } },
        update: {
          title: judul,
          file_path,
          file_size,
          mime_type: "application/pdf",
          uploaded_by: uploader,
          status_review: status,
          catatan_revisi: catatan,
          reviewed_by,
          reviewed_at,
        },
        create: {
          kelompok_id: k.id,
          document_type: jenis,
          title: judul,
          file_path,
          file_size,
          mime_type: "application/pdf",
          uploaded_by: uploader,
          uploaded_at:
            jenis === KkmKelompokDocumentType.PROPOSAL_PROGRAM_KERJA
              ? T.uploadProposal
              : jenis === KkmKelompokDocumentType.LAPORAN_AWAL
                ? T.uploadLaporanAwal
                : jenis === KkmKelompokDocumentType.LAPORAN_MINGGUAN
                  ? T.uploadLaporanMingguan
                  : jenis === KkmKelompokDocumentType.LAPORAN_AKHIR
                    ? T.uploadLaporanAkhir
                    : T.uploadLogbookKelompok2,
          status_review: status,
          catatan_revisi: catatan,
          reviewed_by,
          reviewed_at,
        },
      });
      dibuat += 1;
    }
  }
  console.log(`  ✓ ${dibuat} dokumen kelompok siap`);
};

// ═══════════════════════════════════════════════════════════
// 7. LAPORAN INDIVIDU — ~60 peserta (PDF nyata)
// ═══════════════════════════════════════════════════════════
const ensureLaporanIndividu = async (
  periodeId: number,
  peserta: PesertaRow[],
): Promise<void> => {
  if (DRY_RUN) {
    console.log("  [dry-run] 60 laporan individu (PDF nyata)");
    return;
  }
  const verified = peserta
    .filter((p) => p.status === KkmPesertaStatus.VERIFIED)
    .sort((a, b) => a.id - b.id);
  // 60 pertama sudah mengunggah
  const target = verified.slice(0, 60);

  let dibuat = 0;
  for (const p of target) {
    const buf = await makePdf("Laporan Individu KKM", [
      `Peserta: user #${p.user_id}`,
      `Periode: ${NAMA_PERIODE}`,
      "",
      "Laporan individu berisi uraian kegiatan, peran, dan refleksi mahasiswa",
      "selama mengikuti Kuliah Kerja Masyarakat di desa binaan.",
      "",
      "Dokumen demo untuk pengujian fitur review laporan individu.",
    ]);
    const namaFile = `${Date.now()}-laporan-individu.pdf`;
    const file_path = `kkm-laporan-individu/${p.id}/${namaFile}`;
    const file_size = await uploadPdf(file_path, buf);

    await prisma.kkmLaporanIndividu.upsert({
      where: { peserta_id: p.id },
      update: { file_path, file_size, mime_type: "application/pdf" },
      create: {
        peserta_id: p.id,
        periode_id: periodeId,
        file_path,
        file_size,
        mime_type: "application/pdf",
        uploaded_by: p.user_id,
        uploaded_at: T.uploadLaporanIndividu,
      },
    });
    dibuat += 1;
  }
  console.log(`  ✓ ${dibuat} laporan individu siap`);
};

// ═══════════════════════════════════════════════════════════
// 8. PENILAIAN — ~150 peserta dinilai DPL (is_saved, pakai
//    computeNilaiAkhir ASLI supaya bobot & grade A–E konsisten)
// ═══════════════════════════════════════════════════════════
const ensurePenilaian = async (
  kelompok: Array<{ id: number; dpl_id: number }>,
  peserta: PesertaRow[],
): Promise<void> => {
  if (DRY_RUN) {
    console.log("  [dry-run] 150 penilaian DPL (is_saved=true, grade via computeNilaiAkhir)");
    return;
  }
  const dplByKelompok = new Map<number, number>();
  for (const k of kelompok) dplByKelompok.set(k.id, k.dpl_id);

  const verified = peserta
    .filter((p) => p.status === KkmPesertaStatus.VERIFIED && p.kelompok_id !== null)
    .sort((a, b) => a.id - b.id);
  // 150 pertama sudah dinilai & tersimpan, sisanya belum
  const target = verified.slice(0, 150);

  let dibuat = 0;
  for (const [i, p] of target.entries()) {
    const dplId = p.kelompok_id !== null ? dplByKelompok.get(p.kelompok_id) : undefined;
    const komponen = {
      kehadiran: skor(i, 1),
      keaktifan: skor(i, 2),
      logbook: skor(i, 3),
      program_kerja: skor(i, 4),
      laporan: skor(i, 5),
      sikap: skor(i, 6),
    };
    const { nilai_akhir, grade } = computeNilaiAkhir(komponen);

    await prisma.kkmPenilaian.upsert({
      where: { peserta_id: p.id },
      update: {
        ...komponen,
        nilai_akhir,
        grade,
        is_saved: true,
        dinilai_oleh: dplId ?? null,
        dinilai_at: T.penilaian,
        catatan_dpl:
          grade === "A"
            ? "Sangat aktif dan disiplin selama pelaksanaan KKM."
            : grade === "E"
              ? "Perlu peningkatan kehadiran dan keaktifan."
              : null,
      },
      create: {
        peserta_id: p.id,
        ...komponen,
        nilai_akhir,
        grade,
        is_saved: true,
        dinilai_oleh: dplId ?? null,
        dinilai_at: T.penilaian,
        catatan_dpl:
          grade === "A"
            ? "Sangat aktif dan disiplin selama pelaksanaan KKM."
            : grade === "E"
              ? "Perlu peningkatan kehadiran dan keaktifan."
              : null,
      },
    });
    dibuat += 1;
  }
  console.log(`  ✓ ${dibuat} penilaian DPL tersimpan (sisanya ${verified.length - dibuat} belum dinilai)`);
};

// ═══════════════════════════════════════════════════════════
// 9. PENGUMUMAN — 3 PUBLISHED (1 pinned) + 1 SCHEDULED,
//    recipients = createMany skipDuplicates + fan-out Notifications
//    (pola publishToRecipients di kkm-pengumuman.service.ts)
// ═══════════════════════════════════════════════════════════
type PengumumanSeed = {
  judul: string;
  isi: string;
  kategori: string;
  prioritas: PengumumanPrioritas;
  status: PengumumanStatus;
  pinned?: boolean;
  published_at?: Date;
  scheduled_at?: Date;
  target: { target_type: PengumumanTargetType; ref_id: number | null };
};

const excerpt = (isi: string): string => {
  const flat = isi.replace(/\s+/g, " ").trim();
  return flat.length <= 150 ? flat : `${flat.slice(0, 149)}…`;
};

const ensurePengumuman = async (
  periodeId: number,
  userIds: number[],
): Promise<void> => {
  const daftar: PengumumanSeed[] = [
    {
      judul: "Pembekalan KKM REGULER 2026 — 30 Oktober 2026",
      isi: "Seluruh peserta KKM wajib mengikuti pembekalan pada 30 Oktober 2026 pukul 08.00 di Aula LPPM. Kehadiran penuh menjadi syarat verifikasi akhir.",
      kategori: "Pembekalan",
      prioritas: PengumumanPrioritas.PENTING,
      status: PengumumanStatus.PUBLISHED,
      pinned: true,
      published_at: T.pembekalan,
      target: { target_type: PengumumanTargetType.PESERTA, ref_id: null },
    },
    {
      judul: "Penempatan Kelompok & DPL Telah Terbit",
      isi: "Penempatan 20 kelompok KKM beserta dosen pendamping (DPL) telah ditetapkan. Silakan periksa kelompok dan DPL Anda melalui menu KKM.",
      kategori: "Penempatan",
      prioritas: PengumumanPrioritas.SEDANG,
      status: PengumumanStatus.PUBLISHED,
      published_at: jam(tgl(2026, 11, 1), 9),
      target: { target_type: PengumumanTargetType.PERIODE, ref_id: periodeId },
    },
    {
      judul: "Deadline Logbook Minggu ke-3 — Jumat 20 November 2026",
      isi: "Logbook minggu ke-3 harus diunggah paling lambat Jumat 20 November 2026 pukul 23.59. Setelah deadline, minggu tersebut terkunci permanen dan tidak dapat diunggah lagi.",
      kategori: "Deadline",
      prioritas: PengumumanPrioritas.PENTING,
      status: PengumumanStatus.PUBLISHED,
      published_at: jam(HARI_INI, 8),
      target: { target_type: PengumumanTargetType.PESERTA, ref_id: null },
    },
    {
      judul: "Jadwal Review Laporan Mingguan Oleh DPL",
      isi: "Review laporan mingguan kelompok dijadwalkan pada 22 November 2026. Mohon pastikan dokumen telah diunggah sebelum deadline.",
      kategori: "Jadwal",
      prioritas: PengumumanPrioritas.INFORMASI,
      status: PengumumanStatus.SCHEDULED,
      scheduled_at: jam(tgl(2026, 11, 20), 9),
      target: { target_type: PengumumanTargetType.PERIODE, ref_id: periodeId },
    },
  ];

  if (DRY_RUN) {
    console.log(`  [dry-run] ${daftar.length} pengumuman (3 PUBLISHED + 1 SCHEDULED, recipients & notifikasi)`);
    return;
  }

  let dibuat = 0;
  for (const p of daftar) {
    const ada = await prisma.pengumuman.findFirst({
      where: { judul: p.judul },
      select: { id: true, status: true },
    });
    if (ada) {
      // fan-out recipients/notifikasi hanya saat belum ada (idempoten)
      if (ada.status === PengumumanStatus.PUBLISHED) {
        const sudahRecipient = await prisma.pengumumanRecipient.count({
          where: { pengumuman_id: ada.id },
        });
        if (sudahRecipient === 0) await fanOut(ada.id, p.judul, p.isi, userIds, p.published_at);
      }
      continue;
    }

    const created = await prisma.pengumuman.create({
      data: {
        judul: p.judul,
        isi: p.isi,
        kategori: p.kategori,
        prioritas: p.prioritas,
        status: p.status,
        published_at: p.status === PengumumanStatus.PUBLISHED ? (p.published_at ?? new Date()) : null,
        scheduled_at: p.scheduled_at ?? null,
        is_pinned: p.pinned ?? false,
        created_by: ADMIN_ID,
      },
      select: { id: true },
    });

    await prisma.pengumumanTarget.createMany({
      data: [{ pengumuman_id: created.id, ...p.target }],
      skipDuplicates: true,
    });

    if (p.status === PengumumanStatus.PUBLISHED) {
      await fanOut(created.id, p.judul, p.isi, userIds, p.published_at);
    }
    dibuat += 1;
  }
  console.log(`  ✓ ${dibuat} pengumuman baru ditambahkan (recipients & notifikasi ikut terfan-out)`);
};

/** Pola publishToRecipients: recipients (skipDuplicates) + notifikasi. */
const fanOut = async (
  pengumumanId: number,
  judul: string,
  isi: string,
  userIds: number[],
  publishedAt?: Date,
): Promise<void> => {
  if (userIds.length === 0) return;
  await prisma.pengumumanRecipient.createMany({
    data: userIds.map((user_id) => ({ pengumuman_id: pengumumanId, user_id })),
    skipDuplicates: true,
  });
  await prisma.notifications.createMany({
    data: userIds.map((user_id) => ({
      user_id,
      title: judul,
      message: excerpt(isi),
      pengumuman_id: pengumumanId,
      created_at: publishedAt ?? new Date(),
    })),
  });
};

// ═══════════════════════════════════════════════════════════
// REKAP — hitungan akhir setelah seed berjalan
// ═══════════════════════════════════════════════════════════
const cetakRekap = async (periodeId: number): Promise<void> => {
  const [
    aktif,
    periode,
    lokasi,
    kelompok,
    peserta,
    anggota,
    logbook,
    logbookKel,
    dokumen,
    laporanInd,
    penilaian,
    pengumuman,
    recipient,
    notif,
  ] = await Promise.all([
    prisma.kkmPeriod.count({ where: { status: KkmPeriodStatus.AKTIF } }),
    prisma.kkmPeriod.findUnique({ where: { id: periodeId }, select: { nama_periode: true, status: true } }),
    prisma.kkmLocation.count({ where: { periode_id: periodeId } }),
    prisma.kkmKelompok.count({ where: { periode_id: periodeId } }),
    prisma.kkmPeserta.groupBy({ by: ["status"], where: { periode_id: periodeId }, _count: true }),
    prisma.kkmPeserta.count({ where: { periode_id: periodeId, kelompok_id: { not: null } } }),
    prisma.kkmLogbookEntry.count({ where: { kelompok: { periode_id: periodeId } } }),
    prisma.kkmLogbookKelompok.count({ where: { periode_id: periodeId } }),
    prisma.kkmKelompokDocument.count({ where: { kelompok: { periode_id: periodeId } } }),
    prisma.kkmLaporanIndividu.count({ where: { periode_id: periodeId } }),
    prisma.kkmPenilaian.count({ where: { peserta: { periode_id: periodeId } } }),
    prisma.pengumuman.count(),
    prisma.pengumumanRecipient.count(),
    prisma.notifications.count({ where: { pengumuman_id: { not: null } } }),
  ]);

  console.log("\n══════════ REKAP DATA DEMO ══════════");
  console.log(`Periode AKTIF total (wajib 1) : ${aktif}`);
  console.log(`Periode demo                  : ${periode?.nama_periode} [${periode?.status}]`);
  console.log(`Lokasi / Kelompok             : ${lokasi} / ${kelompok}`);
  const ringkas = peserta.map((p) => `${p.status}=${p._count}`).join(", ");
  console.log(`Peserta (${ringkas})`);
  console.log(`Anggota terkelompok           : ${anggota}`);
  console.log(`Logbook individu / kelompok   : ${logbook} / ${logbookKel}`);
  console.log(`Dokumen kelompok / laporan ind: ${dokumen} / ${laporanInd}`);
  console.log(`Penilaian tersimpan           : ${penilaian}`);
  console.log(`Pengumuman / recipient / notif: ${pengumuman} / ${recipient} / ${notif}`);
  console.log("════════════════════════════════════\n");
};

async function main(): Promise<void> {
  console.log(`\n${DRY_RUN ? "[DRY-RUN] " : ""}Seed DEMO flow KKM → ${NAMA_PERIODE}\n`);

  console.log("── 1. Periode ──");
  const periodeId = await ensurePeriode();

  console.log("── 2. Lokasi & Kelompok ──");
  const kelompok = await ensureLokasiKelompok(periodeId);

  console.log("── 3. Peserta & Jabatan ──");
  const peserta = await ensurePeserta(periodeId, kelompok);

  console.log("── 4. Logbook Individu ──");
  await ensureLogbookIndividu(kelompok, peserta);

  console.log("── 5. Logbook Kelompok ──");
  await ensureLogbookKelompok(periodeId, kelompok);

  console.log("── 6. Dokumen Kelompok ──");
  await ensureDokumenKelompok(kelompok);

  console.log("── 7. Laporan Individu ──");
  await ensureLaporanIndividu(periodeId, peserta);

  console.log("── 8. Penilaian ──");
  await ensurePenilaian(kelompok, peserta);

  console.log("── 9. Pengumuman ──");
  const userIds = peserta
    .filter((p) => p.status === KkmPesertaStatus.VERIFIED)
    .map((p) => p.user_id);
  await ensurePengumuman(periodeId, userIds);

  if (DRY_RUN) {
    console.log("\n[dry-run] Selesai — tidak ada data yang ditulis.\n");
    return;
  }

  await cetakRekap(periodeId);
  console.log("Seed demo KKM selesai. 🎉\n");
}

main()
  .catch((err: unknown) => {
    console.error("\nERROR:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

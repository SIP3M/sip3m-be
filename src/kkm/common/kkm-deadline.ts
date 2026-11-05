// =============================================
// Helper jadwal & deadline KKM (bersama)
// ---------------------------------------------
// Kolom `@db.Date` di Prisma dibaca sebagai UTC midnight, jadi semua
// perhitungan tanggal memakai komponen UTC agar konsisten di mesin
// mana pun (dev lokal maupun server deploy).
//
// Kolom `jam_*` disimpan sebagai teks "HH:mm". Nilai jam diinterpretasikan
// sebagai UTC (23:59 -> 23:59Z). Batas selalu bersifat "tidak lebih awal",
// jadi bila ada selisih zona waktu penutupan sedikit lebih longgar.
// =============================================

export const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_JAM = "23:59";

/** Hari ISO-8601: 1 = Senin .. 7 = Minggu. */
export const isoWeekday = (d: Date): number => {
  const wd = d.getUTCDay(); // 0 = Minggu .. 6 = Sabtu
  return wd === 0 ? 7 : wd;
};

/** Normalisasi value `@db.Date` Prisma menjadi UTC midnight. */
export const startOfDateUTC = (date: Date): Date => {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  return new Date(Date.UTC(y, m, d));
};

const DEFAULT_JAM_MENIT = 23 * 60 + 59;

/**
 * Parse teks jam "HH:mm" -> menit sejak tengah malam.
 * Kosong / tidak valid -> 23:59 (batas akhir hari).
 */
export const parseJam = (jam?: string | null): number => {
  if (!jam) return DEFAULT_JAM_MENIT;
  const m = /^(\d{1,2}):(\d{2})$/.exec(jam.trim());
  if (!m) return DEFAULT_JAM_MENIT;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(mi) || h > 23 || mi > 59) {
    return DEFAULT_JAM_MENIT;
  }
  return h * 60 + mi;
};

/** Gabung tanggal (`@db.Date`) + jam ("HH:mm") menjadi satu Date (UTC). */
export const atJam = (date: Date, jam?: string | null): Date => {
  const base = startOfDateUTC(date).getTime();
  return new Date(base + parseJam(jam) * 60 * 1000);
};

/** Nama hari Indonesia dari ISO weekday. */
export const NAMA_HARI: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

// =============================================
// Jadwal logbook kelompok mingguan
// =============================================

export type StatusMinggu = "BELUM_DIBUKA" | "TERBUKA" | "TERKUNCI";

export type MingguLogbookKelompok = {
  minggu_ke: number;
  tanggal_mulai: string; // YYYY-MM-DD
  tanggal_batas: string; // YYYY-MM-DD (akhir jendela minggu ini)
  deadline: string; // ISO datetime (tanggal + jam)
  deadline_tampil: string; // "Senin, 12 Jan 2026 23:59"
  status: StatusMinggu;
};

/**
 * Menghitung jendela mingguan logbook kelompok.
 * - Minggu ke-1 dimulai pada `tgl_pelaksanaan`, minggu terakhir berakhir di `tgl_penarikan`.
 * - Deadline minggu-N = hari (`logbook_kelompok_hari`) pertama dalam jendela minggu itu,
 *   pada jam `logbook_kelompok_jam`. Bila hari tersebut di luar jendela (minggu terakhir
 *   yang lebih pendek), jatuh ke hari terakhir jendela.
 * - Setelah deadline terlampaui minggu itu TERKUNCI permanen (kunci total).
 *
 * Mengembalikan daftar kosong bila jadwal belum diatur admin
 * (`tgl_pelaksanaan` / `tgl_penarikan` / `logbook_kelompok_hari` null).
 */
export const hitungJadwalMingguan = (opts: {
  tgl_pelaksanaan?: Date | null;
  tgl_penarikan?: Date | null;
  logbook_kelompok_hari?: number | null;
  logbook_kelompok_jam?: string | null;
  now?: Date;
}): { minggu_total: number; minggu: MingguLogbookKelompok[] } => {
  const { tgl_pelaksanaan, tgl_penarikan, logbook_kelompok_hari, logbook_kelompok_jam } = opts;
  const now = opts.now ?? new Date();

  if (!tgl_pelaksanaan || !tgl_penarikan || !logbook_kelompok_hari) {
    return { minggu_total: 0, minggu: [] };
  }
  if (logbook_kelompok_hari < 1 || logbook_kelompok_hari > 7) {
    return { minggu_total: 0, minggu: [] };
  }

  const mulai = startOfDateUTC(tgl_pelaksanaan).getTime();
  const akhir = startOfDateUTC(tgl_penarikan).getTime();
  if (akhir < mulai) return { minggu_total: 0, minggu: [] };

  const totalHari = Math.round((akhir - mulai) / DAY_MS) + 1;
  const mingguTotal = Math.ceil(totalHari / 7);
  const jamMs = parseJam(logbook_kelompok_jam) * 60 * 1000;

  const daftar: MingguLogbookKelompok[] = [];

  for (let n = 1; n <= mingguTotal; n += 1) {
    const weekStartMs = mulai + (n - 1) * 7 * DAY_MS;
    const weekEndMs = Math.min(weekStartMs + 6 * DAY_MS, akhir);

    // Offset dari awal minggu menuju hari deadline yang dipilih admin.
    const offsetHari =
      (logbook_kelompok_hari - isoWeekday(new Date(weekStartMs)) + 7) % 7;
    let deadlineMs = weekStartMs + offsetHari * DAY_MS + jamMs;
    // Minggu terakhir bisa lebih pendek — jatuhkan ke hari terakhir jendela.
    if (deadlineMs > weekEndMs + jamMs) deadlineMs = weekEndMs + jamMs;

    const status: StatusMinggu =
      now.getTime() < weekStartMs
        ? "BELUM_DIBUKA"
        : now.getTime() <= deadlineMs
          ? "TERBUKA"
          : "TERKUNCI";

    const tanggalMulai = new Date(weekStartMs);
    const tanggalBatas = new Date(weekEndMs);
    const deadline = new Date(deadlineMs);

    daftar.push({
      minggu_ke: n,
      tanggal_mulai: toTanggalOnly(tanggalMulai),
      tanggal_batas: toTanggalOnly(tanggalBatas),
      deadline: deadline.toISOString(),
      deadline_tampil: formatDeadline(deadline),
      status,
    });
  }

  return { minggu_total: mingguTotal, minggu: daftar };
};

/** Format YYYY-MM-DD dari Date (UTC). */
export const toTanggalOnly = (d: Date): string =>
  `${String(d.getUTCFullYear()).padStart(4, "0")}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

const NAMA_HARI_PANJANG = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

/** "Senin, 12 Januari 2026 23:59" */
export const formatDeadline = (d: Date): string => {
  const hari = NAMA_HARI_PANJANG[d.getUTCDay()];
  const tgl = d.getUTCDate();
  const bulan = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ][d.getUTCMonth()];
  const tahun = d.getUTCFullYear();
  const jam = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  return `${hari}, ${tgl} ${bulan} ${tahun} ${jam}`;
};

// =============================================
// Jendela buka/tutup (laporan & logbook individu)
// =============================================

export type JendelaUpload = {
  terbuka: boolean;
  alasan: string | null;
  dibuka_pada: string | null;
  ditutup_pada: string | null;
  deadline_tampil: string | null;
};

/**
 * Menentukan apakah jendela unggah sedang terbuka.
 *
 * @param opts.bukaSetelah   instan pembuka (null = tidak ada pembuka -> selalu terbuka)
 * @param opts.tutupPada     instan penutup (null = tanpa batas waktu)
 * @param opts.alasanTertutup pesan saat belum dibuka
 */
export const cekJendelaUpload = (opts: {
  now?: Date;
  bukaSetelah?: Date | null;
  tutupPada?: Date | null;
  alasanTertutup?: string;
}): JendelaUpload => {
  const now = opts.now ?? new Date();
  const { bukaSetelah, tutupPada } = opts;

  if (bukaSetelah && now.getTime() <= bukaSetelah.getTime()) {
    return {
      terbuka: false,
      alasan:
        opts.alasanTertutup ??
        `Belum dapat diunggah — dibuka setelah ${formatDeadline(bukaSetelah)}.`,
      dibuka_pada: bukaSetelah.toISOString(),
      ditutup_pada: tutupPada?.toISOString() ?? null,
      deadline_tampil: tutupPada ? formatDeadline(tutupPada) : null,
    };
  }

  if (tutupPada && now.getTime() > tutupPada.getTime()) {
    return {
      terbuka: false,
      alasan: `Deadline sudah lewat (${formatDeadline(tutupPada)}). Unggahan dikunci.`,
      dibuka_pada: bukaSetelah?.toISOString() ?? null,
      ditutup_pada: tutupPada.toISOString(),
      deadline_tampil: formatDeadline(tutupPada),
    };
  }

  return {
    terbuka: true,
    alasan: null,
    dibuka_pada: bukaSetelah?.toISOString() ?? null,
    ditutup_pada: tutupPada?.toISOString() ?? null,
    deadline_tampil: tutupPada ? formatDeadline(tutupPada) : null,
  };
};

/**
 * Instan "setelah tgl_penarikan" = akhir hari penarikan (23:59).
 * Dipakai pembuka jendela laporan (individu & kelompok).
 */
export const bukaSetelahPenarikan = (tgl_penarikan?: Date | null): Date | null =>
  tgl_penarikan ? atJam(tgl_penarikan, DEFAULT_JAM) : null;

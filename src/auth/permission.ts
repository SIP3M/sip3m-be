/**
 * Katalog izin (permission) sistem — sinkron dengan tabel `permissions`
 * (di-seed oleh prisma/seed-permissions.ts).
 *
 * Dipakai oleh requirePermission() di route sebagai konstanta anti-typo.
 * Format kode: `<domain>.<aksi>` (lowercase, titik sebagai pemisah).
 */
export const PERMISSIONS = {
  // ── Manajemen Pengguna ─────────────────────────────────────────────
  PENGGUNA_LIHAT: "pengguna.lihat",
  PENGGUNA_LIHAT_REVIEWER: "pengguna.lihat-reviewer",
  PENGGUNA_TAMBAH: "pengguna.tambah",
  PENGGUNA_EDIT: "pengguna.edit",
  PENGGUNA_HAPUS: "pengguna.hapus",
  PENGGUNA_UBAH_ROLE: "pengguna.ubah-role",
  PENGGUNA_UBAH_STATUS: "pengguna.ubah-status",
  ROLE_KELOLA: "role.kelola",

  // ── Penelitian / Proposal ──────────────────────────────────────────
  PROPOSAL_LIHAT: "proposal.lihat",
  PROPOSAL_LIHAT_DETAIL: "proposal.lihat-detail",
  PROPOSAL_SAYA: "proposal.saya",
  PROPOSAL_STATUS: "proposal.status",
  PROPOSAL_PLOTTING: "proposal.plotting",
  PROPOSAL_REVIEW: "proposal.review",
  PROPOSAL_LIHAT_REVIEW: "proposal.lihat-review",
  PROPOSAL_EXPORT: "proposal.export",

  // ── Pengabdian ─────────────────────────────────────────────────────
  PENGABDIAN_LIHAT: "pengabdian.lihat",
  PENGABDIAN_KELOLA: "pengabdian.kelola",
  PENGABDIAN_MILESTONE: "pengabdian.milestone",
  PENGABDIAN_DOKUMEN: "pengabdian.dokumen",
  PENGABDIAN_EXPORT: "pengabdian.export",

  // ── Keuangan ───────────────────────────────────────────────────────
  KEUANGAN_LIHAT: "keuangan.lihat",
  KEUANGAN_CAIKAN: "keuangan.cairkan",

  // ── Monitoring & Dashboard ─────────────────────────────────────────
  MONITORING_PROYEK_LIHAT: "monitoring.proyek.lihat",
  DASHBOARD_ADMIN: "dashboard.admin",
  DASHBOARD_KKM: "dashboard.kkm",

  // ── Sistem & Master Data ───────────────────────────────────────────
  AUDIT_LIHAT: "audit.lihat",
  AUDIT_EXPORT: "audit.export",
  MASTER_AKADEMIK_KELOLA: "master.akademik.kelola",
  MASTER_REFERENSI_KELOLA: "master.referensi.kelola",
  KKM_JABATAN_KELOLA: "kkm.jabatan.kelola",

  // ── KKM: Periode & Lokasi ──────────────────────────────────────────
  KKM_PERIODE_LIHAT: "kkm.periode.lihat",
  KKM_PERIODE_DETAIL: "kkm.periode.detail",
  KKM_PERIODE_KELOLA: "kkm.periode.kelola",
  KKM_SKEMA_LIHAT: "kkm.skema.lihat",
  KKM_LOKASI_LIHAT: "kkm.lokasi.lihat",
  KKM_LOKASI_KELOLA: "kkm.lokasi.kelola",

  // ── KKM: Peserta & Kelompok ────────────────────────────────────────
  KKM_DPL_LIHAT: "kkm.dpl.lihat",
  KKM_DPL_KELOLA: "kkm.dpl.kelola",
  KKM_PESERTA_LIHAT: "kkm.peserta.lihat",
  KKM_PESERTA_KELOLA: "kkm.peserta.kelola",
  KKM_PESERTA_EXPORT: "kkm.peserta.export",
  KKM_GENERATE_LIHAT: "kkm.generate.lihat",
  KKM_GENERATE_JALANKAN: "kkm.generate.jalankan",
  KKM_KELOMPOK_LIHAT: "kkm.kelompok.lihat",
  KKM_KELOMPOK_DETAIL: "kkm.kelompok.detail",
  KKM_KELOMPOK_SAYA: "kkm.kelompok.saya",
  KKM_KELOMPOK_KELOLA: "kkm.kelompok.kelola",

  // ── KKM: Monitoring, Logbook & Laporan ─────────────────────────────
  KKM_MONITORING_LIHAT: "kkm.monitoring.lihat",
  KKM_LOGBOOK_VALIDASI: "kkm.logbook.validasi",
  KKM_LOGBOOK_LIHAT: "kkm.logbook.lihat",
  KKM_LOGBOOK_SAYA: "kkm.logbook.saya",
  KKM_LOGBOOK_KIRIM: "kkm.logbook.kirim",
  KKM_LOGBOOK_REVIEW: "kkm.logbook.review",
  KKM_LOGBOOK_KELOMPOK_KIRIM: "kkm.logbook-kelompok.kirim",
  KKM_LAPORAN_INDIVIDU: "kkm.laporan.individu",
  KKM_LAPORAN_KELOMPOK: "kkm.laporan.kelompok",
  KKM_PENDAFTARAN: "kkm.pendaftaran",

  // ── KKM: Penilaian & Pengumuman ────────────────────────────────────
  KKM_PENILAIAN_ISI: "kkm.penilaian.isi",
  KKM_PENILAIAN_LIHAT: "kkm.penilaian.lihat",
  KKM_PENGUMUMAN_LIHAT: "kkm.pengumuman.lihat",
  KKM_PENGUMUMAN_KELOLA: "kkm.pengumuman.kelola",

  // ── Profil ─────────────────────────────────────────────────────────
  DOSEN_PROFIL: "dosen.profil",

  // ── Sistem & Konfigurasi (toggle aktif, endpoint menyusul) ─────────
  SISTEM_NOTIFIKASI_KELOLA: "sistem.notifikasi.kelola",
  SISTEM_TEMPLATE_KELOLA: "sistem.template.kelola",
  SISTEM_INTEGRASI_KELOLA: "sistem.integrasi.kelola",
  SISTEM_BACKUP: "sistem.backup",
  SISTEM_KONFIGURASI: "sistem.konfigurasi",
} as const;

export type PermissionKode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Grup tampilan untuk seed & API katalog (urutan tampil di UI). */
export const PERMISSION_GRUPS = [
  "Manajemen Pengguna",
  "Penelitian",
  "Pengabdian",
  "Keuangan",
  "Monitoring & Dashboard",
  "Sistem & Master Data",
  "KKM: Periode & Lokasi",
  "KKM: Peserta & Kelompok",
  "KKM: Logbook & Laporan",
  "KKM: Penilaian & Pengumuman",
  "Akun & Profil",
  "Sistem & Konfigurasi",
] as const;

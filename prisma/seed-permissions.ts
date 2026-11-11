/**
 * Seed katalog Permission (68 izin) + mapping parity role bawaan.
 *
 * Jalankan: npx ts-node -r dotenv/config prisma/seed-permissions.ts
 *
 * Idempotent: upsert per kode, grant replace per role.
 * Mapping grant = persis akses route SEBELUM konversi requireRole →
 * requirePermission (parity 100% — tidak ada perubahan perilaku).
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PERMISSIONS } from "../src/auth/permission";

const prisma = new PrismaClient();

type SeedPermission = {
  kode: string;
  nama: string;
  grup: string;
};

const P = PERMISSIONS;

const PERMISSION_CATALOG: SeedPermission[] = [
  // ── Manajemen Pengguna ─────────────────────────────────────────────
  { kode: P.PENGGUNA_LIHAT, nama: "Lihat Pengguna", grup: "Manajemen Pengguna" },
  { kode: P.PENGGUNA_LIHAT_REVIEWER, nama: "Lihat Daftar Reviewer", grup: "Manajemen Pengguna" },
  { kode: P.PENGGUNA_TAMBAH, nama: "Tambah Pengguna", grup: "Manajemen Pengguna" },
  { kode: P.PENGGUNA_EDIT, nama: "Edit Pengguna", grup: "Manajemen Pengguna" },
  { kode: P.PENGGUNA_HAPUS, nama: "Hapus Pengguna", grup: "Manajemen Pengguna" },
  { kode: P.PENGGUNA_UBAH_ROLE, nama: "Ubah Role Pengguna", grup: "Manajemen Pengguna" },
  { kode: P.PENGGUNA_UBAH_STATUS, nama: "Aktif/Nonaktifkan Pengguna", grup: "Manajemen Pengguna" },
  { kode: P.ROLE_KELOLA, nama: "Kelola Role", grup: "Manajemen Pengguna" },

  // ── Penelitian ─────────────────────────────────────────────────────
  { kode: P.PROPOSAL_LIHAT, nama: "Lihat Proposal", grup: "Penelitian" },
  { kode: P.PROPOSAL_LIHAT_DETAIL, nama: "Lihat Detail Proposal", grup: "Penelitian" },
  { kode: P.PROPOSAL_SAYA, nama: "Buat & Kelola Proposal Saya", grup: "Penelitian" },
  { kode: P.PROPOSAL_STATUS, nama: "Verifikasi Status Proposal", grup: "Penelitian" },
  { kode: P.PROPOSAL_PLOTTING, nama: "Plotting Reviewer", grup: "Penelitian" },
  { kode: P.PROPOSAL_REVIEW, nama: "Review Proposal", grup: "Penelitian" },
  { kode: P.PROPOSAL_LIHAT_REVIEW, nama: "Lihat Hasil Review", grup: "Penelitian" },
  { kode: P.PROPOSAL_EXPORT, nama: "Export Proposal", grup: "Penelitian" },

  // ── Pengabdian ─────────────────────────────────────────────────────
  { kode: P.PENGABDIAN_LIHAT, nama: "Lihat Proyek Pengabdian", grup: "Pengabdian" },
  { kode: P.PENGABDIAN_KELOLA, nama: "Kelola Proyek Pengabdian", grup: "Pengabdian" },
  { kode: P.PENGABDIAN_MILESTONE, nama: "Unggah Dokumen Milestone", grup: "Pengabdian" },
  { kode: P.PENGABDIAN_DOKUMEN, nama: "Verifikasi Dokumen Pengabdian", grup: "Pengabdian" },
  { kode: P.PENGABDIAN_EXPORT, nama: "Export Pengabdian", grup: "Pengabdian" },

  // ── Keuangan ───────────────────────────────────────────────────────
  { kode: P.KEUANGAN_LIHAT, nama: "Lihat Keuangan", grup: "Keuangan" },
  { kode: P.KEUANGAN_CAIKAN, nama: "Input Dana Terealisasi", grup: "Keuangan" },

  // ── Monitoring & Dashboard ─────────────────────────────────────────
  { kode: P.MONITORING_PROYEK_LIHAT, nama: "Monitoring Proyek", grup: "Monitoring & Dashboard" },
  { kode: P.DASHBOARD_ADMIN, nama: "Dashboard Admin", grup: "Monitoring & Dashboard" },
  { kode: P.DASHBOARD_KKM, nama: "Dashboard KKM", grup: "Monitoring & Dashboard" },

  // ── Sistem & Master Data ───────────────────────────────────────────
  { kode: P.AUDIT_LIHAT, nama: "Lihat Audit Log", grup: "Sistem & Master Data" },
  { kode: P.AUDIT_EXPORT, nama: "Export Audit Log", grup: "Sistem & Master Data" },
  { kode: P.MASTER_AKADEMIK_KELOLA, nama: "Kelola Fakultas & Program Studi", grup: "Sistem & Master Data" },
  { kode: P.MASTER_REFERENSI_KELOLA, nama: "Kelola Referensi", grup: "Sistem & Master Data" },
  { kode: P.KKM_JABATAN_KELOLA, nama: "Kelola Jabatan Kelompok", grup: "Sistem & Master Data" },

  // ── KKM: Periode & Lokasi ──────────────────────────────────────────
  { kode: P.KKM_PERIODE_LIHAT, nama: "Lihat Periode KKM", grup: "KKM: Periode & Lokasi" },
  { kode: P.KKM_PERIODE_DETAIL, nama: "Lihat Detail Periode KKM", grup: "KKM: Periode & Lokasi" },
  { kode: P.KKM_PERIODE_KELOLA, nama: "Kelola Periode KKM", grup: "KKM: Periode & Lokasi" },
  { kode: P.KKM_SKEMA_LIHAT, nama: "Lihat Skema KKM", grup: "KKM: Periode & Lokasi" },
  { kode: P.KKM_LOKASI_LIHAT, nama: "Lihat Lokasi/Desa KKM", grup: "KKM: Periode & Lokasi" },
  { kode: P.KKM_LOKASI_KELOLA, nama: "Kelola Lokasi/Desa KKM", grup: "KKM: Periode & Lokasi" },

  // ── KKM: Peserta & Kelompok ────────────────────────────────────────
  { kode: P.KKM_DPL_LIHAT, nama: "Lihat Data DPL", grup: "KKM: Peserta & Kelompok" },
  { kode: P.KKM_DPL_KELOLA, nama: "Kelola Penugasan DPL", grup: "KKM: Peserta & Kelompok" },
  { kode: P.KKM_PESERTA_LIHAT, nama: "Lihat Peserta KKM", grup: "KKM: Peserta & Kelompok" },
  { kode: P.KKM_PESERTA_KELOLA, nama: "Kelola Peserta KKM", grup: "KKM: Peserta & Kelompok" },
  { kode: P.KKM_PESERTA_EXPORT, nama: "Export Peserta KKM", grup: "KKM: Peserta & Kelompok" },
  { kode: P.KKM_GENERATE_LIHAT, nama: "Lihat Generate Kelompok", grup: "KKM: Peserta & Kelompok" },
  { kode: P.KKM_GENERATE_JALANKAN, nama: "Jalankan Generate Kelompok", grup: "KKM: Peserta & Kelompok" },
  { kode: P.KKM_KELOMPOK_LIHAT, nama: "Lihat Kelompok KKM", grup: "KKM: Peserta & Kelompok" },
  { kode: P.KKM_KELOMPOK_DETAIL, nama: "Lihat Detail Kelompok", grup: "KKM: Peserta & Kelompok" },
  { kode: P.KKM_KELOMPOK_SAYA, nama: "Lihat Kelompok Saya", grup: "KKM: Peserta & Kelompok" },
  { kode: P.KKM_KELOMPOK_KELOLA, nama: "Kelola Kelompok KKM", grup: "KKM: Peserta & Kelompok" },

  // ── KKM: Logbook & Laporan ─────────────────────────────────────────
  { kode: P.KKM_MONITORING_LIHAT, nama: "Monitoring KKM", grup: "KKM: Logbook & Laporan" },
  { kode: P.KKM_LOGBOOK_VALIDASI, nama: "Lihat Validasi Logbook", grup: "KKM: Logbook & Laporan" },
  { kode: P.KKM_LOGBOOK_LIHAT, nama: "Lihat Logbook Kelompok", grup: "KKM: Logbook & Laporan" },
  { kode: P.KKM_LOGBOOK_SAYA, nama: "Lihat Logbook Saya", grup: "KKM: Logbook & Laporan" },
  { kode: P.KKM_LOGBOOK_KIRIM, nama: "Kirim Logbook", grup: "KKM: Logbook & Laporan" },
  { kode: P.KKM_LOGBOOK_REVIEW, nama: "Review Logbook", grup: "KKM: Logbook & Laporan" },
  { kode: P.KKM_LOGBOOK_KELOMPOK_KIRIM, nama: "Kirim Logbook Kelompok", grup: "KKM: Logbook & Laporan" },
  { kode: P.KKM_LAPORAN_INDIVIDU, nama: "Laporan Individu", grup: "KKM: Logbook & Laporan" },
  { kode: P.KKM_LAPORAN_KELOMPOK, nama: "Laporan Kelompok", grup: "KKM: Logbook & Laporan" },
  { kode: P.KKM_PENDAFTARAN, nama: "Pendaftaran KKM", grup: "KKM: Logbook & Laporan" },

  // ── KKM: Penilaian & Pengumuman ────────────────────────────────────
  { kode: P.KKM_PENILAIAN_ISI, nama: "Input Penilaian KKM", grup: "KKM: Penilaian & Pengumuman" },
  { kode: P.KKM_PENILAIAN_LIHAT, nama: "Lihat Nilai KKM", grup: "KKM: Penilaian & Pengumuman" },
  { kode: P.KKM_PENGUMUMAN_LIHAT, nama: "Lihat Pengumuman KKM", grup: "KKM: Penilaian & Pengumuman" },
  { kode: P.KKM_PENGUMUMAN_KELOLA, nama: "Kelola Pengumuman KKM", grup: "KKM: Penilaian & Pengumuman" },

  // ── Akun & Profil ──────────────────────────────────────────────────
  { kode: P.DOSEN_PROFIL, nama: "Kelola Profil Dosen", grup: "Akun & Profil" },

  // ── Sistem & Konfigurasi (toggle aktif, endpoint menyusul) ─────────
  { kode: P.SISTEM_NOTIFIKASI_KELOLA, nama: "Kelola Notifikasi", grup: "Sistem & Konfigurasi" },
  { kode: P.SISTEM_TEMPLATE_KELOLA, nama: "Kelola Template", grup: "Sistem & Konfigurasi" },
  { kode: P.SISTEM_INTEGRASI_KELOLA, nama: "Kelola Integrasi", grup: "Sistem & Konfigurasi" },
  { kode: P.SISTEM_BACKUP, nama: "Backup Sistem", grup: "Sistem & Konfigurasi" },
  { kode: P.SISTEM_KONFIGURASI, nama: "Konfigurasi Sistem", grup: "Sistem & Konfigurasi" },
];

// ─── Deskripsi role bawaan ─────────────────────────────────────────────
const ROLE_DESKRIPSI: Record<string, string> = {
  KETUA_LPPM: "Pimpinan LPPM dengan akses manajerial penuh terhadap Penelitian dan KKM.",
  ADMIN_SISTEM: "Administrator teknis sistem: pengguna, konfigurasi, master data, integrasi.",
  STAFF_LPPM: "Staf operasional LPPM untuk verifikasi proposal dan administrasi harian.",
  DOSEN: "Dosen yang mengajukan proposal penelitian dan melaksanakan proyek.",
  REVIEWER: "Penilai internal yang mengevaluasi proposal penelitian yang diajukan.",
  REVIEWER_EKSTERNAL: "Penilai eksternal yang mengevaluasi proposal penelitian yang diajukan.",
  MAHASISWA: "Mahasiswa peserta KKM yang mendaftar, membuat logbook, dan laporan.",
};

// ─── Grant parity: izin per role = akses route sebelum konversi ────────
const ROLE_GRANTS: Record<string, string[]> = {
  KETUA_LPPM: [
    P.PENGGUNA_LIHAT, P.PENGGUNA_LIHAT_REVIEWER, P.PENGGUNA_TAMBAH, P.PENGGUNA_EDIT,
    P.PENGGUNA_HAPUS, P.PENGGUNA_UBAH_ROLE, P.PENGGUNA_UBAH_STATUS,
    P.PROPOSAL_LIHAT, P.PROPOSAL_LIHAT_DETAIL, P.PROPOSAL_STATUS, P.PROPOSAL_PLOTTING,
    P.PROPOSAL_LIHAT_REVIEW, P.PROPOSAL_EXPORT,
    P.PENGABDIAN_LIHAT, P.PENGABDIAN_KELOLA, P.PENGABDIAN_DOKUMEN, P.PENGABDIAN_EXPORT,
    P.KEUANGAN_LIHAT, P.KEUANGAN_CAIKAN,
    P.MONITORING_PROYEK_LIHAT, P.DASHBOARD_ADMIN, P.DASHBOARD_KKM,
    P.KKM_PERIODE_LIHAT, P.KKM_PERIODE_DETAIL, P.KKM_PERIODE_KELOLA, P.KKM_SKEMA_LIHAT,
    P.KKM_LOKASI_LIHAT, P.KKM_LOKASI_KELOLA,
    P.KKM_DPL_LIHAT, P.KKM_DPL_KELOLA,
    P.KKM_PESERTA_LIHAT, P.KKM_PESERTA_KELOLA, P.KKM_PESERTA_EXPORT,
    P.KKM_GENERATE_LIHAT, P.KKM_GENERATE_JALANKAN,
    P.KKM_KELOMPOK_LIHAT, P.KKM_KELOMPOK_DETAIL, P.KKM_KELOMPOK_KELOLA,
    P.KKM_MONITORING_LIHAT, P.KKM_LOGBOOK_VALIDASI, P.KKM_LOGBOOK_LIHAT, P.KKM_LOGBOOK_REVIEW,
    P.KKM_PENGUMUMAN_LIHAT, P.KKM_PENGUMUMAN_KELOLA,
  ],
  STAFF_LPPM: [
    P.PENGGUNA_LIHAT_REVIEWER,
    P.PROPOSAL_LIHAT, P.PROPOSAL_LIHAT_DETAIL, P.PROPOSAL_STATUS, P.PROPOSAL_PLOTTING,
    P.PROPOSAL_LIHAT_REVIEW,
    P.PENGABDIAN_LIHAT, P.PENGABDIAN_KELOLA, P.PENGABDIAN_DOKUMEN,
    P.KEUANGAN_LIHAT, P.DASHBOARD_KKM,
    P.KKM_PERIODE_LIHAT, P.KKM_PERIODE_DETAIL, P.KKM_SKEMA_LIHAT,
    P.KKM_LOKASI_LIHAT, P.KKM_DPL_LIHAT,
    P.KKM_PESERTA_LIHAT, P.KKM_PESERTA_EXPORT,
    P.KKM_GENERATE_LIHAT,
    P.KKM_KELOMPOK_LIHAT, P.KKM_KELOMPOK_DETAIL,
    P.KKM_MONITORING_LIHAT, P.KKM_LOGBOOK_VALIDASI, P.KKM_LOGBOOK_LIHAT, P.KKM_LOGBOOK_REVIEW,
    P.KKM_PENGUMUMAN_LIHAT,
  ],
  ADMIN_SISTEM: [
    P.PENGGUNA_LIHAT, P.PENGGUNA_LIHAT_REVIEWER, P.PENGGUNA_TAMBAH, P.PENGGUNA_EDIT,
    P.PENGGUNA_HAPUS, P.PENGGUNA_UBAH_ROLE, P.PENGGUNA_UBAH_STATUS, P.ROLE_KELOLA,
    P.MASTER_AKADEMIK_KELOLA, P.MASTER_REFERENSI_KELOLA, P.KKM_JABATAN_KELOLA,
    P.AUDIT_LIHAT, P.AUDIT_EXPORT,
    P.KKM_LOKASI_LIHAT, P.KKM_LOKASI_KELOLA,
    P.KKM_DPL_LIHAT, P.KKM_DPL_KELOLA,
    P.KKM_PENGUMUMAN_LIHAT,
    P.SISTEM_NOTIFIKASI_KELOLA, P.SISTEM_TEMPLATE_KELOLA, P.SISTEM_INTEGRASI_KELOLA,
    P.SISTEM_BACKUP, P.SISTEM_KONFIGURASI,
  ],
  DOSEN: [
    P.PROPOSAL_LIHAT_DETAIL, P.PROPOSAL_SAYA, P.PROPOSAL_LIHAT_REVIEW,
    P.PENGABDIAN_LIHAT, P.PENGABDIAN_MILESTONE,
    P.DOSEN_PROFIL,
    P.KKM_KELOMPOK_DETAIL,
    P.KKM_MONITORING_LIHAT, P.KKM_LOGBOOK_VALIDASI, P.KKM_LOGBOOK_LIHAT,
    P.KKM_LOGBOOK_KIRIM, P.KKM_LOGBOOK_REVIEW,
    P.KKM_PENILAIAN_ISI,
  ],
  REVIEWER: [
    P.PROPOSAL_LIHAT, P.PROPOSAL_LIHAT_DETAIL, P.PROPOSAL_STATUS,
    P.PROPOSAL_REVIEW, P.PROPOSAL_LIHAT_REVIEW,
    P.PENGABDIAN_LIHAT,
  ],
  REVIEWER_EKSTERNAL: [
    P.PROPOSAL_LIHAT, P.PROPOSAL_LIHAT_DETAIL, P.PROPOSAL_STATUS,
    P.PROPOSAL_REVIEW, P.PROPOSAL_LIHAT_REVIEW,
    P.PENGABDIAN_LIHAT,
  ],
  MAHASISWA: [
    P.KKM_PERIODE_DETAIL, P.KKM_SKEMA_LIHAT,
    P.KKM_KELOMPOK_SAYA,
    P.KKM_LOGBOOK_SAYA, P.KKM_LOGBOOK_LIHAT, P.KKM_LOGBOOK_KIRIM,
    P.KKM_LOGBOOK_KELOMPOK_KIRIM,
    P.KKM_LAPORAN_INDIVIDU, P.KKM_LAPORAN_KELOMPOK,
    P.KKM_PENDAFTARAN,
    P.KKM_PENILAIAN_LIHAT,
  ],
};

const main = async () => {
  console.log("Seeding permission catalog...");
  let permissionCount = 0;
  for (const perm of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { kode: perm.kode },
      update: { nama: perm.nama, grup: perm.grup },
      create: { kode: perm.kode, nama: perm.nama, grup: perm.grup },
    });
    permissionCount++;
  }
  console.log(`✓ ${permissionCount} permission upserted.`);

  // Bersihkan grant permission untuk kode yang sudah tidak ada di katalog
  // (menjaga idempoten & menghindari izin basi).
  const validKode = PERMISSION_CATALOG.map((p) => p.kode);
  const staleLinks = await prisma.rolePermission.findMany({
    where: { permission: { kode: { notIn: validKode } } },
    select: { id: true },
  });
  if (staleLinks.length > 0) {
    await prisma.rolePermission.deleteMany({
      where: { id: { in: staleLinks.map((l) => l.id) } },
    });
    console.log(`✓ ${staleLinks.length} grant basi dihapus.`);
  }

  for (const [roleName, kodes] of Object.entries(ROLE_GRANTS)) {
    const role = await prisma.roles.findUnique({ where: { roles: roleName } });
    if (!role) {
      console.warn(`⚠ Role "${roleName}" tidak ditemukan — dilewati.`);
      continue;
    }

    const perms = await prisma.permission.findMany({
      where: { kode: { in: kodes } },
      select: { id: true },
    });

    await prisma.rolePermission.deleteMany({ where: { role_id: role.id } });
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ role_id: role.id, permission_id: p.id })),
      skipDuplicates: true,
    });

    // Deskripsi + flag is_system untuk role bawaan
    await prisma.roles.update({
      where: { id: role.id },
      data: {
        deskripsi: ROLE_DESKRIPSI[roleName] ?? role.deskripsi,
        is_system: roleName === "ADMIN_SISTEM" ? true : role.is_system,
      },
    });

    console.log(`✓ ${roleName}: ${perms.length} izin.`);
  }

  console.log("Seed permission selesai.");
};

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

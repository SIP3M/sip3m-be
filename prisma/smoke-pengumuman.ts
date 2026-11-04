/**
 * Smoke test fitur Pengumuman KKM (jalankan: npx ts-node -r dotenv/config prisma/smoke-pengumuman.ts)
 *
 * Menguji: validasi → buat SCHEDULED → cron terbitkan (fan-out notifikasi) →
 * daftar penerima & tandai baca → pembatasan akses → hapus (cascade bersih).
 * Semua data uji dibersihkan di akhir.
 */
import "dotenv/config";
import { prisma } from "../src/prisma";
import { KkmPesertaStatus } from "../src/generated/prisma/enums";
import { HttpError } from "../src/common/errors/http-error";
import { createPengumumanSchema } from "../src/kkm/pengumuman/kkm-pengumuman.validation";
import * as svc from "../src/kkm/pengumuman/kkm-pengumuman.service";

let passed = 0;
const ok = (cond: boolean, label: string) => {
  if (!cond) throw new Error(`GAGAL: ${label}`);
  passed += 1;
  console.log(`  ✓ ${label}`);
};

async function main() {
  // ── 0. Pilih target sempit (kelompok berpeserta paling sedikit) ──
  const kelompokList = await prisma.kkmKelompok.findMany({
    where: { peserta: { some: { status: { not: KkmPesertaStatus.REJECTED } } } },
    select: { id: true, _count: { select: { peserta: true } } },
    take: 50,
  });
  if (kelompokList.length === 0) throw new Error("Tidak ada kelompok berpeserta.");
  const kelompok = kelompokList.reduce((a, b) =>
    a._count.peserta <= b._count.peserta ? a : b,
  );

  const admin = await prisma.users.findFirst({
    where: { roles: { roles: "ADMIN_LPPM" } },
    select: { id: true },
  });
  const createdBy = admin?.id ?? 1;

  const kategori = await prisma.masterReferensi.findFirst({
    where: { jenis: "KATEGORI_PENGUMUMAN", is_aktif: true },
    select: { nama: true },
  });
  if (!kategori) throw new Error("Seed kategori pengumuman tidak ditemukan.");
  ok(true, `kategori master "${kategori.nama}" tersedia`);

  let pengumumanId = 0;

  try {
    // ── 1. Validasi ──
    const kosong = createPengumumanSchema.safeParse({
      judul: "X",
      isi: "Y",
      kategori: kategori.nama,
      targets: "[]",
    });
    ok(!kosong.success, "targets kosong ditolak (400)");

    const jadwalLewat = createPengumumanSchema.safeParse({
      judul: "X",
      isi: "Y",
      kategori: kategori.nama,
      targets: JSON.stringify([{ type: "PESERTA" }]),
      publish_mode: "scheduled",
      scheduled_at: new Date(Date.now() - 60_000).toISOString(),
    });
    ok(!jadwalLewat.success, "jadwal lampau ditolak (400)");

    let kategoriDitolak = false;
    try {
      await svc.createPengumuman(
        createPengumumanSchema.parse({
          judul: "X",
          isi: "Y",
          kategori: "Kategori Ngawur",
          targets: JSON.stringify([{ type: "PESERTA" }]),
        }),
        undefined,
        createdBy,
      );
    } catch (err) {
      kategoriDitolak = err instanceof HttpError && err.statusCode === 400;
    }
    ok(kategoriDitolak, "kategori tak dikenal ditolak (400)");

    let targetKosongDitolak = false;
    try {
      // FAKULTAS yang tidak punya peserta → 0 penerima
      await svc.createPengumuman(
        createPengumumanSchema.parse({
          judul: "X",
          isi: "Y",
          kategori: kategori.nama,
          targets: JSON.stringify([{ type: "FAKULTAS", ref_id: 999999 }]),
        }),
        undefined,
        createdBy,
      );
    } catch (err) {
      targetKosongDitolak = err instanceof HttpError && err.statusCode === 400;
    }
    ok(targetKosongDitolak, "target tanpa penerima ditolak (400)");

    // ── 2. Buat SCHEDULED (belum ada fan-out) ──
    const created = await svc.createPengumuman(
      createPengumumanSchema.parse({
        judul: "SMOKE TEST — Pengumuman Uji",
        isi: "Ini isi pengumuman uji **dengan bold**.",
        kategori: kategori.nama,
        prioritas: "PENTING",
        targets: JSON.stringify([{ type: "KELOMPOK", ref_id: kelompok.id }]),
        publish_mode: "scheduled",
        scheduled_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      }),
      undefined,
      createdBy,
    );
    pengumumanId = created.id;
    ok(created.status === "SCHEDULED", "dibuat berstatus SCHEDULED");
    ok(created.audiens.length > 0, `audiens ter-label: ${created.audiens[0]}`);

    const notifSebelum = await prisma.notifications.count({
      where: { pengumuman_id: pengumumanId },
    });
    ok(notifSebelum === 0, "belum ada notifikasi sebelum terbit");

    // ── 3. Daftar admin ──
    const adminList = await svc.listPengumumanAdmin({ page: 1 });
    ok(
      adminList.data.some((d) => d.id === pengumumanId),
      "muncul di daftar admin",
    );
    ok(adminList.stats.total >= 1, `stats admin: total=${adminList.stats.total}`);

    // ── 4. Cron: jadwat jatuh tempo → terbit + fan-out ──
    await prisma.pengumuman.update({
      where: { id: pengumumanId },
      data: { scheduled_at: new Date(Date.now() - 1000) },
    });
    const terbit = await svc.publishDuePengumuman();
    ok(terbit >= 1, `cron menerbitkan ${terbit} pengumuman`);

    const detail = await svc.getPengumumanDetail(pengumumanId);
    ok(detail.status === "PUBLISHED", "status berubah jadi PUBLISHED");
    ok(
      detail.total_penerima === kelompok._count.peserta || detail.total_penerima >= 1,
      `recipient terisi: ${detail.total_penerima} penerima`,
    );
    ok(detail.dibaca === 0, "statistik dibaca awal 0");

    // ── 5. Sudah terbit → publish ulang ditolak ──
    let sudahTerbit = false;
    try {
      await svc.publishPengumuman(pengumumanId);
    } catch (err) {
      sudahTerbit = err instanceof HttpError && err.statusCode === 400;
    }
    ok(sudahTerbit, "publish ulang ditolak (400)");

    // ── 6. Sisi penerima ──
    const recipient = await prisma.pengumumanRecipient.findFirst({
      where: { pengumuman_id: pengumumanId },
      select: { user_id: true },
    });
    if (!recipient) throw new Error("Tidak ada recipient setelah publish.");
    const penerimaId = recipient.user_id;

    const daftarPenerima = await svc.listPengumumanForUser(penerimaId);
    const item = daftarPenerima.find((d) => d.id === pengumumanId);
    ok(!!item, "muncul di daftar penerima");
    ok(item?.read_at === null, "belum ditandai dibaca");

    const baca = await svc.markPengumumanRead(pengumumanId, penerimaId);
    ok(baca.read_at !== null, "mark-read mengisi read_at");

    const notifBaca = await prisma.notifications.findFirst({
      where: { user_id: penerimaId, pengumuman_id: pengumumanId },
      select: { is_read: true },
    });
    ok(notifBaca?.is_read === true, "notifikasi terkait ikut terbaca");

    const dibacaSekarang = await svc.getPengumumanDetail(pengumumanId);
    ok(dibacaSekarang.dibaca === 1, `statistik dibaca = ${dibacaSekarang.dibaca}`);

    // ── 7. Pembatasan akses: user di luar audiens ──
    const penerimaSet = new Set(
      (
        await prisma.pengumumanRecipient.findMany({
          where: { pengumuman_id: pengumumanId },
          select: { user_id: true },
        })
      ).map((r) => r.user_id),
    );
    const luar = await prisma.users.findFirst({
      where: { id: { notIn: [...penerimaSet] } },
      select: { id: true },
    });
    if (luar) {
      let ditolak = false;
      try {
        await svc.getPengumumanForUser(pengumumanId, luar.id);
      } catch (err) {
        ditolak = err instanceof HttpError && err.statusCode === 403;
      }
      ok(ditolak, "user di luar audiens ditolak (403)");
    }

    // ── 8. Hapus → cascade bersih ──
    await svc.deletePengumuman(pengumumanId);
    const [sisaRow, sisaTarget, sisaRecipient, sisaNotif] = await Promise.all([
      prisma.pengumuman.count({ where: { id: pengumumanId } }),
      prisma.pengumumanTarget.count({ where: { pengumuman_id: pengumumanId } }),
      prisma.pengumumanRecipient.count({ where: { pengumuman_id: pengumumanId } }),
      prisma.notifications.count({ where: { pengumuman_id: pengumumanId } }),
    ]);
    ok(
      sisaRow === 0 && sisaTarget === 0 && sisaRecipient === 0 && sisaNotif === 0,
      `hapus bersih (row/target/recipient/notif = ${sisaRow}/${sisaTarget}/${sisaRecipient}/${sisaNotif})`,
    );
    pengumumanId = 0;
  } finally {
    // pastikan tidak ada sisa data uji
    if (pengumumanId > 0) {
      await prisma.pengumuman.deleteMany({ where: { id: pengumumanId } });
    }
    await prisma.pengumuman.deleteMany({
      where: { judul: { startsWith: "SMOKE TEST" } },
    });
  }

  console.log(`\nSEMUA LULUS — ${passed} asersi berhasil.`);
}

main()
  .catch((err) => {
    console.error("\nERROR:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

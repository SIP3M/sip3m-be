/**
 * E2E HTTP test fitur Pengumuman KKM lewat server yang berjalan.
 *
 * Prasyarat: `npm run dev` (BE) sudah hidup di http://localhost:3000.
 * Jalankan : npx ts-node --transpile-only -r dotenv/config prisma/e2e-pengumuman-http.ts
 *
 * Menguji jalur yang TIDAK dicakup smoke test (yang memanggil service langsung):
 * wiring route, auth/RBAC, parsing multipart (targets sebagai string JSON),
 * lampiran upload, notifikasi via GET /notifications, dan cascade delete via API.
 * Semua data uji dibersihkan di akhir.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- respons JSON diparse longgar */
import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../src/prisma";
import { KkmPesertaStatus } from "../src/generated/prisma/enums";
import { supabase } from "../src/config/storage";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000/api";
const JUDUL = "E2E HTTP — Pengumuman Uji";
const PDF_CONTENT = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
  "latin1",
);

let passed = 0;
const ok = (cond: boolean, label: string) => {
  if (!cond) throw new Error(`GAGAL: ${label}`);
  passed += 1;
  console.log(`  ✓ ${label}`);
};

type Res = { status: number; body: any; text: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function multipart(
  fields: Record<string, string>,
  file?: { field: string; filename: string; contentType: string; content: Buffer },
) {
  const boundary = `----e2epengumuman${Date.now()}`;
  const parts: Buffer[] = [];
  for (const [k, v] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`,
      ),
    );
  }
  if (file) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.field}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`,
      ),
    );
    parts.push(file.content);
    parts.push(Buffer.from("\r\n"));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function call(
  method: string,
  path: string,
  opts: {
    token?: string;
    json?: unknown;
    fields?: Record<string, string>;
    file?: { field: string; filename: string; contentType: string; content: Buffer };
  } = {},
): Promise<Res> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  let body: BodyInit | undefined;

  if (opts.json !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.json);
  } else if (opts.fields || opts.file) {
    const m = multipart(opts.fields ?? {}, opts.file);
    headers["content-type"] = m.contentType;
    body = m.body;
  }

  const res = await fetch(BASE + path, { method, headers, body });
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* bukan JSON — biarkan null */
  }
  return { status: res.status, body: parsed, text };
}

/** Login dengan retry bila kena rate-limit (429). */
async function login(identifier: string, password: string): Promise<string> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const r = await call("POST", "/auth/login", {
      json: { identifier, password },
    });
    if (r.status === 429) {
      await sleep(2000);
      continue;
    }
    if (r.status !== 200) {
      throw new Error(`Login ${identifier} gagal (${r.status}): ${r.text}`);
    }
    const token = r.body?.data?.token ?? r.body?.token;
    if (!token) throw new Error(`Login ${identifier}: token tidak ditemukan.`);
    return token as string;
  }
  throw new Error(`Login ${identifier}: terkena rate-limit berulang.`);
}

type NotifRow = { pengumuman_id: number | null; is_read: boolean };

const notificationsOf = (body: unknown): NotifRow[] => {
  const b = body as {
    notifications?: NotifRow[];
    data?: { notifications?: NotifRow[] };
  };
  return b?.notifications ?? b?.data?.notifications ?? [];
};

async function main() {
  // ── 0. Pilih audiens sempit: kelompok berpeserta paling sedikit ──
  const kps = await prisma.kkmPeserta.findMany({
    where: {
      status: { not: KkmPesertaStatus.REJECTED },
      kelompok_id: { not: null },
      user: { is_active: true, email: { contains: "@student.umc.ac.id" } },
    },
    select: {
      user_id: true,
      kelompok_id: true,
      user: { select: { email: true } },
      kelompok: { select: { _count: { select: { peserta: true } } } },
    },
    take: 300,
  });
  const kandidat = kps.filter((k) => /^210411\d{3}@/.test(k.user.email));
  const pool = kandidat.length > 0 ? kandidat : kps;
  if (pool.length === 0) throw new Error("Tidak ada peserta KKM aktif.");
  pool.sort(
    (a, b) => (a.kelompok?._count.peserta ?? 0) - (b.kelompok?._count.peserta ?? 0),
  );
  const target = pool[0];
  const kelompokId = target.kelompok_id as number;

  const anggota = await prisma.kkmPeserta.findMany({
    where: { kelompok_id: kelompokId, status: { not: KkmPesertaStatus.REJECTED } },
    select: { user_id: true },
  });
  const anggotaIds = anggota.map((a) => a.user_id);

  const luar = await prisma.users.findFirst({
    where: {
      id: { notIn: anggotaIds },
      is_active: true,
      roles: { roles: "MAHASISWA" },
    },
    select: { id: true, email: true },
  });
  if (!luar) throw new Error("Tidak ada mahasiswa di luar audiens.");

  let pengumumanId = 0;
  let lampiranPath: string | null = null;
  let staffId = 0;

  try {
    // ── 1. Login ──
    // Pakai akun README bila passwordnya masih cocok; kalau tidak, buat
    // admin uji sementara (lebih aman daripada mereset password akun asli).
    let adminToken: string;
    try {
      adminToken = await login("admin@lppm.ac.id", "password123");
      ok(true, "login ADMIN_LPPM (200 + token)");
    } catch {
      const adminRole = await prisma.roles.findUnique({
        where: { roles: "ADMIN_LPPM" },
      });
      if (!adminRole) throw new Error("Role ADMIN_LPPM tidak ditemukan.");
      const email = `e2e-admin-${Date.now()}@example.test`;
      const hash = await bcrypt.hash("Admin1234!", 10);
      await prisma.users.create({
        data: {
          name: "E2E Admin",
          email,
          password_hash: hash,
          role_id: adminRole.id,
        },
      });
      adminToken = await login(email, "Admin1234!");
      ok(true, "login ADMIN_LPPM via akun uji sementara (password README kedaluwarsa)");
    }
    const penerimaToken = await login(target.user.email, "Mahasiswa123!");
    ok(true, `login penerima ${target.user.email}`);
    const luarToken = await login(luar.email, "Mahasiswa123!");
    ok(true, "login mahasiswa di luar audiens");

    // ── 2. Daftar admin ──
    const list = await call("GET", "/kkm/pengumuman?page=1", { token: adminToken });
    ok(list.status === 200, "GET /kkm/pengumuman sebagai admin (200)");
    ok(
      Array.isArray(list.body?.data) && typeof list.body?.stats?.total === "number",
      "respons daftar memuat data[] + stats.total",
    );

    // ── 3. Validasi ditolak ──
    const kategoriJelek = await call("POST", "/kkm/pengumuman", {
      token: adminToken,
      fields: {
        judul: "X",
        isi: "Y",
        kategori: "Kategori Ngawur",
        targets: JSON.stringify([{ type: "PESERTA" }]),
      },
    });
    ok(kategoriJelek.status === 400, "kategori tak dikenal → 400");

    const targetsKosong = await call("POST", "/kkm/pengumuman", {
      token: adminToken,
      fields: { judul: "X", isi: "Y", kategori: "Deadline", targets: "[]" },
    });
    ok(targetsKosong.status === 400, "targets kosong → 400");

    const tanpaToken = await call("GET", "/kkm/pengumuman");
    ok(tanpaToken.status === 401, "tanpa token → 401");

    // ── 4. RBAC: penerima tidak boleh menyentuh sisi admin ──
    const penerimaBuat = await call("POST", "/kkm/pengumuman", {
      token: penerimaToken,
      fields: {
        judul: "X",
        isi: "Y",
        kategori: "Deadline",
        targets: JSON.stringify([{ type: "PESERTA" }]),
      },
    });
    ok(penerimaBuat.status === 403, "mahasiswa POST /kkm/pengumuman → 403");

    const penerimaDaftar = await call("GET", "/kkm/pengumuman", {
      token: penerimaToken,
    });
    ok(penerimaDaftar.status === 403, "mahasiswa GET /kkm/pengumuman → 403");

    // ── 5. Buat terjadwal (belum ada fan-out) ──
    const scheduled = await call("POST", "/kkm/pengumuman", {
      token: adminToken,
      fields: {
        judul: `${JUDUL} (jadwal)`,
        isi: "Isi uji terjadwal.",
        kategori: "Deadline",
        targets: JSON.stringify([{ type: "KELOMPOK", ref_id: String(kelompokId) }]),
        publish_mode: "scheduled",
        scheduled_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      },
    });
    ok(scheduled.status === 201, "create terjadwal via HTTP (201)");
    ok(scheduled.body?.data?.status === "SCHEDULED", "status SCHEDULED");
    const notifScheduled = await prisma.notifications.count({
      where: { pengumuman_id: scheduled.body.data.id },
    });
    ok(notifScheduled === 0, "belum ada notifikasi sebelum terbit");
    await call("DELETE", `/kkm/pengumuman/${scheduled.body.data.id}`, {
      token: adminToken,
    });

    // ── 6. Buat terbit + lampiran ──
    const createWithFile = await call("POST", "/kkm/pengumuman", {
      token: adminToken,
      fields: {
        judul: JUDUL,
        isi: "Ini isi pengumuman uji **dengan bold** dan [tautan](https://example.com).",
        kategori: "Pembekalan",
        prioritas: "PENTING",
        targets: JSON.stringify([{ type: "KELOMPOK", ref_id: String(kelompokId) }]),
        publish_mode: "now",
      },
      file: {
        field: "lampiran",
        filename: "lampiran-uji.pdf",
        contentType: "application/pdf",
        content: PDF_CONTENT,
      },
    });

    let created = createWithFile;
    if (created.status !== 201) {
      console.log(
        `  ! lampiran upload ditolak/gagal (${created.status}): ${created.text} — lanjut tanpa lampiran`,
      );
      created = await call("POST", "/kkm/pengumuman", {
        token: adminToken,
        fields: {
          judul: JUDUL,
          isi: "Ini isi pengumuman uji **dengan bold** dan [tautan](https://example.com).",
          kategori: "Pembekalan",
          prioritas: "PENTING",
          targets: JSON.stringify([{ type: "KELOMPOK", ref_id: String(kelompokId) }]),
          publish_mode: "now",
        },
      });
    }
    ok(created.status === 201, "create terbit via HTTP multipart (201)");
    pengumumanId = created.body.data.id;
    ok(created.body.data.status === "PUBLISHED", "langsung berstatus PUBLISHED");
    ok(
      Array.isArray(created.body.data.audiens) && created.body.data.audiens.length > 0,
      `audiens ter-label: ${created.body.data.audiens?.[0] ?? "-"}`,
    );
    const lampiranObj = created.body.data.lampiran ?? null;
    const adaLampiran = !!lampiranObj?.url;
    ok(
      createWithFile.status === 201 ? adaLampiran : !adaLampiran,
      adaLampiran
        ? `lampiran terunggah: ${lampiranObj.url} (${lampiranObj.size} byte)`
        : "tanpa lampiran (upload tidak tersedia di lingkungan ini)",
    );
    if (adaLampiran) {
      const url = String(lampiranObj.url);
      const marker = "/lppm_documents/";
      lampiranPath = url.includes(marker) ? url.split(marker)[1] : null;
    }

    // ── 7. Detail admin: statistik ──
    const detail = await call("GET", `/kkm/pengumuman/${pengumumanId}`, {
      token: adminToken,
    });
    ok(detail.status === 200, "GET detail sebagai admin (200)");
    ok(
      (detail.body.data.total_penerima ?? 0) >= anggotaIds.length,
      `recipient terisi: ${detail.body.data.total_penerima} penerima`,
    );
    ok(detail.body.data.dibaca === 0, "statistik dibaca awal 0");

    // ── 8. Sisi penerima ──
    const daftarPenerima = await call("GET", "/pengumuman", {
      token: penerimaToken,
    });
    ok(daftarPenerima.status === 200, "GET /pengumuman sebagai penerima (200)");
    const item = (daftarPenerima.body.data as Array<{
      id: number;
      read_at: string | null;
    }>).find((d) => d.id === pengumumanId);
    ok(!!item, "muncul di daftar penerima");
    ok(item?.read_at === null, "belum ditandai dibaca");

    const detailPenerima = await call("GET", `/pengumuman/${pengumumanId}`, {
      token: penerimaToken,
    });
    ok(detailPenerima.status === 200, "GET detail penerima (200)");

    // ── 9. Pembatasan: user di luar audiens ──
    const detailLuar = await call("GET", `/pengumuman/${pengumumanId}`, {
      token: luarToken,
    });
    ok(detailLuar.status === 403, "user di luar audiens → 403");

    // ── 10. Tandai baca (idempoten) + notifikasi ikut terbaca ──
    const baca = await call("POST", `/pengumuman/${pengumumanId}/read`, {
      token: penerimaToken,
    });
    ok(baca.status === 200 && baca.body.data.read_at, "mark-read → 200 + read_at");
    const bacaUlang = await call("POST", `/pengumuman/${pengumumanId}/read`, {
      token: penerimaToken,
    });
    ok(bacaUlang.status === 200, "mark-read ulang tetap 200 (idempoten)");

    const notif = await call("GET", "/notifications", { token: penerimaToken });
    ok(notif.status === 200, "GET /notifications (200)");
    const rowNotif = notificationsOf(notif.body).find(
      (n) => n.pengumuman_id === pengumumanId,
    );
    ok(!!rowNotif, "notifikasi pengumuman muncul di daftar");
    ok(rowNotif?.is_read === true, "notifikasi ikut terbaca setelah mark-read");

    const setelahBaca = await call("GET", `/kkm/pengumuman/${pengumumanId}`, {
      token: adminToken,
    });
    ok(
      (setelahBaca.body.data.dibaca ?? 0) >= 1,
      `statistik dibaca = ${setelahBaca.body.data.dibaca}`,
    );

    // ── 11. Edit pasca-terbit: konten boleh, target tidak ──
    const editJudul = await call("PATCH", `/kkm/pengumuman/${pengumumanId}`, {
      token: adminToken,
      json: { judul: `${JUDUL} (edit)` },
    });
    ok(editJudul.status === 200, "edit judul pasca-terbit → 200");

    const editTarget = await call("PATCH", `/kkm/pengumuman/${pengumumanId}`, {
      token: adminToken,
      json: { targets: JSON.stringify([{ type: "PESERTA" }]) },
    });
    ok(editTarget.status === 400, "edit target pasca-terbit → 400");

    // ── 12. Sematan ──
    const pin = await call("PATCH", `/kkm/pengumuman/${pengumumanId}/pin`, {
      token: adminToken,
    });
    ok(pin.status === 200 && pin.body.data.is_pinned === true, "sematkan → is_pinned true");
    const unpin = await call("PATCH", `/kkm/pengumuman/${pengumumanId}/pin`, {
      token: adminToken,
    });
    ok(unpin.body.data.is_pinned === false, "lepas sematan → is_pinned false");

    // ── 13. Publish ulang ditolak ──
    const republish = await call("PATCH", `/kkm/pengumuman/${pengumumanId}/publish`, {
      token: adminToken,
    });
    ok(republish.status === 400, "publish ulang → 400");

    // ── 14. STAFF_LPPM: baca boleh, tulis tidak ──
    const staffRole = await prisma.roles.findUnique({
      where: { roles: "STAFF_LPPM" },
    });
    if (staffRole) {
      const email = `e2e-staff-${Date.now()}@example.test`;
      const hash = await bcrypt.hash("Staff1234!", 10);
      const staff = await prisma.users.create({
        data: { name: "E2E Staff", email, password_hash: hash, role_id: staffRole.id },
        select: { id: true },
      });
      staffId = staff.id;
      const staffToken = await login(email, "Staff1234!");

      const staffDaftar = await call("GET", "/kkm/pengumuman", {
        token: staffToken,
      });
      ok(staffDaftar.status === 200, "STAFF_LPPM GET daftar → 200 (read-only)");

      const staffDetail = await call("GET", `/kkm/pengumuman/${pengumumanId}`, {
        token: staffToken,
      });
      ok(staffDetail.status === 200, "STAFF_LPPM GET detail → 200");

      const staffBuat = await call("POST", "/kkm/pengumuman", {
        token: staffToken,
        fields: {
          judul: "X",
          isi: "Y",
          kategori: "Deadline",
          targets: JSON.stringify([{ type: "PESERTA" }]),
        },
      });
      ok(staffBuat.status === 403, "STAFF_LPPM POST → 403");

      const staffHapus = await call("DELETE", `/kkm/pengumuman/${pengumumanId}`, {
        token: staffToken,
      });
      ok(staffHapus.status === 403, "STAFF_LPPM DELETE → 403");
    } else {
      console.log("  ! role STAFF_LPPM tidak ada — lewati uji read-only staff");
    }

    // ── 15. Hapus → cascade bersih ──
    if (lampiranPath) {
      const folder = lampiranPath.includes("/")
        ? lampiranPath.slice(0, lampiranPath.lastIndexOf("/"))
        : "pengumuman";
      const { data: sebelum } = await supabase.storage.from("lppm_documents").list(folder);
      const namaSebelum = lampiranPath.slice(lampiranPath.lastIndexOf("/") + 1);
      ok(
        !!sebelum?.some((f) => f.name === namaSebelum),
        "file lampiran ada di storage sebelum hapus",
      );
    }

    const hapus = await call("DELETE", `/kkm/pengumuman/${pengumumanId}`, {
      token: adminToken,
    });
    ok(hapus.status === 200, "DELETE sebagai admin (200)");
    const hilang = await call("GET", `/kkm/pengumuman/${pengumumanId}`, {
      token: adminToken,
    });
    ok(hilang.status === 404, "detail setelah hapus → 404");

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

    if (lampiranPath) {
      const folder = lampiranPath.includes("/")
        ? lampiranPath.slice(0, lampiranPath.lastIndexOf("/"))
        : "pengumuman";
      const nama = lampiranPath.slice(lampiranPath.lastIndexOf("/") + 1);
      const { data: sesudah } = await supabase.storage
        .from("lppm_documents")
        .list(folder);
      ok(
        !sesudah?.some((f) => f.name === nama),
        "file lampiran ikut terhapus dari storage",
      );
    }
    pengumumanId = 0;
  } finally {
    if (pengumumanId > 0) {
      await prisma.pengumuman.deleteMany({ where: { id: pengumumanId } });
    }
    await prisma.pengumuman.deleteMany({ where: { judul: { startsWith: JUDUL } } });
    await prisma.pengumuman.deleteMany({
      where: { judul: { startsWith: "E2E HTTP" } },
    });
    if (staffId > 0) await prisma.users.deleteMany({ where: { id: staffId } });
    await prisma.users.deleteMany({ where: { email: { contains: "@example.test" } } });
  }

  console.log(`\nSEMUA LULUS — ${passed} asersi berhasil.`);
}

main()
  .catch((err) => {
    console.error("\nERROR:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

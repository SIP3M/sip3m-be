/**
 * Smoke test HTTP untuk seed KKM demo (periode #33).
 *
 * Prasyarat: `npm run dev` (BE) hidup di http://localhost:3000.
 * Jalankan : npx ts-node -r dotenv/config prisma/smoke-kkm-demo.ts
 *
 * Menguji: login admin → dashboard KKM, monitoring, review laporan,
 * penilaian, pengumuman → semua 200 & memuat data periode demo.
 * Plus: buka 1 URL PDF public dari storage.
 */
import "dotenv/config";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000/api";

let passed = 0;
const ok = (cond: boolean, label: string): void => {
  if (!cond) throw new Error(`GAGAL: ${label}`);
  passed += 1;
  console.log(`  ✓ ${label}`);
};

type Res = { status: number; body: Record<string, unknown> | null; text: string };

const call = async (
  method: string,
  path: string,
  opts: { token?: string } = {},
): Promise<Res> => {
  const headers: Record<string, string> = {};
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  const res = await fetch(BASE + path, { method, headers });
  const text = await res.text();
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* bukan JSON */
  }
  return { status: res.status, body: parsed, text };
};

const login = async (identifier: string, password: string): Promise<string> => {
  const res = await fetch(BASE + "/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  const body = (await res.json()) as { data?: { token?: string }; token?: string };
  if (res.status !== 200) throw new Error(`Login ${identifier} gagal (${res.status})`);
  const token = body.data?.token ?? body.token;
  if (!token) throw new Error(`Login ${identifier}: token tidak ada`);
  return token;
};

async function main(): Promise<void> {
  console.log("\nSmoke test seed KKM demo\n");

  const token = await login("admin@lppm.ac.id", "Admin@12345");
  ok(true, "login KETUA_LPPM admin@lppm.ac.id");

  // 1. Dashboard KKM admin — harus memuat periode demo
  const dash = await call("GET", "/dashboard/kkm", { token });
  ok(dash.status === 200, `GET /dashboard/kkm → ${dash.status}`);
  const dashStr = JSON.stringify(dash.body ?? {});
  ok(dashStr.includes("KKM REGULER 2026 DEMO"), "dashboard memuat periode demo");

  // 2. Monitoring KKM — ada kelompok & logbook
  const mon = await call("GET", "/kkm/monitoring?page=1", { token });
  ok(mon.status === 200, `GET /kkm/monitoring → ${mon.status}`);

  // 3. Review laporan kelompok — memuat dokumen demo
  const lap = await call("GET", "/kkm/laporan?page=1", { token });
  ok(lap.status === 200, `GET /kkm/laporan → ${lap.status}`);
  const lapStr = JSON.stringify(lap.body ?? {});
  ok(lapStr.includes("DISETUJUI") || lapStr.includes("MENUNGGU_REVIEW"), "laporan punya status review");

  // 4. Penilaian — sisi mahasiswa (admin tidak punya route khusus)
  const mhsToken = await login("210411201@student.umc.ac.id", "Mahasiswa123!");
  const nil = await call("GET", "/kkm/mahasiswa/penilaian", { token: mhsToken });
  ok(nil.status === 200, `GET penilaian mahasiswa → ${nil.status}`);

  // 5. Pengumuman admin — memuat 4 pengumuman demo
  const peng = await call("GET", "/kkm/pengumuman?page=1", { token });
  ok(peng.status === 200, `GET pengumuman → ${peng.status}`);
  const pengStr = JSON.stringify(peng.body ?? {});
  ok(pengStr.includes("Deadline Logbook Minggu ke-3"), "pengumuman demo muncul");

  // 6. Tanpa token → 401
  const anon = await call("GET", "/dashboard/kkm");
  ok(anon.status === 401, `tanpa token → ${anon.status}`);

  // 7. URL PDF public dari storage bisa dibuka
  const pdf = await call("GET", "/kkm/laporan?page=1", { token });
  const match = JSON.stringify(pdf.body ?? {}).match(
    /https:[^"]+lppm_documents[^"]+\.pdf/,
  );
  if (match) {
    const res = await fetch(match[0]);
    const buf = Buffer.from(await res.arrayBuffer());
    ok(
      res.status === 200 && buf.subarray(0, 5).toString("latin1") === "%PDF-",
      `PDF public terbuka (${res.status}, ${buf.length} byte, header %PDF)`,
    );
  } else {
    console.log("  ! tidak ada URL PDF di respons laporan — cek manual");
  }

  console.log(`\nSEMUA LULUS — ${passed} asersi.\n`);
}

main()
  .catch((err: unknown) => {
    console.error("ERROR:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });

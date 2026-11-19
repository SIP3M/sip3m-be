import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
// Type-only — dihapus saat compile, tidak menjadi require() saat runtime.
// Package puppeteer-core ESM-only, jadi modulnya dimuat lewat dynamic import()
// di dalam openSession() (lihat catatan di sana).
import type { Page } from "puppeteer-core";

/**
 * Daftar dosen PDDikti (https://pddikti.kemdiktisaintek.go.id).
 *
 * Semua endpoint API-nya (https://api-pddikti.kemdiktisaintek.go.id/api)
 * dilindungi reCAPTCHA v3 header `X-Recaptcha-Token`. Token yang dibuat
 * di luar konteks situsnya selalu ditolak, jadi satu-satunya cara andal
 * adalah: buka situs PDDikti di headless browser, lalu SEMPIL token dari
 * request pertama yang dibuat SPA-nya sendiri. Token itu ternyata bisa
 * dipakai ulang untuk fetch biasa dari Node (teruji sampai ~10 detik;
 * masa berlaku reCAPTCHA ±2 menit), sehingga cukup SATU kali buka halaman
 * per sinkronisasi.
 *
 * Browser dideteksi saat runtime (Edge/Chrome/Chromium). Jika tidak ada
 * (mis. di serverless seperti Vercel), sinkronisasi dilewati dengan aman —
 * data lama tetap disajikan (fallback).
 */

const API_BASE = "https://api-pddikti.kemdiktisaintek.go.id/api";
const SITE_ORIGIN = "https://pddikti.kemdiktisaintek.go.id";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const NAV_TIMEOUT_MS = 60_000;
const TOKEN_WAIT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;
const REQUEST_DELAY_MS = 150;

const DEFAULT_PT_KEYWORD = "Universitas Muhammadiyah Cirebon";

const BROWSER_CANDIDATES: Array<string | undefined> = [
  process.env.PDDIKTI_BROWSER_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

export class PddiktiBrowserUnavailableError extends Error {
  constructor() {
    super(
      "Browser (Edge/Chrome/Chromium) tidak ditemukan di server — " +
        "sinkronisasi PDDikti dinonaktifkan. Set PDDIKTI_BROWSER_PATH untuk menentukan lokasi browser.",
    );
    this.name = "PddiktiBrowserUnavailableError";
  }
}

export const findBrowserPath = (): string | null => {
  for (const candidate of BROWSER_CANDIDATES) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  return null;
};

export const isPddiktiSyncAvailable = (): boolean =>
  process.env.PDDIKTI_SYNC_ENABLED !== "false" && findBrowserPath() !== null;

export const getPtKeyword = (): string =>
  process.env.PDDIKTI_PT_KEYWORD?.trim() || DEFAULT_PT_KEYWORD;

export type PddiktiDosenRow = {
  nama: string;
  nidn: string | null;
  nuptk: string | null;
  prodi: string | null;
  jenjang: string | null;
  status_aktif: string | null;
  ikatan_kerja: string | null;
};

export type PddiktiSnapshot = {
  pt: { kode: string | null; nama: string };
  prodiCount: number;
  dosen: PddiktiDosenRow[];
};

type PtSearchItem = { id: string; kode?: string; nama?: string };

type ProdiItem = {
  id_sms: string;
  nama_prodi?: string;
  jenjang_prodi?: string;
  jumlah_dosen?: number;
};

type HomebaseDosenItem = {
  nama_dosen?: string;
  nidn?: string;
  nuptk?: string;
  status_aktif?: string;
  ikatan_kerja?: string;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const clean = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** Normalisasi nama untuk pencocokan & kunci anti-ganda (PDDikti ↔ SINTA). */
export const normalizeNama = (nama: string): string =>
  nama.toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Kunci anti-ganda baris dosen: NIDN → NUPTK → nama ternormalisasi.
 * Dipakai untuk menyatukan dosen ganda lintas prodi saat sinkronisasi.
 */
export const buildDedupeKey = (row: {
  nama: string;
  nidn?: string | null;
  nuptk?: string | null;
}): string =>
  row.nidn
    ? `nidn:${row.nidn}`
    : row.nuptk
      ? `nuptk:${row.nuptk}`
      : `nama:${normalizeNama(row.nama)}`;

// ---------------------------------------------------------------------------
// Sesi browser: buka satu halaman PDDikti, curi token reCAPTCHA dari SPA
// ---------------------------------------------------------------------------

/** Tipe modul puppeteer-core tanpa memuatnya saat runtime. */
type PuppeteerModule = typeof import("puppeteer-core");

/**
 * `import()` asli yang tidak ikut ditranspilasi TypeScript.
 * Dengan module=CommonJS, `await import("x")` dikompilasi jadi
 * `require("x")` — yang ditolak Node lama untuk paket ESM-only.
 */
const dynamicImport = new Function(
  "specifier",
  "return import(specifier);",
) as <T>(specifier: string) => Promise<T>;

type PddiktiSession = {
  page: Page;
  getToken: () => string;
  refreshToken: () => Promise<string>;
  close: () => Promise<void>;
};

const openSession = async (): Promise<PddiktiSession> => {
  const executablePath = findBrowserPath();
  if (!executablePath) throw new PddiktiBrowserUnavailableError();

  // Dynamic import, bukan require(): puppeteer-core adalah ESM-only, dan
  // require(ESM) hanya didukung Node baru (>=20.19/22.12) — runtime Vercel
  // yang lebih tua akan crash dengan ERR_REQUIRE_ESM. Dengan impor di sini,
  // paketnya pun tidak pernah dimuat di server tanpa browser (mis. Vercel).
  // Catatan: fungsi `dynamicImport` dibuat via new Function agar TIDAK ikut
  // ditranspilasi — TypeScript (module=CommonJS) mengecilkan `await import()`
  // menjadi `require()`, yang justru bermasalah untuk paket ESM-only.
  const { default: puppeteer } = await dynamicImport<PuppeteerModule>(
    "puppeteer-core",
  );

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
    ],
    userDataDir: path.join(os.tmpdir(), "sip3m-pddikti-profile"),
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.setViewport({ width: 1366, height: 900 });

    let token: string | null = null;
    const onRequest = (request: { headers: () => Record<string, string> }) => {
      const header = request.headers()["x-recaptcha-token"];
      if (header) token = header;
    };
    page.on("request", onRequest);

    const waitForNewToken = async (previous: string | null): Promise<string> => {
      const deadline = Date.now() + TOKEN_WAIT_MS;
      while (Date.now() < deadline) {
        if (token && token !== previous) return token;
        await sleep(200);
      }
      throw new Error("Token reCAPTCHA PDDikti tidak didapatkan dari situsnya.");
    };

    // Halaman pencarian langsung memicu SPA memanggil API-nya sendiri.
    await page.goto(
      `${SITE_ORIGIN}/search/pt/${encodeURIComponent(getPtKeyword())}`,
      { waitUntil: "networkidle2", timeout: NAV_TIMEOUT_MS },
    );
    await waitForNewToken(null);

    return {
      page,
      getToken: () => {
        if (!token) throw new Error("Token reCAPTCHA PDDikti hilang.");
        return token;
      },
      refreshToken: async () => {
        const previous = token;
        token = null;
        await page.reload({ waitUntil: "networkidle2", timeout: NAV_TIMEOUT_MS });
        return waitForNewToken(previous);
      },
      close: async () => {
        page.off("request", onRequest);
        await browser.close().catch(() => undefined);
      },
    };
  } catch (error) {
    await browser.close().catch(() => undefined);
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Klien API PDDikti (fetch biasa memakai token hasil curian)
// ---------------------------------------------------------------------------

const apiFetch = async (
  session: PddiktiSession,
  pathAndQuery: string,
  body?: unknown,
): Promise<Response> => {
  const url = `${API_BASE}${pathAndQuery}`;
  const doFetch = (token: string): Promise<Response> =>
    fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Recaptcha-Token": token,
        Origin: SITE_ORIGIN,
        Referer: `${SITE_ORIGIN}/`,
        "User-Agent": USER_AGENT,
        "Accept-Language": "id-ID,id;q=0.9",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

  let response = await doFetch(session.getToken());

  // Token kedaluwarsa (403) → segarkan dari SPA, coba ulang satu kali.
  if (response.status === 403) {
    await session.refreshToken();
    response = await doFetch(session.getToken());
  }

  return response;
};

const apiJson = async <T>(
  session: PddiktiSession,
  pathAndQuery: string,
  body?: unknown,
): Promise<T> => {
  const response = await apiFetch(session, pathAndQuery, body);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`PDDikti ${pathAndQuery} gagal (HTTP ${response.status}): ${text.slice(0, 200)}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`PDDikti ${pathAndQuery} membalas bukan JSON.`);
  }
};

// ---------------------------------------------------------------------------
// Alur sinkronisasi
// ---------------------------------------------------------------------------

export const fetchPddiktiSnapshot = async (
  ptKeyword: string = getPtKeyword(),
): Promise<PddiktiSnapshot> => {
  const session = await openSession();

  try {
    const search = await apiJson<{ data?: PtSearchItem[] }>(
      session,
      `/pencarian/pt/${encodeURIComponent(ptKeyword)}`,
    );
    const candidates = search.data ?? [];

    const normalizedKeyword = ptKeyword.trim().toUpperCase();
    const pt =
      candidates.find((item) => (item.nama ?? "").trim().toUpperCase() === normalizedKeyword) ??
      candidates.find((item) => (item.nama ?? "").toUpperCase().includes(normalizedKeyword)) ??
      candidates[0];

    if (!pt) {
      throw new Error(`Perguruan tinggi "${ptKeyword}" tidak ditemukan di PDDikti.`);
    }

    const semester = await apiJson<{ data?: { id_smt?: string } }>(session, "/pt/current-semester");
    const idSemester = semester.data?.id_smt;
    if (!idSemester) throw new Error("Semester aktif PDDikti tidak ditemukan.");

    const prodiRes = await apiJson<{ data?: ProdiItem[] }>(
      session,
      `/pt/prodi/${encodeURIComponent(pt.id)}/${encodeURIComponent(idSemester)}`,
    );
    const prodiList = (prodiRes.data ?? []).filter((prodi) => clean(prodi.id_sms));
    if (prodiList.length === 0) throw new Error("Daftar program studi PDDikti kosong.");

    const rows: PddiktiDosenRow[] = [];
    const seen = new Set<string>();
    let prodiWithData = 0;

    for (const prodi of prodiList) {
      const homebase = await apiJson<{ data?: HomebaseDosenItem[] }>(
        session,
        `/dosen/homebase?semester=${encodeURIComponent(idSemester)}`,
        { id: prodi.id_sms },
      );
      const dosenList = homebase.data ?? [];
      if (dosenList.length > 0) prodiWithData += 1;

      for (const dosen of dosenList) {
        const nama = clean(dosen.nama_dosen);
        if (!nama) continue;

        const nidn = clean(dosen.nidn);
        const nuptk = clean(dosen.nuptk);
        const key = buildDedupeKey({ nama, nidn, nuptk });

        // Satukan dosen ganda lintas prodi (homebase sama) by NIDN.
        if (seen.has(key)) continue;
        seen.add(key);

        rows.push({
          nama,
          nidn,
          nuptk,
          prodi: clean(prodi.nama_prodi),
          jenjang: clean(prodi.jenjang_prodi),
          status_aktif: clean(dosen.status_aktif),
          ikatan_kerja: clean(dosen.ikatan_kerja),
        });
      }

      await sleep(REQUEST_DELAY_MS);
    }

    return {
      pt: { kode: clean(pt.kode), nama: (pt.nama ?? ptKeyword).trim() },
      prodiCount: prodiWithData,
      dosen: rows,
    };
  } finally {
    await session.close();
  }
};

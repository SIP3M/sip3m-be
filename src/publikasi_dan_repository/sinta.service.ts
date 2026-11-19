import { load, type CheerioAPI } from "cheerio";

/**
 * Scrape SINTA (https://sinta.kemdiktisaintek.go.id) — sumber angka
 * publikasi per dosen. Tidak ada API resmi, jadi memakai fetch biasa
 * dengan header browser + parsing HTML (cheerio).
 *
 * Sumber per kolom (tanpa login):
 * - Scopus & Google Scholar → tabel "Summary" profil author (baris Article).
 * - Garuda → tabel metrik `?view=matrics`, jumlah nilai baris dokumen
 *   G1–G24 (angka resmi SINTA; tidak termasuk dokumen Garuda yang juga
 *   terindeks Scopus — karena itu dihitung pada metrik A).
 * - Detail publikasi per basis → daftar `.ar-list-item` di profil author.
 *   Tanpa login SINTA hanya menampilkan 10 publikasi terakhir per basis.
 */

const SINTA_BASE = "https://sinta.kemdiktisaintek.go.id";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1_000;
const REQUEST_DELAY_MS = 150;
const MAX_AUTHOR_PAGES = 50;
const ITEMS_PER_PAGE = 10;
const MAX_PUBLICATION_ITEMS = 50;

const DEFAULT_AFFILIATION_ID = "1417"; // afiliasi UMC di SINTA

export type SintaBasis = "scopus" | "garuda" | "googlescholar";

export type SintaAuthorRef = {
  sintaId: string;
  nama: string;
  dept: string | null;
};

export type SintaAuthorCounts = {
  scopus: number | null;
  garuda: number | null;
  gs: number | null;
};

export type SintaPublikasi = {
  title: string;
  url: string | null;
  venue: string | null;
  year: number | null;
  quartile: string | null;
  extra: string | null;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const clean = (value: unknown): string | null => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
};

const parseCount = (text: string | null): number | null => {
  const match = /-?\d+/.exec(text ?? "");
  return match ? Number.parseInt(match[0], 10) : null;
};

export const getAffiliationId = (): string =>
  process.env.SINTA_AFFILIATION_ID?.trim() || DEFAULT_AFFILIATION_ID;

export const authorProfileUrl = (sintaId: string): string =>
  `${SINTA_BASE}/authors/profile/${sintaId}`;

// ---------------------------------------------------------------------------
// Klien HTTP
// ---------------------------------------------------------------------------

const fetchHtml = async (pathAndQuery: string): Promise<string> => {
  let lastFailure = "unknown error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`${SINTA_BASE}${pathAndQuery}`, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
          Referer: `${SINTA_BASE}/`,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  throw new Error(`SINTA ${pathAndQuery} gagal setelah retry: ${lastFailure}`);
};

// ---------------------------------------------------------------------------
// Daftar author afiliasi (pemetaan nama → id SINTA)
// ---------------------------------------------------------------------------

export const fetchAffiliationAuthors = async (
  affiliationId: string = getAffiliationId(),
): Promise<SintaAuthorRef[]> => {
  const authors: SintaAuthorRef[] = [];
  const seenIds = new Set<string>();
  let previousFirstId: string | null = null;

  for (let page = 1; page <= MAX_AUTHOR_PAGES; page++) {
    const html = await fetchHtml(`/affiliations/authors/${affiliationId}?page=${page}`);
    const $ = load(html);

    const items = $(".au-item");
    if (items.length === 0) break;

    const pageAuthors: SintaAuthorRef[] = [];
    items.each((_, element) => {
      const box = $(element);
      const link = box.find(".profile-name a").first();
      const href = link.attr("href") ?? "";
      const idMatch = /\/authors\/profile\/(\d+)/.exec(href);
      const nama = clean(link.text());
      if (!idMatch || !nama) return;

      pageAuthors.push({
        sintaId: idMatch[1],
        nama,
        dept: clean(box.find(".profile-dept").text()),
      });
    });

    if (pageAuthors.length === 0) break;

    // Jaring pengaman bila situsnya mengabaikan parameter page.
    if (previousFirstId && pageAuthors[0].sintaId === previousFirstId) break;
    previousFirstId = pageAuthors[0].sintaId;

    for (const author of pageAuthors) {
      if (seenIds.has(author.sintaId)) continue;
      seenIds.add(author.sintaId);
      authors.push(author);
    }

    if (items.length < ITEMS_PER_PAGE) break; // halaman terakhir
    await sleep(REQUEST_DELAY_MS);
  }

  if (authors.length === 0) {
    throw new Error("Daftar author afiliasi SINTA kosong atau tidak terbaca.");
  }

  return authors;
};

// ---------------------------------------------------------------------------
// Angka publikasi per author
// ---------------------------------------------------------------------------

const parseSummaryCounts = ($: CheerioAPI): { scopus: number | null; gs: number | null } => {
  let scopus: number | null = null;
  let gs: number | null = null;

  $("table.stat-table tr").each((_, element) => {
    const cells = $(element).find("td");
    if (cells.length < 3) return;
    if (clean(cells.first().text()) !== "Article") return;

    scopus = parseCount(cells.eq(1).text());
    gs = parseCount(cells.eq(2).text());
  });

  return { scopus, gs };
};

/**
 * Jumlah dokumen Garuda = jumlah nilai (kolom "Value" V3 Overall) pada
 * baris metrik dokumen G1–G24. G25 (sitasi) dan G26 (dokumen tersitasi)
 * adalah metrik sitasi, bukan jumlah dokumen, jadi tidak dijumlahkan.
 */
const parseGarudaFromMetrics = ($: CheerioAPI): number | null => {
  let total = 0;
  let matchedRows = 0;

  $("tr").each((_, element) => {
    const cells = $(element).find("th,td");
    if (cells.length < 5) return;

    const codeMatch = /^G(\d+)$/.exec(clean(cells.eq(1).text()) ?? "");
    if (!codeMatch) return;

    const codeNumber = Number.parseInt(codeMatch[1], 10);
    if (codeNumber < 1 || codeNumber > 24) return;

    matchedRows += 1;
    total += parseCount(cells.eq(4).text()) ?? 0;
  });

  return matchedRows > 0 ? total : null;
};

export const fetchAuthorCounts = async (sintaId: string): Promise<SintaAuthorCounts> => {
  const [profileHtml, matricsHtml] = await Promise.all([
    fetchHtml(`/authors/profile/${sintaId}`),
    fetchHtml(`/authors/profile/${sintaId}/?view=matrics`),
  ]);

  const summary = parseSummaryCounts(load(profileHtml));
  const garuda = parseGarudaFromMetrics(load(matricsHtml));

  return { scopus: summary.scopus, garuda, gs: summary.gs };
};

// ---------------------------------------------------------------------------
// Detail publikasi per author (on-demand)
// ---------------------------------------------------------------------------

const VIEW_PARAM: Record<SintaBasis, string> = {
  scopus: "",
  garuda: "?view=garuda",
  googlescholar: "?view=googlescholar",
};

export const fetchAuthorPublications = async (
  sintaId: string,
  basis: SintaBasis,
): Promise<SintaPublikasi[]> => {
  const html = await fetchHtml(`/authors/profile/${sintaId}/${VIEW_PARAM[basis]}`);
  const $ = load(html);

  const items: SintaPublikasi[] = [];

  $(".ar-list-item").each((_, element) => {
    if (items.length >= MAX_PUBLICATION_ITEMS) return;

    const box = $(element);
    const titleLink = box.find(".ar-title a").first();
    const title = clean(titleLink.text());
    if (!title) return;

    // Venue: link jurnal; fallback ke link meta pertama selain quartile.
    const metaFallback = box
      .find(".ar-meta a")
      .filter((__, link) => !$(link).hasClass("ar-quartile"))
      .first();

    items.push({
      title,
      url: clean(titleLink.attr("href")),
      venue: clean(box.find(".ar-pub").text()) ?? clean(metaFallback.text()),
      year: parseCount(clean(box.find(".ar-year").text())),
      quartile: clean(box.find(".ar-quartile").text()),
      extra: clean(box.find(".ar-cited").text()),
    });
  });

  return items;
};

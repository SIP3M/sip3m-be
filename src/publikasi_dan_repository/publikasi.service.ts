import { HttpError } from "../common/errors/http-error";
import type { GetPublikasiQuery } from "./publikasi.validation";

/**
 * Publikasi dosen dari OpenAlex (https://openalex.org) — sumber data
 * akademik terbuka pengganti Google Scholar (tidak menyediakan API resmi).
 *
 * Setiap pencarian menjalankan dua query paralel lalu digabung:
 * - `raw_author_name.search` → cocok untuk nama dosen
 * - `search`                 → cocok untuk judul / kata kunci
 *
 * Hasil digabung, di-dedup, dan dicache di memori (24 jam) agar hemat
 * kuota harian OpenAlex.
 */

const OPENALEX_WORKS_URL = "https://api.openalex.org/works";
const OPENALEX_SELECT_FIELDS =
  "id,display_name,publication_year,cited_by_count,doi,authorships,primary_location,open_access";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;
const MAX_AUTHORS_SHOWN = 5;

type OpenAlexWork = {
  id: string;
  display_name?: string | null;
  publication_year?: number | null;
  cited_by_count?: number | null;
  doi?: string | null;
  authorships?: Array<{ author?: { display_name?: string | null } | null }>;
  primary_location?: {
    source?: { display_name?: string | null } | null;
    landing_page_url?: string | null;
  } | null;
  open_access?: { oa_url?: string | null } | null;
};

type OpenAlexPage = {
  items: OpenAlexWork[];
  count: number;
};

export type PublikasiItem = {
  id: string;
  title: string;
  authors: string[];
  author_count: number;
  year: number | null;
  venue: string | null;
  cited_by_count: number;
  doi: string | null;
  pdf_url: string | null;
  url: string | null;
};

export type PublikasiResult = {
  data: PublikasiItem[];
  meta: {
    totalData: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    source: "openalex";
  };
};

const SORT_PARAMS: Record<Exclude<GetPublikasiQuery["sort"], "relevance">, string> = {
  terbaru: "publication_date:desc",
  terpopuler: "cited_by_count:desc",
};

// ---------------------------------------------------------------------------
// Cache in-memory (LRU sederhana: entri terlama di-evict saat kapasitas penuh)
// ---------------------------------------------------------------------------

type CacheEntry = { expiresAt: number; value: PublikasiResult };

const cache = new Map<string, CacheEntry>();

const cacheGet = (key: string): PublikasiResult | null => {
  const entry = cache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  // Sisipkan ulang agar entri yang baru diakses tidak cepat ter-evict.
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
};

const cacheSet = (key: string, value: PublikasiResult): void => {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
};

// ---------------------------------------------------------------------------
// Klien OpenAlex
// ---------------------------------------------------------------------------

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Koma dan titik dua memisahkan elemen filter OpenAlex — harus di-escape. */
const escapeFilterValue = (value: string): string =>
  value.replace(/([,:])/g, "\\$1");

const buildWorksUrl = (params: Record<string, string>): string => {
  const url = new URL(OPENALEX_WORKS_URL);
  url.searchParams.set("select", OPENALEX_SELECT_FIELDS);

  const apiKey = process.env.OPENALEX_API_KEY;
  if (apiKey) url.searchParams.set("api_key", apiKey);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
};

const fetchWorks = async (
  params: Record<string, string>,
): Promise<OpenAlexPage> => {
  let lastFailure = "unknown error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(buildWorksUrl(params), {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const body = (await response.json()) as {
        meta?: { count?: number };
        results?: OpenAlexWork[];
      };

      return { items: body.results ?? [], count: body.meta?.count ?? 0 };
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }
  }

  console.error("[publikasi] OpenAlex gagal setelah retry:", lastFailure);
  throw new HttpError(
    "Layanan publikasi eksternal sedang tidak tersedia. Silakan coba lagi nanti.",
    502,
  );
};

// ---------------------------------------------------------------------------
// Normalisasi & penggabungan hasil
// ---------------------------------------------------------------------------

const toPublikasiItem = (work: OpenAlexWork): PublikasiItem => {
  const authorNames = (work.authorships ?? [])
    .map((authorship) => authorship.author?.display_name)
    .filter((name): name is string => Boolean(name));

  return {
    id: work.id,
    title: work.display_name?.trim() || "(Tanpa judul)",
    authors: authorNames.slice(0, MAX_AUTHORS_SHOWN),
    author_count: authorNames.length,
    year: work.publication_year ?? null,
    venue: work.primary_location?.source?.display_name ?? null,
    cited_by_count: work.cited_by_count ?? 0,
    doi: work.doi ?? null,
    pdf_url: work.open_access?.oa_url ?? null,
    url: work.primary_location?.landing_page_url ?? null,
  };
};

const mergeWorks = (
  byAuthor: OpenAlexWork[],
  byKeyword: OpenAlexWork[],
  sort: GetPublikasiQuery["sort"],
): OpenAlexWork[] => {
  const seen = new Set<string>();
  const merged: OpenAlexWork[] = [];

  // Hasil pencarian nama didahulukan; dedup by id (karya bisa muncul di keduanya).
  for (const work of [...byAuthor, ...byKeyword]) {
    if (seen.has(work.id)) continue;
    seen.add(work.id);
    merged.push(work);
  }

  if (sort === "terbaru") {
    merged.sort((a, b) => (b.publication_year ?? 0) - (a.publication_year ?? 0));
  } else if (sort === "terpopuler") {
    merged.sort((a, b) => (b.cited_by_count ?? 0) - (a.cited_by_count ?? 0));
  }
  // sort "relevance": urutan relevansi OpenAlex dipertahankan.

  return merged;
};

const fetchPublikasiPage = async (
  query: GetPublikasiQuery,
): Promise<PublikasiResult> => {
  const { search, page, limit, sort } = query;

  const baseParams: Record<string, string> = {
    page: String(page),
    "per-page": String(limit),
    ...(sort !== "relevance" ? { sort: SORT_PARAMS[sort] } : {}),
  };

  const [byAuthor, byKeyword] = await Promise.all([
    fetchWorks({
      ...baseParams,
      filter: `raw_author_name.search:${escapeFilterValue(search)}`,
    }),
    fetchWorks({ ...baseParams, search }),
  ]);

  const merged = mergeWorks(byAuthor.items, byKeyword.items, sort);

  // Perkiraan jumlah union (bukan nilai tepat) — cukup untuk indikator hasil.
  const totalData = Math.max(byAuthor.count, byKeyword.count);

  return {
    data: merged.slice(0, limit).map(toPublikasiItem),
    meta: {
      totalData,
      totalPages: Math.max(1, Math.ceil(totalData / limit)),
      currentPage: page,
      limit,
      source: "openalex",
    },
  };
};

// ---------------------------------------------------------------------------
// Endpoint service
// ---------------------------------------------------------------------------

export const searchPublikasi = async (
  query: GetPublikasiQuery,
): Promise<PublikasiResult> => {
  const normalizedSearch = query.search.trim().replace(/\s+/g, " ");
  const cacheKey = [
    normalizedSearch.toLowerCase(),
    query.page,
    query.limit,
    query.sort,
  ].join("|");

  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const result = await fetchPublikasiPage({
    ...query,
    search: normalizedSearch,
  });

  cacheSet(cacheKey, result);
  return result;
};

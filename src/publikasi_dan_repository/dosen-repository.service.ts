import { HttpError } from "../common/errors/http-error";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../prisma";
import {
  PddiktiBrowserUnavailableError,
  buildDedupeKey,
  fetchPddiktiSnapshot,
  isPddiktiSyncAvailable,
  normalizeNama,
  type PddiktiSnapshot,
} from "./pddikti.service";
import {
  authorProfileUrl,
  fetchAffiliationAuthors,
  fetchAuthorCounts,
  fetchAuthorPublications,
  type SintaAuthorRef,
  type SintaBasis,
  type SintaPublikasi,
} from "./sinta.service";
import type { GetDosenRepositoryQuery } from "./dosen-repository.validation";

/**
 * Repository Publikasi Dosen — orkestrasi:
 * - baris  = daftar dosen PDDikti (di-sync otomatis saat halaman dibuka, TTL 24 jam)
 * - angka  = SINTA (Scopus/Garuda/GS, cocok otomatis by nama)
 * - detail = fetch on-demand dari SINTA + cache kumulatif per basis
 *
 * Sinkronisasi berjalan di background (tidak memblokir request) dan
 * dikunci lewat tabel RepositorySyncState agar tidak dobel — termasuk
 * lintas proses/instance. Jika browser tidak tersedia di server
 * (mis. Vercel), sinkronisasi dilewati dengan aman: data lama tetap
 * disajikan dan status `unavailable` dikirim ke FE.
 */

const SYNC_KEY = "dosen_repository";
const SYNC_TTL_MS = 24 * 60 * 60 * 1000;
const LOCK_STALE_MS = 10 * 60 * 1000;
const ERROR_BACKOFF_MS = 10 * 60 * 1000;
const DETAIL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SINTA_REQUEST_DELAY_MS = 150;

const UNAVAILABLE_MESSAGE =
  "Penyegaran otomatis memerlukan browser di server ini; menampilkan data terakhir tersimpan.";

export type DosenRepositorySyncInfo = {
  status: "idle" | "syncing" | "unavailable" | "error";
  last_sync_at: string | null;
  message: string | null;
};

export type DosenRepositoryItem = {
  id: string;
  nama: string;
  nidn: string | null;
  prodi: string | null;
  jenjang: string | null;
  scopus: number | null;
  garuda: number | null;
  gs: number | null;
  terhubung: boolean;
};

type PublikasiCacheEntry = { at: string; items: SintaPublikasi[] };
type PublikasiCache = Partial<Record<SintaBasis, PublikasiCacheEntry>>;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Status & kunci sinkronisasi
// ---------------------------------------------------------------------------

const getState = async () => {
  const existing = await prisma.repositorySyncState.findUnique({ where: { key: SYNC_KEY } });
  if (existing) return existing;

  return prisma.repositorySyncState.upsert({
    where: { key: SYNC_KEY },
    update: {},
    create: { key: SYNC_KEY, status: "idle" },
  });
};

const toSyncInfo = (
  state: { status: string; last_sync_at: Date | null; last_error: string | null },
  status?: DosenRepositorySyncInfo["status"],
): DosenRepositorySyncInfo => {
  const normalized: DosenRepositorySyncInfo["status"] =
    status ?? (state.status === "syncing" || state.status === "error" ? state.status : "idle");

  return {
    status: normalized,
    last_sync_at: state.last_sync_at?.toISOString() ?? null,
    message: normalized === "error" ? state.last_error : null,
  };
};

/** Klaim kunci anti-dobel lintas proses. true = berhasil memegang kunci. */
const claimLock = async (): Promise<boolean> => {
  const result = await prisma.repositorySyncState.updateMany({
    where: {
      key: SYNC_KEY,
      OR: [{ locked_at: null }, { locked_at: { lt: new Date(Date.now() - LOCK_STALE_MS) } }],
    },
    data: { status: "syncing", locked_at: new Date() },
  });
  return result.count === 1;
};

const releaseLock = async (result: {
  status: "idle" | "error";
  last_sync_at?: Date;
  last_error?: string | null;
}): Promise<void> => {
  await prisma.repositorySyncState.update({
    where: { key: SYNC_KEY },
    data: {
      status: result.status,
      locked_at: null,
      ...(result.last_sync_at ? { last_sync_at: result.last_sync_at } : {}),
      last_error: result.last_error ?? null,
    },
  });
};

// ---------------------------------------------------------------------------
// Sinkronisasi
// ---------------------------------------------------------------------------

const persistSnapshot = async (snapshot: PddiktiSnapshot): Promise<void> => {
  if (snapshot.dosen.length === 0) {
    throw new Error("Snapshot dosen PDDikti kosong — sinkronisasi dibatalkan agar data lama tidak terhapus.");
  }

  const now = new Date();
  const keys = snapshot.dosen.map((row) => buildDedupeKey(row));

  await prisma.$transaction([
    // Baris PDDikti yang sudah tidak ada lagi dihapus.
    prisma.dosenRepository.deleteMany({ where: { dedupe_key: { notIn: keys } } }),
    ...snapshot.dosen.map((row) => {
      const dedupeKey = buildDedupeKey(row);
      const data = {
        nama: row.nama,
        nidn: row.nidn,
        nuptk: row.nuptk,
        prodi: row.prodi,
        jenjang: row.jenjang,
        status_aktif: row.status_aktif,
        ikatan_kerja: row.ikatan_kerja,
        pddikti_synced_at: now,
      };

      return prisma.dosenRepository.upsert({
        where: { dedupe_key: dedupeKey },
        create: { dedupe_key: dedupeKey, ...data },
        update: data,
      });
    }),
  ]);
};

const syncSintaCounts = async (): Promise<void> => {
  let authors: SintaAuthorRef[];
  try {
    authors = await fetchAffiliationAuthors();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[dosen-repository] daftar author SINTA gagal — data SINTA lama dipertahankan:", message);
    return;
  }

  const byName = new Map<string, SintaAuthorRef>();
  for (const author of authors) {
    const key = normalizeNama(author.nama);
    if (!byName.has(key)) byName.set(key, author);
  }

  const rows = await prisma.dosenRepository.findMany({
    select: { id: true, nama: true, sinta_id: true, sinta_synced_at: true },
  });
  const now = Date.now();

  for (const row of rows) {
    const match = byName.get(normalizeNama(row.nama)) ?? null;

    if (!match) {
      // Tidak ada di daftar afiliasi SINTA → lepas kaitan (badge "belum terhubung").
      if (row.sinta_id) {
        await prisma.dosenRepository.update({
          where: { id: row.id },
          data: {
            sinta_id: null,
            sinta_profile_url: null,
            scopus_count: null,
            garuda_count: null,
            gs_count: null,
            sinta_synced_at: null,
          },
        });
      }
      continue;
    }

    const countsStale =
      !row.sinta_synced_at || now - row.sinta_synced_at.getTime() > SYNC_TTL_MS;
    const identityChanged = match.sintaId !== row.sinta_id;
    if (!identityChanged && !countsStale) continue;

    try {
      const counts = await fetchAuthorCounts(match.sintaId);
      await prisma.dosenRepository.update({
        where: { id: row.id },
        data: {
          sinta_id: match.sintaId,
          sinta_profile_url: authorProfileUrl(match.sintaId),
          scopus_count: counts.scopus,
          garuda_count: counts.garuda,
          gs_count: counts.gs,
          sinta_synced_at: new Date(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[dosen-repository] angka SINTA "${row.nama}" gagal:`, message);
      // Identitas SINTA tetap dipasang; angka lama dipertahankan kecuali
      // identitasnya berubah (angka lama milik profil lain → jangan dipakai).
      await prisma.dosenRepository.update({
        where: { id: row.id },
        data: {
          sinta_id: match.sintaId,
          sinta_profile_url: authorProfileUrl(match.sintaId),
          ...(identityChanged
            ? { scopus_count: null, garuda_count: null, gs_count: null }
            : {}),
          sinta_synced_at: null,
        },
      });
    }

    await sleep(SINTA_REQUEST_DELAY_MS);
  }
};

const runSync = async (): Promise<void> => {
  try {
    if (!isPddiktiSyncAvailable()) throw new PddiktiBrowserUnavailableError();

    const snapshot = await fetchPddiktiSnapshot();
    console.log(
      `[dosen-repository] PDDikti OK: ${snapshot.pt.nama} — ${snapshot.prodiCount} prodi, ${snapshot.dosen.length} dosen.`,
    );

    await persistSnapshot(snapshot);
    await syncSintaCounts();

    await releaseLock({ status: "idle", last_sync_at: new Date(), last_error: null });
    console.log("[dosen-repository] sinkronisasi selesai.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[dosen-repository] sinkronisasi gagal:", message);
    await releaseLock({
      status: "error",
      last_error: message.slice(0, 2000),
    }).catch((releaseError) => {
      console.error("[dosen-repository] gagal melepas kunci:", releaseError);
    });
  }
};

/**
 * Pastikan data segar (TTL 24 jam). Jika perlu disync, jalankan di
 * background dan segera kembalikan status `syncing` — request tidak
 * pernah menunggu sinkronisasi selesai.
 */
export const ensureDosenRepositoryFresh = async (): Promise<DosenRepositorySyncInfo> => {
  const state = await getState();

  const lockedAt = state.locked_at?.getTime() ?? null;
  const lockedFresh =
    state.status === "syncing" && lockedAt !== null && Date.now() - lockedAt < LOCK_STALE_MS;
  if (lockedFresh) return toSyncInfo(state, "syncing");

  const lastSync = state.last_sync_at?.getTime() ?? null;
  if (lastSync && Date.now() - lastSync < SYNC_TTL_MS && state.status !== "error") {
    return toSyncInfo(state, "idle");
  }

  if (!isPddiktiSyncAvailable()) {
    return {
      status: "unavailable",
      last_sync_at: state.last_sync_at?.toISOString() ?? null,
      message: UNAVAILABLE_MESSAGE,
    };
  }

  // Jeda coba-ulang setelah kegagalan terakhir agar tidak memaksa SINTA/PDDikti.
  if (state.status === "error" && Date.now() - state.updated_at.getTime() < ERROR_BACKOFF_MS) {
    return toSyncInfo(state, "error");
  }

  const claimed = await claimLock();
  if (!claimed) return toSyncInfo(state, "syncing");

  void runSync();
  return { status: "syncing", last_sync_at: state.last_sync_at?.toISOString() ?? null, message: null };
};

/** Sinkronisasi penuh & sinkron (dipakai script `npm run sync:dosen`). */
export const syncDosenRepositoryNow = async (): Promise<DosenRepositorySyncInfo> => {
  const state = await getState();

  const claimed = await claimLock();
  if (!claimed) return toSyncInfo(state, "syncing");

  await runSync();
  return toSyncInfo(await getState());
};

// ---------------------------------------------------------------------------
// Endpoint service
// ---------------------------------------------------------------------------

export const getDosenRepositoryList = async (
  query: GetDosenRepositoryQuery,
): Promise<{
  data: DosenRepositoryItem[];
  meta: {
    totalData: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    sync: DosenRepositorySyncInfo;
  };
}> => {
  const skip = (query.page - 1) * query.limit;
  const search = query.search?.trim();
  const where: Prisma.DosenRepositoryWhereInput = search
    ? { nama: { contains: search, mode: "insensitive" } }
    : {};

  // Penyegaran TTL 24 jam — dijalankan di background, tidak memblokir request.
  const sync = await ensureDosenRepositoryFresh();

  const [totalData, rows] = await prisma.$transaction([
    prisma.dosenRepository.count({ where }),
    prisma.dosenRepository.findMany({
      where,
      orderBy: [{ nama: "asc" }],
      skip,
      take: query.limit,
      select: {
        id: true,
        nama: true,
        nidn: true,
        prodi: true,
        jenjang: true,
        sinta_id: true,
        scopus_count: true,
        garuda_count: true,
        gs_count: true,
      },
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    nama: row.nama,
    nidn: row.nidn,
    prodi: row.prodi,
    jenjang: row.jenjang,
    scopus: row.scopus_count,
    garuda: row.garuda_count,
    gs: row.gs_count,
    terhubung: Boolean(row.sinta_id),
  }));

  return {
    data,
    meta: {
      totalData,
      totalPages: Math.max(1, Math.ceil(totalData / query.limit)),
      currentPage: query.page,
      limit: query.limit,
      sync,
    },
  };
};

const itemKey = (item: SintaPublikasi): string =>
  `${item.year ?? ""}|${item.title.toLowerCase().replace(/\s+/g, " ").trim()}`;

/** Union: publikasi yang pernah tampil tidak hilang walau daftar segar berubah. */
const mergePublikasi = (fresh: SintaPublikasi[], cached: SintaPublikasi[]): SintaPublikasi[] => {
  const seen = new Set<string>();
  const merged: SintaPublikasi[] = [];

  for (const item of [...fresh, ...cached]) {
    const key = itemKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
};

export const getDosenPublikasi = async (
  id: string,
  basis: SintaBasis,
): Promise<{
  data: SintaPublikasi[];
  meta: { basis: SintaBasis; total: number; synced_at: string; source: "live" | "cache" };
}> => {
  const row = await prisma.dosenRepository.findUnique({ where: { id } });
  if (!row) throw new HttpError("Dosen tidak ditemukan.", 404);
  if (!row.sinta_id) {
    throw new HttpError("Dosen ini belum terhubung ke SINTA — publikasi belum tersedia.", 404);
  }

  const cache = (row.publikasi_cache ?? {}) as PublikasiCache;
  const entry = cache[basis];
  const entryValid =
    Boolean(entry) && !Number.isNaN(new Date(entry!.at).getTime());
  const entryFresh =
    entryValid && Date.now() - new Date(entry!.at).getTime() < DETAIL_CACHE_TTL_MS;

  if (entry && entryFresh) {
    return {
      data: entry.items,
      meta: {
        basis,
        total: entry.items.length,
        synced_at: entry.at,
        source: "cache",
      },
    };
  }

  try {
    const fresh = await fetchAuthorPublications(row.sinta_id, basis);
    const merged = mergePublikasi(fresh, entry?.items ?? []);
    const at = new Date().toISOString();

    await prisma.dosenRepository.update({
      where: { id: row.id },
      data: {
        publikasi_cache: { ...cache, [basis]: { at, items: merged } } as Prisma.InputJsonValue,
        publikasi_cached_at: new Date(),
      },
    });

    return { data: merged, meta: { basis, total: merged.length, synced_at: at, source: "live" } };
  } catch (error) {
    if (entry && entry.items.length > 0) {
      // Cache lama disajikan bila SINTA sedang gagal — lebih baik daripada kosong.
      console.error("[dosen-repository] fetch detail SINTA gagal — memakai cache:", error);
      return {
        data: entry.items,
        meta: { basis, total: entry.items.length, synced_at: entry.at, source: "cache" },
      };
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error("[dosen-repository] fetch detail SINTA gagal:", message);
    throw new HttpError(
      "Publikasi dari SINTA sedang tidak tersedia. Silakan coba lagi nanti.",
      502,
    );
  }
};

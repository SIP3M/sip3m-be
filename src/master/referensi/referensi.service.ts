import { HttpError } from "../../common/errors/http-error";
import { prisma } from "../../prisma";
import type { JenisReferensi } from "./referensi.types";
import type {
  CreateReferensiInput,
  UpdateReferensiInput,
} from "./referensi.validation";

// =============================================
// Cache opsi aktif (untuk filter pencarian)
// =============================================

const CACHE_TTL_MS = 60_000;

let cache: { at: number; SKEMA: string[]; SUMBER_PENDANAAN: string[] } | null =
  null;

/** Panggil setiap kali master berubah supaya pembaca lain segera segar. */
export const invalidateReferensiCache = (): void => {
  cache = null;
};

const loadAktifNamas = async (jenis: JenisReferensi): Promise<string[]> => {
  const rows = await prisma.masterReferensi.findMany({
    where: { jenis, is_aktif: true },
    orderBy: [{ urut: "asc" }, { id: "asc" }],
    select: { nama: true },
  });
  return rows.map((r) => r.nama);
};

const getCache = async (): Promise<{
  SKEMA: string[];
  SUMBER_PENDANAAN: string[];
}> => {
  if (!cache || Date.now() - cache.at > CACHE_TTL_MS) {
    const [SKEMA, SUMBER_PENDANAAN] = await Promise.all([
      loadAktifNamas("SKEMA"),
      loadAktifNamas("SUMBER_PENDANAAN"),
    ]);
    cache = { at: Date.now(), SKEMA, SUMBER_PENDANAAN };
  }
  return cache;
};

/**
 * Samakan nilai apa pun (label, kode legacy PENELITIAN_TERAPAN, beda
 * kapital/spasi) ke nama kanonis di master.
 */
const matchNama = (list: string[], value: string): string | null => {
  const normalizeKey = (s: string) =>
    s.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const key = normalizeKey(value);
  return list.find((n) => normalizeKey(n) === key) ?? null;
};

// =============================================
// Resolusi untuk alur proposal
// =============================================

/**
 * Filter pencarian `?skema=` — resolve label/kode ke nama kanonis (pakai
 * cache); bila tidak dikenal, diabaikan (tanpa filter skema).
 */
export const resolveSkemaForSearch = async (
  value?: string,
): Promise<string | undefined> => {
  if (!value?.trim()) return undefined;
  const c = await getCache();
  return matchNama(c.SKEMA, value) ?? undefined;
};

export interface ProposalReferensiInput {
  skema?: string;
  sumber_pendanaan?: string;
}

/**
 * Validasi & normalisasi skema/sumber_pendanaan saat TULIS proposal.
 * Query langsung tanpa cache (alur tulis jarang, keutamaan selalu segar).
 * Melempar 400 bila nilai tidak ditemukan di master aktif.
 */
export const normalizeProposalReferensi = async <
  T extends ProposalReferensiInput,
>(
  data: T,
): Promise<T> => {
  if (data.skema !== undefined) {
    const nama = matchNama(await loadAktifNamas("SKEMA"), data.skema);
    if (!nama) {
      throw new HttpError(
        "Skema tidak dikenal atau tidak aktif. Pilih dari daftar skema penelitian.",
        400,
      );
    }
    data.skema = nama;
  }

  if (data.sumber_pendanaan !== undefined) {
    if (!data.sumber_pendanaan) {
      // "" dianggap tidak dikirim (opsional)
      data.sumber_pendanaan = undefined;
    } else {
      const nama = matchNama(
        await loadAktifNamas("SUMBER_PENDANAAN"),
        data.sumber_pendanaan,
      );
      if (!nama) {
        throw new HttpError(
          "Sumber pendanaan tidak dikenal atau tidak aktif. Pilih dari daftar sumber pendanaan.",
          400,
        );
      }
      data.sumber_pendanaan = nama;
    }
  }

  return data;
};

// =============================================
// CRUD (ADMIN_SISTEM)
// =============================================

const orderBy = [{ urut: "asc" as const }, { id: "asc" as const }];

export const getAllReferensi = (jenis: JenisReferensi) =>
  prisma.masterReferensi.findMany({ where: { jenis }, orderBy });

export const getReferensiAktif = (jenis: JenisReferensi) =>
  prisma.masterReferensi.findMany({
    where: { jenis, is_aktif: true },
    orderBy,
  });

export const createReferensi = async (
  jenis: JenisReferensi,
  input: CreateReferensiInput,
) => {
  const existing = await prisma.masterReferensi.findFirst({
    where: { jenis, nama: { equals: input.nama, mode: "insensitive" } },
  });
  if (existing) {
    throw new HttpError(
      `Nama "${input.nama}" sudah terdaftar untuk jenis ini.`,
      409,
    );
  }

  const row = await prisma.masterReferensi.create({
    data: { jenis, nama: input.nama, urut: input.urut ?? 0 },
  });
  invalidateReferensiCache();
  return row;
};

export const updateReferensi = async (
  id: number,
  input: UpdateReferensiInput,
) => {
  const row = await prisma.masterReferensi.findUnique({ where: { id } });
  if (!row) {
    throw new HttpError("Opsi referensi tidak ditemukan.", 404);
  }

  if (input.nama && input.nama !== row.nama) {
    const dup = await prisma.masterReferensi.findFirst({
      where: {
        jenis: row.jenis,
        nama: { equals: input.nama, mode: "insensitive" },
        NOT: { id },
      },
    });
    if (dup) {
      throw new HttpError(
        `Nama "${input.nama}" sudah terdaftar untuk jenis ini.`,
        409,
      );
    }
  }

  const updated = await prisma.masterReferensi.update({
    where: { id },
    data: {
      ...(input.nama !== undefined && { nama: input.nama }),
      ...(input.is_aktif !== undefined && { is_aktif: input.is_aktif }),
      ...(input.urut !== undefined && { urut: input.urut }),
    },
  });
  invalidateReferensiCache();
  return updated;
};

/**
 * Hapus permanen — diblok (409) bila sudah dipakai proposal; saran di pesan:
 * nonaktifkan saja. Opsi lama yang tidak dipakai aman dihapus.
 */
export const deleteReferensi = async (id: number) => {
  const row = await prisma.masterReferensi.findUnique({ where: { id } });
  if (!row) {
    throw new HttpError("Opsi referensi tidak ditemukan.", 404);
  }

  const usageWhere =
    row.jenis === "SKEMA"
      ? { skema: row.nama }
      : { sumber_pendanaan: row.nama };
  const count = await prisma.proposals.count({ where: usageWhere });
  if (count > 0) {
    throw new HttpError(
      `Tidak dapat menghapus — dipakai oleh ${count} proposal. Nonaktifkan saja opsi ini.`,
      409,
    );
  }

  await prisma.masterReferensi.delete({ where: { id } });
  invalidateReferensiCache();
  return row;
};

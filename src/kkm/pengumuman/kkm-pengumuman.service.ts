import { prisma } from "../../prisma";
import { Prisma } from "../../generated/prisma/client";
import {
  KkmPesertaStatus,
  PengumumanPrioritas,
  PengumumanStatus,
  PengumumanTargetType,
} from "../../generated/prisma/enums";
import { supabase } from "../../config/storage";
import { HttpError } from "../../common/errors/http-error";
import { JENIS_KATEGORI_PENGUMUMAN, READER_LIST_LIMIT } from "./kkm-pengumuman.types";
import type {
  CreatePengumumanInput,
  PengumumanQueryInput,
  PengumumanTargetInput,
  UpdatePengumumanInput,
} from "./kkm-pengumuman.validation";

const BUCKET = "lppm_documents";
const PER_PAGE = 10;
const EXCERPT_LENGTH = 150;

type Tx = Prisma.TransactionClient;

// =============================================
// Utilitas
// =============================================

const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

const dedupeIds = (ids: Array<number | null | undefined>): number[] => [
  ...new Set(
    ids.filter((id): id is number => typeof id === "number" && id > 0),
  ),
];

const publicUrl = (path: string): string =>
  supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

/** Ringkasan isi untuk pesan notifikasi (1 baris, maks 150 karakter). */
const makeExcerpt = (isi: string): string => {
  const flat = isi.replace(/\s+/g, " ").trim();
  return flat.length <= EXCERPT_LENGTH
    ? flat
    : `${flat.slice(0, EXCERPT_LENGTH - 1)}…`;
};

/** Buang duplikat target (type + ref_id) agar tidak melanggar unique. */
const uniqueTargets = (
  targets: PengumumanTargetInput[],
): PengumumanTargetInput[] => {
  const seen = new Set<string>();
  const out: PengumumanTargetInput[] = [];
  for (const t of targets) {
    const key = `${t.type}:${t.ref_id ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
};

/** Kategori wajib ada di master aktif — disimpan nama kanonisnya. */
const ensureKategoriAktif = async (kategori: string): Promise<string> => {
  const row = await prisma.masterReferensi.findFirst({
    where: {
      jenis: JENIS_KATEGORI_PENGUMUMAN,
      nama: { equals: kategori, mode: "insensitive" },
      is_aktif: true,
    },
    select: { nama: true },
  });
  if (!row) {
    throw new HttpError(
      "Kategori pengumuman tidak dikenal atau tidak aktif. Pilih dari daftar kategori.",
      400,
    );
  }
  return row.nama;
};

// =============================================
// Resolusi target → daftar user penerima
// =============================================

const dplUserIds = async (): Promise<number[]> => {
  const [kelompoks, quotas] = await Promise.all([
    prisma.kkmKelompok.findMany({
      where: { dpl_id: { not: null } },
      select: { dpl_id: true },
    }),
    prisma.kkmDplQuota.findMany({ select: { dosen_id: true } }),
  ]);
  return dedupeIds([
    ...kelompoks.map((k) => k.dpl_id),
    ...quotas.map((q) => q.dosen_id),
  ]);
};

const userIdsForTarget = async (
  target: PengumumanTargetInput,
): Promise<number[]> => {
  const refId = target.ref_id ?? null;

  switch (target.type) {
    case "PESERTA": {
      const rows = await prisma.kkmPeserta.findMany({
        where: { status: { not: KkmPesertaStatus.REJECTED } },
        select: { user_id: true },
      });
      return dedupeIds(rows.map((r) => r.user_id));
    }

    case "DPL":
      return dplUserIds();

    case "KELOMPOK": {
      if (!refId) return [];
      const [peserta, kelompok] = await Promise.all([
        prisma.kkmPeserta.findMany({
          where: { kelompok_id: refId, status: { not: KkmPesertaStatus.REJECTED } },
          select: { user_id: true },
        }),
        prisma.kkmKelompok.findUnique({
          where: { id: refId },
          select: { dpl_id: true },
        }),
      ]);
      return dedupeIds([...peserta.map((p) => p.user_id), kelompok?.dpl_id]);
    }

    case "DESA": {
      if (!refId) return [];
      const kelompoks = await prisma.kkmKelompok.findMany({
        where: { lokasi_id: refId },
        select: { id: true, dpl_id: true },
      });
      const kelompokIds = kelompoks.map((k) => k.id);
      const peserta = kelompokIds.length
        ? await prisma.kkmPeserta.findMany({
            where: {
              kelompok_id: { in: kelompokIds },
              status: { not: KkmPesertaStatus.REJECTED },
            },
            select: { user_id: true },
          })
        : [];
      return dedupeIds([
        ...peserta.map((p) => p.user_id),
        ...kelompoks.map((k) => k.dpl_id),
      ]);
    }

    case "PERIODE": {
      if (!refId) return [];
      const [peserta, kelompoks, quotas] = await Promise.all([
        prisma.kkmPeserta.findMany({
          where: { periode_id: refId, status: { not: KkmPesertaStatus.REJECTED } },
          select: { user_id: true },
        }),
        prisma.kkmKelompok.findMany({
          where: { periode_id: refId, dpl_id: { not: null } },
          select: { dpl_id: true },
        }),
        prisma.kkmDplQuota.findMany({
          where: { periode_id: refId },
          select: { dosen_id: true },
        }),
      ]);
      return dedupeIds([
        ...peserta.map((p) => p.user_id),
        ...kelompoks.map((k) => k.dpl_id),
        ...quotas.map((q) => q.dosen_id),
      ]);
    }

    case "FAKULTAS": {
      if (!refId) return [];
      const [peserta, kelompoks, quotas] = await Promise.all([
        prisma.kkmPeserta.findMany({
          where: {
            status: { not: KkmPesertaStatus.REJECTED },
            user: { fakultas_id: refId },
          },
          select: { user_id: true },
        }),
        prisma.kkmKelompok.findMany({
          where: { dpl_id: { not: null }, dpl: { fakultas_id: refId } },
          select: { dpl_id: true },
        }),
        prisma.kkmDplQuota.findMany({
          where: { dosen: { fakultas_id: refId } },
          select: { dosen_id: true },
        }),
      ]);
      return dedupeIds([
        ...peserta.map((p) => p.user_id),
        ...kelompoks.map((k) => k.dpl_id),
        ...quotas.map((q) => q.dosen_id),
      ]);
    }

    default:
      return [];
  }
};

/** Union antar centang audiens → daftar user unik + label untuk ditampilkan. */
const resolveTargets = async (
  targets: PengumumanTargetInput[],
): Promise<{ userIds: number[]; labels: string[] }> => {
  const clean = uniqueTargets(targets);
  const perTarget = await Promise.all(clean.map(userIdsForTarget));
  const labels = await buildAudiensLabels(
    clean.map((t) => ({ target_type: t.type, ref_id: t.ref_id ?? null })),
  );
  return { userIds: dedupeIds(perTarget.flat()), labels };
};

/** Label audiens per target (batch load referensi agar hemat query). */
const buildAudiensLabels = async (
  targets: Array<{ target_type: PengumumanTargetType; ref_id: number | null }>,
): Promise<string[]> => {
  const byType = new Map<PengumumanTargetType, Set<number>>();
  for (const t of targets) {
    if (t.ref_id == null) continue;
    const set = byType.get(t.target_type) ?? new Set<number>();
    set.add(t.ref_id);
    byType.set(t.target_type, set);
  }

  const idsOf = (type: PengumumanTargetType): number[] => [
    ...(byType.get(type) ?? []),
  ];

  const [kelompoks, lokasis, periodes, fakultas] = await Promise.all([
    byType.has(PengumumanTargetType.KELOMPOK)
      ? prisma.kkmKelompok.findMany({
          where: { id: { in: idsOf(PengumumanTargetType.KELOMPOK) } },
          select: { id: true, nama: true },
        })
      : Promise.resolve([]),
    byType.has(PengumumanTargetType.DESA)
      ? prisma.kkmLocation.findMany({
          where: { id: { in: idsOf(PengumumanTargetType.DESA) } },
          select: { id: true, desa: true, kecamatan: true },
        })
      : Promise.resolve([]),
    byType.has(PengumumanTargetType.PERIODE)
      ? prisma.kkmPeriod.findMany({
          where: { id: { in: idsOf(PengumumanTargetType.PERIODE) } },
          select: { id: true, nama_periode: true, tahun_akademik: true },
        })
      : Promise.resolve([]),
    byType.has(PengumumanTargetType.FAKULTAS)
      ? prisma.fakultas.findMany({
          where: { id: { in: idsOf(PengumumanTargetType.FAKULTAS) } },
          select: { id: true, nama: true },
        })
      : Promise.resolve([]),
  ]);

  const kMap = new Map(kelompoks.map((k) => [k.id, k.nama]));
  const lMap = new Map(lokasis.map((l) => [l.id, l]));
  const pMap = new Map(periodes.map((p) => [p.id, p]));
  const fMap = new Map(fakultas.map((f) => [f.id, f]));

  return targets.map((t) => {
    switch (t.target_type) {
      case PengumumanTargetType.PESERTA:
        return "Semua Peserta KKM";
      case PengumumanTargetType.DPL:
        return "Semua DPL";
      case PengumumanTargetType.KELOMPOK: {
        const nama = t.ref_id != null ? kMap.get(t.ref_id) : undefined;
        if (!nama) return `Kelompok #${t.ref_id}`;
        return /^kelompok/i.test(nama) ? nama : `Kelompok ${nama}`;
      }
      case PengumumanTargetType.DESA: {
        const loc = t.ref_id != null ? lMap.get(t.ref_id) : undefined;
        return loc
          ? `Desa ${loc.desa}, Kec. ${loc.kecamatan}`
          : `Desa #${t.ref_id}`;
      }
      case PengumumanTargetType.PERIODE: {
        const p = t.ref_id != null ? pMap.get(t.ref_id) : undefined;
        return p ? `Periode ${p.nama_periode}` : `Periode #${t.ref_id}`;
      }
      case PengumumanTargetType.FAKULTAS: {
        const f = t.ref_id != null ? fMap.get(t.ref_id) : undefined;
        return f ? `Fakultas ${f.nama}` : `Fakultas #${t.ref_id}`;
      }
      default:
        return "Audiens";
    }
  });
};

// =============================================
// Fan-out: recipient + notifikasi (dijalankan dalam transaksi)
// =============================================

const publishToRecipients = async (
  tx: Tx,
  pengumumanId: number,
  judul: string,
  isi: string,
  userIds: number[],
): Promise<void> => {
  if (userIds.length === 0) return;

  await tx.pengumumanRecipient.createMany({
    data: userIds.map((user_id) => ({ pengumuman_id: pengumumanId, user_id })),
    skipDuplicates: true,
  });

  const message = makeExcerpt(isi);
  await tx.notifications.createMany({
    data: userIds.map((user_id) => ({
      user_id,
      title: judul,
      message,
      pengumuman_id: pengumumanId,
    })),
  });

  await tx.pengumuman.update({
    where: { id: pengumumanId },
    data: {
      status: PengumumanStatus.PUBLISHED,
      published_at: new Date(),
    },
  });
};

// =============================================
// Lampiran (Supabase Storage)
// =============================================

interface LampiranUpload {
  path: string;
  name: string;
  size: number;
  mime: string;
  url: string;
}

const uploadLampiran = async (
  file: Express.Multer.File,
): Promise<LampiranUpload> => {
  const path = `pengumuman/${Date.now()}-${safeFileName(file.originalname)}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      cacheControl: "3600",
    });
  if (error) {
    throw new HttpError(`Gagal mengunggah lampiran: ${error.message}`, 500);
  }
  return {
    path,
    name: file.originalname,
    size: file.size,
    mime: file.mimetype,
    url: publicUrl(path),
  };
};

const removeLampiran = async (path: string): Promise<void> => {
  try {
    await supabase.storage.from(BUCKET).remove([path]);
  } catch (err) {
    console.error("[PENGUMUMAN_REMOVE_FILE_ERROR]", err);
  }
};

// =============================================
// Format respons
// =============================================

const formatPengumuman = (
  row: {
    id: number;
    judul: string;
    isi: string;
    kategori: string;
    prioritas: PengumumanPrioritas;
    status: PengumumanStatus;
    published_at: Date | null;
    scheduled_at: Date | null;
    is_pinned: boolean;
    lampiran_path: string | null;
    lampiran_name: string | null;
    lampiran_size: number | null;
    lampiran_mime: string | null;
    created_by: number;
    created_at: Date;
    updated_at: Date;
    creator?: { name: string } | null;
  },
  extras: {
    audiens?: string[];
    total_penerima?: number;
    dibaca?: number;
    read_at?: Date | null;
  } = {},
) => ({
  id: row.id,
  judul: row.judul,
  isi: row.isi,
  kategori: row.kategori,
  prioritas: row.prioritas,
  status: row.status,
  published_at: row.published_at,
  scheduled_at: row.scheduled_at,
  is_pinned: row.is_pinned,
  lampiran: row.lampiran_path
    ? {
        name: row.lampiran_name,
        size: row.lampiran_size,
        mime: row.lampiran_mime,
        url: publicUrl(row.lampiran_path),
      }
    : null,
  created_by: row.creator?.name ?? null,
  created_at: row.created_at,
  audiens: extras.audiens ?? [],
  total_penerima: extras.total_penerima ?? 0,
  dibaca: extras.dibaca ?? 0,
  ...(extras.read_at !== undefined ? { read_at: extras.read_at } : {}),
});

// =============================================
// ADMIN — CRUD + statistik
// =============================================

export const listPengumumanAdmin = async (query: PengumumanQueryInput) => {
  const page = query.page ?? 1;
  const skip = (page - 1) * PER_PAGE;

  const where: Prisma.PengumumanWhereInput = {
    ...(query.search
      ? {
          OR: [
            { judul: { contains: query.search, mode: "insensitive" } },
            { isi: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(query.kategori ? { kategori: query.kategori } : {}),
    ...(query.prioritas ? { prioritas: query.prioritas } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.audiens
      ? { targets: { some: { target_type: query.audiens } } }
      : {}),
  };

  const [rows, totalData, byPrioritas, dipinned, terjadwal] = await Promise.all([
    prisma.pengumuman.findMany({
      where,
      orderBy: [{ is_pinned: "desc" }, { created_at: "desc" }],
      skip,
      take: PER_PAGE,
      include: {
        creator: { select: { name: true } },
        targets: true,
      },
    }),
    prisma.pengumuman.count({ where }),
    prisma.pengumuman.groupBy({
      by: ["prioritas"],
      _count: { _all: true },
    }),
    prisma.pengumuman.count({ where: { is_pinned: true } }),
    prisma.pengumuman.count({ where: { status: PengumumanStatus.SCHEDULED } }),
  ]);

  // "dibaca X/Y" per pengumuman di halaman ini
  const ids = rows.map((r) => r.id);
  const [recipientTotals, recipientReads] = await Promise.all([
    ids.length
      ? prisma.pengumumanRecipient.groupBy({
          by: ["pengumuman_id"],
          where: { pengumuman_id: { in: ids } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    ids.length
      ? prisma.pengumumanRecipient.groupBy({
          by: ["pengumuman_id"],
          where: { pengumuman_id: { in: ids }, read_at: { not: null } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const totalMap = new Map(
    recipientTotals.map((r) => [r.pengumuman_id, r._count._all]),
  );
  const readMap = new Map(
    recipientReads.map((r) => [r.pengumuman_id, r._count._all]),
  );

  const labelsPerRow = await Promise.all(
    rows.map((r) => buildAudiensLabels(r.targets)),
  );

  const countByPrioritas = (p: PengumumanPrioritas) =>
    byPrioritas.find((b) => b.prioritas === p)?._count._all ?? 0;
  const totalSemua = byPrioritas.reduce((sum, b) => sum + b._count._all, 0);

  return {
    data: rows.map((r, i) =>
      formatPengumuman(r, {
        audiens: labelsPerRow[i],
        total_penerima: totalMap.get(r.id) ?? 0,
        dibaca: readMap.get(r.id) ?? 0,
      }),
    ),
    stats: {
      total: totalSemua,
      penting: countByPrioritas(PengumumanPrioritas.PENTING),
      sedang: countByPrioritas(PengumumanPrioritas.SEDANG),
      informasi: countByPrioritas(PengumumanPrioritas.INFORMASI),
      dipinned,
      terjadwal,
    },
    meta: {
      totalData,
      totalPages: Math.max(1, Math.ceil(totalData / PER_PAGE)),
      currentPage: page,
      limit: PER_PAGE,
    },
  };
};

export const getPengumumanDetail = async (id: number) => {
  const row = await prisma.pengumuman.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true } },
      targets: true,
    },
  });
  if (!row) throw new HttpError("Pengumuman tidak ditemukan.", 404);

  const [total, read] = await Promise.all([
    prisma.pengumumanRecipient.count({ where: { pengumuman_id: id } }),
    prisma.pengumumanRecipient.count({
      where: { pengumuman_id: id, read_at: { not: null } },
    }),
  ]);

  const audiens = await buildAudiensLabels(row.targets);
  return formatPengumuman(row, {
    audiens,
    total_penerima: total,
    dibaca: read,
  });
};

export const createPengumuman = async (
  input: CreatePengumumanInput,
  file: Express.Multer.File | undefined,
  createdBy: number,
) => {
  const kategori = await ensureKategoriAktif(input.kategori);
  const targets = uniqueTargets(input.targets);
  const { userIds } = await resolveTargets(targets);
  if (userIds.length === 0) {
    throw new HttpError(
      "Target pengumuman tidak memiliki penerima. Periksa kembali pilihan audiens.",
      400,
    );
  }

  const lampiran = file ? await uploadLampiran(file) : null;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.pengumuman.create({
        data: {
          judul: input.judul,
          isi: input.isi,
          kategori,
          prioritas: input.prioritas,
          scheduled_at:
            input.publish_mode === "scheduled" && input.scheduled_at
              ? new Date(input.scheduled_at)
              : null,
          created_by: createdBy,
          ...(lampiran
            ? {
                lampiran_path: lampiran.path,
                lampiran_name: lampiran.name,
                lampiran_size: lampiran.size,
                lampiran_mime: lampiran.mime,
              }
            : {}),
        },
      });

      await tx.pengumumanTarget.createMany({
        data: targets.map((t) => ({
          pengumuman_id: row.id,
          target_type: t.type,
          ref_id: t.ref_id ?? null,
        })),
      });

      if (input.publish_mode === "now") {
        await publishToRecipients(tx, row.id, row.judul, row.isi, userIds);
      }

      return row;
    });

    return await getPengumumanDetail(created.id);
  } catch (err) {
    // Gagal menyimpan → lampiran ikut dibersihkan (tidak jadi yatim)
    if (lampiran) await removeLampiran(lampiran.path);
    throw err;
  }
};

export const updatePengumuman = async (
  id: number,
  input: UpdatePengumumanInput,
) => {
  const existing = await prisma.pengumuman.findUnique({
    where: { id },
    include: { targets: true },
  });
  if (!existing) throw new HttpError("Pengumuman tidak ditemukan.", 404);

  const sudahTerbit = existing.status === PengumumanStatus.PUBLISHED;
  if (sudahTerbit && (input.targets || input.scheduled_at)) {
    throw new HttpError(
      "Target penerima dan jadwal hanya dapat diubah sebelum pengumuman diterbitkan.",
      400,
    );
  }

  const kategori =
    input.kategori !== undefined
      ? await ensureKategoriAktif(input.kategori)
      : undefined;

  if (input.targets) {
    const { userIds } = await resolveTargets(input.targets);
    if (userIds.length === 0) {
      throw new HttpError(
        "Target pengumuman tidak memiliki penerima. Periksa kembali pilihan audiens.",
        400,
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.pengumuman.update({
      where: { id },
      data: {
        ...(input.judul !== undefined ? { judul: input.judul } : {}),
        ...(input.isi !== undefined ? { isi: input.isi } : {}),
        ...(kategori !== undefined ? { kategori } : {}),
        ...(input.prioritas !== undefined ? { prioritas: input.prioritas } : {}),
        ...(input.scheduled_at !== undefined && input.scheduled_at
          ? { scheduled_at: new Date(input.scheduled_at) }
          : {}),
      },
    });

    if (input.targets) {
      const clean = uniqueTargets(input.targets);
      await tx.pengumumanTarget.deleteMany({ where: { pengumuman_id: id } });
      await tx.pengumumanTarget.createMany({
        data: clean.map((t) => ({
          pengumuman_id: id,
          target_type: t.type,
          ref_id: t.ref_id ?? null,
        })),
      });
    }
  });

  return getPengumumanDetail(id);
};

export const togglePin = async (id: number) => {
  const existing = await prisma.pengumuman.findUnique({
    where: { id },
    select: { id: true, is_pinned: true },
  });
  if (!existing) throw new HttpError("Pengumuman tidak ditemukan.", 404);

  const updated = await prisma.pengumuman.update({
    where: { id },
    data: { is_pinned: !existing.is_pinned },
    select: { id: true, is_pinned: true },
  });
  return updated;
};

/** Terbitkan sekarang (baik dari tombol admin maupun cron jadwal). */
export const publishPengumuman = async (id: number, force = false) => {
  const row = await prisma.pengumuman.findUnique({
    where: { id },
    include: { targets: true },
  });
  if (!row) throw new HttpError("Pengumuman tidak ditemukan.", 404);
  if (row.status === PengumumanStatus.PUBLISHED) {
    if (!force) throw new HttpError("Pengumuman sudah diterbitkan.", 400);
    return getPengumumanDetail(id);
  }

  const targets = row.targets.map((t) => ({
    type: t.target_type as PengumumanTargetInput["type"],
    ref_id: t.ref_id,
  }));
  const { userIds } = await resolveTargets(targets);
  if (userIds.length === 0) {
    throw new HttpError(
      "Target pengumuman tidak memiliki penerima. Periksa kembali pilihan audiens.",
      400,
    );
  }

  await prisma.$transaction(async (tx) => {
    await publishToRecipients(tx, row.id, row.judul, row.isi, userIds);
  });

  return getPengumumanDetail(id);
};

export const deletePengumuman = async (id: number) => {
  const existing = await prisma.pengumuman.findUnique({
    where: { id },
    select: { id: true, lampiran_path: true },
  });
  if (!existing) throw new HttpError("Pengumuman tidak ditemukan.", 404);

  // Cascade DB: target, recipient, dan notifikasi terkait ikut terhapus
  await prisma.pengumuman.delete({ where: { id } });
  if (existing.lampiran_path) await removeLampiran(existing.lampiran_path);
  return { id };
};

// =============================================
// Cron — terbitkan pengumuman terjadwal yang jatuh tempo
// =============================================

export const publishDuePengumuman = async (): Promise<number> => {
  const due = await prisma.pengumuman.findMany({
    where: {
      status: PengumumanStatus.SCHEDULED,
      scheduled_at: { lte: new Date() },
    },
    select: { id: true },
  });

  let published = 0;
  for (const item of due) {
    try {
      await publishPengumuman(item.id, true);
      published += 1;
    } catch (err) {
      console.error(
        `[PENGUMUMAN_CRON] Gagal menerbitkan pengumuman #${item.id}:`,
        err,
      );
    }
  }
  return published;
};

// =============================================
// SISI PENERIMA (mahasiswa / dosen)
// =============================================

interface UserFacets {
  isPeserta: boolean;
  pesertaPeriodes: Set<number>;
  /** kelompok saat user jadi peserta → lokasinya (untuk target DESA) */
  kelompokLokasi: Map<number, number>;
  isDpl: boolean;
  dplPeriodes: Set<number>;
  dplKelompok: Map<number, number>; // kelompok yang dibimbing → lokasinya
  fakultasId: number | null;
}

const loadUserFacets = async (userId: number): Promise<UserFacets> => {
  const [pesertaRows, dplKelompokRows, dplQuotaRows, user] = await Promise.all([
    prisma.kkmPeserta.findMany({
      where: { user_id: userId, status: { not: KkmPesertaStatus.REJECTED } },
      select: { periode_id: true, kelompok_id: true },
    }),
    prisma.kkmKelompok.findMany({
      where: { dpl_id: userId },
      select: { id: true, periode_id: true, lokasi_id: true },
    }),
    prisma.kkmDplQuota.findMany({
      where: { dosen_id: userId },
      select: { periode_id: true },
    }),
    prisma.users.findUnique({
      where: { id: userId },
      select: { fakultas_id: true },
    }),
  ]);

  const pesertaKelompokIds = [
    ...new Set(
      pesertaRows
        .map((r) => r.kelompok_id)
        .filter((k): k is number => typeof k === "number"),
    ),
  ];
  const pesertaKelompok = pesertaKelompokIds.length
    ? await prisma.kkmKelompok.findMany({
        where: { id: { in: pesertaKelompokIds } },
        select: { id: true, lokasi_id: true },
      })
    : [];

  const kelompokLokasi = new Map<number, number>();
  for (const k of pesertaKelompok) kelompokLokasi.set(k.id, k.lokasi_id);
  const dplKelompok = new Map<number, number>();
  for (const k of dplKelompokRows) dplKelompok.set(k.id, k.lokasi_id);

  const isPeserta = pesertaRows.length > 0;
  const isDpl = dplKelompokRows.length > 0 || dplQuotaRows.length > 0;

  return {
    isPeserta,
    pesertaPeriodes: new Set(pesertaRows.map((r) => r.periode_id)),
    kelompokLokasi,
    isDpl,
    dplPeriodes: new Set([
      ...dplKelompokRows.map((k) => k.periode_id),
      ...dplQuotaRows.map((q) => q.periode_id),
    ]),
    dplKelompok,
    fakultasId: user?.fakultas_id ?? null,
  };
};

const isVisibleFor = (
  facets: UserFacets,
  target: { target_type: PengumumanTargetType; ref_id: number | null },
): boolean => {
  const ref = target.ref_id;
  switch (target.target_type) {
    case PengumumanTargetType.PESERTA:
      return facets.isPeserta;
    case PengumumanTargetType.DPL:
      return facets.isDpl;
    case PengumumanTargetType.KELOMPOK:
      return (
        ref != null &&
        (facets.kelompokLokasi.has(ref) || facets.dplKelompok.has(ref))
      );
    case PengumumanTargetType.DESA:
      return (
        ref != null &&
        ([...facets.kelompokLokasi.values(), ...facets.dplKelompok.values()].some(
          (lokasiId) => lokasiId === ref,
        ))
      );
    case PengumumanTargetType.PERIODE:
      return (
        ref != null &&
        (facets.pesertaPeriodes.has(ref) || facets.dplPeriodes.has(ref))
      );
    case PengumumanTargetType.FAKULTAS:
      return (
        ref != null &&
        facets.fakultasId === ref &&
        (facets.isPeserta || facets.isDpl)
      );
    default:
      return false;
  }
};

export const listPengumumanForUser = async (userId: number) => {
  const [rows, facets] = await Promise.all([
    prisma.pengumuman.findMany({
      where: { status: PengumumanStatus.PUBLISHED },
      orderBy: [{ is_pinned: "desc" }, { published_at: "desc" }],
      take: READER_LIST_LIMIT,
      include: {
        creator: { select: { name: true } },
        targets: true,
      },
    }),
    loadUserFacets(userId),
  ]);

  const visible = rows.filter((row) =>
    row.targets.some((t) => isVisibleFor(facets, t)),
  );
  const visibleIds = visible.map((r) => r.id);

  const readRows = visibleIds.length
    ? await prisma.pengumumanRecipient.findMany({
        where: { pengumuman_id: { in: visibleIds }, user_id: userId },
        select: { pengumuman_id: true, read_at: true },
      })
    : [];
  const readMap = new Map(
    readRows.map((r) => [r.pengumuman_id, r.read_at]),
  );

  return visible.map((row) =>
    formatPengumuman(row, { read_at: readMap.get(row.id) ?? null }),
  );
};

export const getPengumumanForUser = async (id: number, userId: number) => {
  const row = await prisma.pengumuman.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true } },
      targets: true,
    },
  });
  if (!row || row.status !== PengumumanStatus.PUBLISHED) {
    throw new HttpError("Pengumuman tidak ditemukan.", 404);
  }

  const facets = await loadUserFacets(userId);
  if (!row.targets.some((t) => isVisibleFor(facets, t))) {
    throw new HttpError(
      "Anda tidak memiliki izin untuk mengakses pengumuman ini.",
      403,
    );
  }

  const recipient = await prisma.pengumumanRecipient.findUnique({
    where: {
      pengumuman_id_user_id: { pengumuman_id: id, user_id: userId },
    },
    select: { read_at: true },
  });

  const audiens = await buildAudiensLabels(row.targets);
  return formatPengumuman(row, {
    audiens,
    read_at: recipient?.read_at ?? null,
    total_penerima: await prisma.pengumumanRecipient.count({
      where: { pengumuman_id: id },
    }),
  });
};

export const markPengumumanRead = async (id: number, userId: number) => {
  const row = await prisma.pengumuman.findUnique({
    where: { id },
    select: { id: true, status: true, targets: true },
  });
  if (!row || row.status !== PengumumanStatus.PUBLISHED) {
    throw new HttpError("Pengumuman tidak ditemukan.", 404);
  }

  const facets = await loadUserFacets(userId);
  if (!row.targets.some((t) => isVisibleFor(facets, t))) {
    throw new HttpError(
      "Anda tidak memiliki izin untuk mengakses pengumuman ini.",
      403,
    );
  }

  const existing = await prisma.pengumumanRecipient.findUnique({
    where: { pengumuman_id_user_id: { pengumuman_id: id, user_id: userId } },
  });

  const now = new Date();
  const recipient = existing
    ? existing.read_at
      ? existing
      : await prisma.pengumumanRecipient.update({
          where: { id: existing.id },
          data: { read_at: now },
        })
    : await prisma.pengumumanRecipient.create({
        data: { pengumuman_id: id, user_id: userId, read_at: now },
      });

  // Sejalkan lonceng notifikasi: notifikasi pengumuman ini ikut terbaca
  await prisma.notifications.updateMany({
    where: { user_id: userId, pengumuman_id: id, is_read: false },
    data: { is_read: true },
  });

  return { read_at: recipient.read_at };
};

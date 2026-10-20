import { prisma } from "../../prisma";
import { KkmPeriodStatus, KkmPesertaStatus } from "../../generated/prisma/enums";
import type { KkmSkemaPortalQuery } from "./kkm-skema.validation";
import type {
  SkemaCard,
  SkemaFilters,
  SkemaPeriodeRef,
  SkemaPortalData,
  SkemaStats,
} from "./kkm-skema.types";

const dayMs = 24 * 60 * 60 * 1000;

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

/**
 * Periode "terbuka" untuk pendaftaran mahasiswa:
 * - status AKTIF atau DIJADWALKAN (bukan DRAFT/SELESAI), DAN
 * - masih dalam jendela pendaftaran (tanggal null = tanpa batas sisi itu).
 */
const isOpenForRegistration = (p: {
  status: KkmPeriodStatus;
  tgl_buka_daftar: Date | null;
  tgl_tutup_daftar: Date | null;
}): boolean => {
  if (p.status !== KkmPeriodStatus.AKTIF && p.status !== KkmPeriodStatus.DIJADWALKAN) {
    return false;
  }
  const now = Date.now();
  if (p.tgl_buka_daftar && now < p.tgl_buka_daftar.getTime()) return false;
  if (p.tgl_tutup_daftar && now > p.tgl_tutup_daftar.getTime()) return false;
  return true;
};

/** Durasi pelaksanaan (hari) dari tgl_pelaksanaan -> tgl_penarikan. */
const deriveDurasiHari = (pelaksanaan: Date | null, penarikan: Date | null): number | null => {
  if (!pelaksanaan || !penarikan) return null;
  const hari = Math.round((penarikan.getTime() - pelaksanaan.getTime()) / dayMs);
  return hari >= 0 ? hari : null;
};

export const getSkemaPortal = async (query: KkmSkemaPortalQuery): Promise<SkemaPortalData> => {
  // 1. Semua periode yang sedang terbuka pendaftarannya.
  const allOpen = await prisma.kkmPeriod.findMany({
    where: { status: { in: [KkmPeriodStatus.AKTIF, KkmPeriodStatus.DIJADWALKAN] } },
    orderBy: { tgl_buka_daftar: "asc" },
    select: {
      id: true,
      nama_periode: true,
      tahun_akademik: true,
      jenis: true,
      deskripsi: true,
      status: true,
      target_peserta: true,
      tgl_buka_daftar: true,
      tgl_tutup_daftar: true,
      tgl_pelaksanaan: true,
      tgl_penarikan: true,
    },
  });

  const open = allOpen.filter((p) =>
    isOpenForRegistration({
      status: p.status,
      tgl_buka_daftar: p.tgl_buka_daftar,
      tgl_tutup_daftar: p.tgl_tutup_daftar,
    }),
  );

  const openIds = open.map((p) => p.id);
  if (openIds.length === 0) {
    return {
      periode_aktif: null,
      skema: [],
      stats: { total_skema: 0, akumulasi_kuota: 0, akumulasi_terisi: 0, batas_akhir: null },
      filters: { jenis: [], wilayah: [] },
    };
  }

  // 2. Agregasi paralel: jumlah peserta per periode (per status) + kabupaten per periode.
  const [pesertaGroups, lokasiRows] = await Promise.all([
    prisma.kkmPeserta.groupBy({
      by: ["periode_id", "status"],
      where: { periode_id: { in: openIds } },
      _count: { _all: true },
    }),
    prisma.kkmLocation.findMany({
      where: { periode_id: { in: openIds } },
      select: { periode_id: true, kabupaten: true },
    }),
  ]);

  const verifiedByPeriode = new Map<number, number>();
  const pendingByPeriode = new Map<number, number>();
  for (const g of pesertaGroups) {
    const n = g._count._all;
    if (g.status === KkmPesertaStatus.VERIFIED) verifiedByPeriode.set(g.periode_id, n);
    else if (g.status === KkmPesertaStatus.PENDING) pendingByPeriode.set(g.periode_id, n);
  }

  const kabupatenByPeriode = new Map<number, Set<string>>();
  for (const l of lokasiRows) {
    const set = kabupatenByPeriode.get(l.periode_id) ?? new Set<string>();
    set.add(l.kabupaten);
    kabupatenByPeriode.set(l.periode_id, set);
  }

  // 3. Bangun kartu.
  const buildCard = (p: (typeof open)[number]): SkemaCard => {
    const terisi = verifiedByPeriode.get(p.id) ?? 0;
    const menunggu = pendingByPeriode.get(p.id) ?? 0;
    const kuota = p.target_peserta;
    const sisa = kuota > 0 ? Math.max(0, kuota - terisi) : 0;
    const persentase = kuota > 0 ? Math.min(100, Math.round((terisi / kuota) * 100)) : 0;

    return {
      id: p.id,
      nama: p.nama_periode,
      deskripsi: p.deskripsi,
      jenis: p.jenis,
      durasi_hari: deriveDurasiHari(p.tgl_pelaksanaan, p.tgl_penarikan),
      tanggal: {
        buka_daftar: iso(p.tgl_buka_daftar),
        tutup_daftar: iso(p.tgl_tutup_daftar),
        pelaksanaan: iso(p.tgl_pelaksanaan),
        penarikan: iso(p.tgl_penarikan),
      },
      kuota,
      terisi,
      menunggu,
      sisa,
      persentase_terisi: persentase,
      wilayah: [...(kabupatenByPeriode.get(p.id) ?? new Set<string>())].sort((a, b) =>
        a.localeCompare(b),
      ),
      batas_daftar: iso(p.tgl_tutup_daftar),
    };
  };

  const cards = open.map(buildCard);

  // 4. Filter jenis & wilayah (opsional).
  const filtered = cards.filter((c) => {
    if (query.jenis && c.jenis !== query.jenis) return false;
    if (query.wilayah) {
      const w = query.wilayah.toLowerCase();
      if (!c.wilayah.some((k) => k.toLowerCase().includes(w))) return false;
    }
    return true;
  });

  // 5. Stats (dari seluruh kartu terbuka — di atas filter, konsisten dgn desain).
  const allBatas = open
    .map((p) => p.tgl_tutup_daftar)
    .filter((d): d is Date => d != null)
    .sort((a, b) => a.getTime() - b.getTime());

  const stats: SkemaStats = {
    total_skema: cards.length,
    akumulasi_kuota: cards.reduce((s, c) => s + c.kuota, 0),
    akumulasi_terisi: cards.reduce((s, c) => s + c.terisi, 0),
    batas_akhir: iso(allBatas[0] ?? null),
  };

  // 6. Opsi filter (dari seluruh kartu terbuka).
  const filters: SkemaFilters = {
    jenis: [...new Set(cards.map((c) => c.jenis))],
    wilayah: [...new Set(cards.flatMap((c) => c.wilayah))].sort((a, b) => a.localeCompare(b)),
  };

  // 7. Periode AKTIF utk label header (fallback: periode terbuka pertama).
  const aktifPeriode = open.find((p) => p.status === KkmPeriodStatus.AKTIF) ?? open[0];
  const periodeAktif: SkemaPeriodeRef = {
    id: aktifPeriode.id,
    nama_periode: aktifPeriode.nama_periode,
    tahun_akademik: aktifPeriode.tahun_akademik,
    jenis: aktifPeriode.jenis,
    status: aktifPeriode.status,
  };

  return { periode_aktif: periodeAktif, skema: filtered, stats, filters };
};

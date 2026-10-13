import { prisma } from "../../prisma";
import { KkmPesertaStatus, KkmPeriodStatus } from "../../generated/prisma/enums";
import { HttpError } from "../../common/errors/http-error";
import type { KkmGenerateConfig } from "./kkm-generate.validation";

// ---------- helpers ----------
function shuffleInPlace<T>(arr: T[], rand = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Interleave per prodi/fakultas biar campur: [TI1, MGT1, PGSD1, TI2, MGT2...]
function interleaveByKey<T>(items: T[], keyFn: (x: T) => string | number): T[] {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const k = String(keyFn(it));
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(it);
  }
  for (const g of groups.values()) shuffleInPlace(g);
  const keys = [...groups.keys()];
  const result: T[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const k of keys) {
      const g = groups.get(k)!;
      if (g.length > 0) {
        result.push(g.shift()!);
        added = true;
      }
    }
  }
  return result;
}

export const getGenerateStats = async (periode_id: number) => {
  const periode = await prisma.kkmPeriod.findUnique({
    where: { id: periode_id },
    select: {
      id: true,
      nama_periode: true,
      tahun_akademik: true,
      minimal_semester: true,
      maks_anggota_kelompok: true,
      status: true,
    },
  });
  if (!periode) throw new HttpError("Periode KKM tidak ditemukan.", 404);

  const [totalPeserta, verified, pending, rejected, belumKelompok, totalDesa, dplTersedia] = await Promise.all([
    prisma.kkmPeserta.count({ where: { periode_id } }),
    prisma.kkmPeserta.count({ where: { periode_id, status: KkmPesertaStatus.VERIFIED } }),
    prisma.kkmPeserta.count({ where: { periode_id, status: KkmPesertaStatus.PENDING } }),
    prisma.kkmPeserta.count({ where: { periode_id, status: KkmPesertaStatus.REJECTED } }),
    prisma.kkmPeserta.count({ where: { periode_id, kelompok_id: null } }),
    prisma.kkmLocation.count({ where: { periode_id } }),
    prisma.kkmKelompok.groupBy({ by: ["dpl_id"], where: { periode_id, dpl_id: { not: null } } }).then((r) => r.length),
  ]);

  // Total DPL DOSEN untuk validasi
  const totalDosenDpl = await prisma.users.count({ where: { roles: { roles: "DOSEN" } } as never });

  // Belum memenuhi syarat semester
  const belumSyarat =
    periode.minimal_semester != null
      ? await prisma.kkmPeserta.count({
          where: {
            periode_id,
            status: KkmPesertaStatus.VERIFIED,
            user: { semester: { lt: periode.minimal_semester } } as never,
          },
        })
      : 0;

  // Prodi tidak seimbang: std dev peserta per prodi tinggi (count per prodi via users)
  const pesertaVerified = await prisma.kkmPeserta.findMany({
    where: { periode_id, status: KkmPesertaStatus.VERIFIED },
    select: { user: { select: { program_studi_id: true } } },
  });
  const prodiCounts = new Map<number | null, number>();
  for (const p of pesertaVerified) {
    const pid = (p.user as unknown as { program_studi_id: number | null }).program_studi_id ?? null;
    prodiCounts.set(pid, (prodiCounts.get(pid) ?? 0) + 1);
  }
  const counts = [...prodiCounts.values()];
  const avg = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
  const variance = counts.length ? counts.reduce((s, c) => s + (c - avg) ** 2, 0) / counts.length : 0;
  const stdDev = Math.sqrt(variance);
  const prodiTidakSeimbang = stdDev > avg * 0.6 && counts.length > 2 ? 2 : 0; // heuristic mirip Figma "2 prodi"

  // Desa hampir penuh: kuota - terisi < 3 (terisi = peserta sudah assign di desa itu)
  const kelompokWithCount = await prisma.kkmKelompok.findMany({
    where: { periode_id },
    select: { id: true, lokasi: { select: { kuota: true } }, _count: { select: { peserta: true } } },
  });
  const desaHampirPenuh = kelompokWithCount.filter((k) => (k.lokasi?.kuota ?? 999) - k._count.peserta < 3 && k.lokasi).length;

  return {
    periode,
    total_peserta: totalPeserta,
    sudah_verified: verified,
    belum_verifikasi: pending,
    belum_kelompok: belumKelompok,
    total_desa: totalDesa,
    total_kelompok: totalDesa, // 1 desa = 1 kelompok
    dpl_tersedia: dplTersedia, // DPL yang sudah punya kelompok
    total_dosen: totalDosenDpl,
    belum_syarat_semester: belumSyarat,
    desa_hampir_penuh: desaHampirPenuh,
    prodi_tidak_seimbang: prodiTidakSeimbang,
    total_rejected: rejected,
    _avg_per_prodi: avg,
    _std_dev: stdDev,
  };
};

export const getValidasi = async (periode_id: number, jumlah_anggota_per_kelompok = 10) => {
  const stats = await getGenerateStats(periode_id);
  const siapDiproses = Math.max(
    0,
    stats.sudah_verified - stats.belum_syarat_semester,
  );
  const warnings: string[] = [];
  const errors: string[] = [];

  if (stats.total_desa === 0) errors.push("Belum ada desa / lokasi di periode ini.");
  if (siapDiproses === 0) errors.push("Tidak ada mahasiswa terverifikasi siap diproses.");

  if (stats.desa_hampir_penuh > 0) warnings.push(`${stats.desa_hampir_penuh} desa hampir mencapai kuota penuh`);
  if (stats.dpl_tersedia === 0 && stats.total_dosen === 0) warnings.push("Belum ada DPL tersedia");
  if (stats.belum_syarat_semester > 0) warnings.push(`${stats.belum_syarat_semester} mahasiswa belum memenuhi syarat semester`);
  if (stats.prodi_tidak_seimbang > 0) warnings.push(`${stats.prodi_tidak_seimbang} prodi memiliki distribusi tidak seimbang`);

  const totalKapasitas = await prisma.kkmLocation
    .aggregate({ where: { periode_id }, _sum: { kuota: true } })
    .then((r) => r._sum.kuota ?? 0);

  // Rekomendasi: jika jumlah_anggota * total_desa < siap -> kurangi anggota atau tambah desa
  const butuhKapasitas = siapDiproses;
  const kapasitasDenganConfig = jumlah_anggota_per_kelompok * stats.total_desa;
  let rekomendasi: string | null = null;
  if (stats.total_desa > 0) {
    const ideal = Math.ceil(siapDiproses / stats.total_desa);
    if (kapasitasDenganConfig < butuhKapasitas) {
      rekomendasi = `Kurangi anggota per kelompok menjadi ${ideal} (butuh ${butuhKapasitas} slot, ${jumlah_anggota_per_kelompok} x ${stats.total_desa} = ${kapasitasDenganConfig} tidak cukup) atau tambah desa.`;
    } else if (jumlah_anggota_per_kelompok > ideal + 1) {
      rekomendasi = `Distribusi lebih merata dengan ${ideal} mahasiswa per kelompok (${stats.total_desa} kelompok x ${ideal} = ${ideal * stats.total_desa}).`;
    }
    if (totalKapasitas > 0 && siapDiproses > totalKapasitas) {
      rekomendasi = `Total kuota desa ${totalKapasitas} < ${siapDiproses} peserta. Tambah kuota desa atau kurangi ke ${ideal} per kelompok.`;
    }
  }

  return {
    siap_diproses: siapDiproses,
    total_desa: stats.total_desa,
    dpl_tersedia: stats.total_dosen,
    desa_hampir_penuh: stats.desa_hampir_penuh,
    belum_syarat: stats.belum_syarat_semester,
    prodi_tidak_seimbang: stats.prodi_tidak_seimbang,
    total_kapasitas_desa: totalKapasitas,
    warnings,
    errors,
    rekomendasi,
    stats,
  };
};

export type GeneratePreviewRow = {
  peserta_id: number;
  user_id: number;
  kelompok_id: number;
  kelompok_nama: string;
  desa: string;
};

// Hasil distribusi tanpa simpan (preview)
export const previewGenerate = async (config: KkmGenerateConfig) => {
  const validasi = await getValidasi(config.periode_id, config.jumlah_anggota_per_kelompok);
  const periode = await prisma.kkmPeriod.findUnique({ where: { id: config.periode_id } });
  if (!periode) throw new HttpError("Periode KKM tidak ditemukan.", 404);

  const kelompokRows = await prisma.kkmKelompok.findMany({
    where: { periode_id: config.periode_id },
    include: { lokasi: { select: { desa: true, kecamatan: true, kuota: true } } },
    orderBy: { nama: "asc" },
  });
  if (kelompokRows.length === 0) throw new HttpError("Belum ada kelompok (desa) di periode ini. Tambah lokasi dulu.", 400);

  const wherePeserta: Record<string, unknown> = {
    periode_id: config.periode_id,
    status: KkmPesertaStatus.VERIFIED,
    kelompok_id: null,
  };
  let peserta = await prisma.kkmPeserta.findMany({
    where: wherePeserta as never,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          nidn_nip: true,
          jenis_kelamin: true,
          semester: true,
          fakultas_id: true,
          program_studi_id: true,
          Fakultas: { select: { nama: true } },
          ProgramStudi: { select: { nama: true } },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  // Filter minimal semester (exclude yang belum syarat)
  if (periode.minimal_semester != null) {
    peserta = peserta.filter((p) => (p.user.semester ?? 99) >= periode.minimal_semester!);
  }

  // placeholder early return diganti di bawah setelah per_kelompok didefinisikan (biar tipe konsisten), handled setelah komputasi

  // Stratify untuk campur prodi/fakultas
  const keyFn =
    config.pola_prodi === "FAKULTAS"
      ? (p: (typeof peserta)[number]) => String(p.user.fakultas_id ?? "null")
      : config.pola_prodi === "RANDOM"
        ? () => String(Math.random())
        : (p: (typeof peserta)[number]) => String(p.user.program_studi_id ?? "null");

  let ordered: typeof peserta;
  if (config.pola_prodi === "RANDOM") {
    ordered = shuffleInPlace([...peserta]);
  } else {
    ordered = interleaveByKey([...peserta], keyFn);
  }

  // Sort kelompok by lokasi_mode
  const kelList = [...kelompokRows];
  if (config.lokasi_mode === "KUOTA") {
    kelList.sort((a, b) => (b.lokasi?.kuota ?? 0) - (a.lokasi?.kuota ?? 0));
  } else {
    shuffleInPlace(kelList);
  }

  const kapasitasPerKelompok = kelList.map((k) =>
    config.ikuti_kuota_desa ? Math.min(k.lokasi?.kuota ?? config.jumlah_anggota_per_kelompok, config.jumlah_anggota_per_kelompok) : config.jumlah_anggota_per_kelompok,
  );

  const terisi = new Array(kelList.length).fill(0) as number[];
  const prodiPerKelompok: Array<Map<string, number>> = kelList.map(() => new Map());
  const genderPerKelompok: Array<{ L: number; P: number }> = kelList.map(() => ({ L: 0, P: 0 }));

  const assignments: GeneratePreviewRow[] = [];
  const perKelompokMembers: Array<typeof peserta> = kelList.map(() => []);

  // Snake order: 0..K-1, K-1..0, 0..K-1 ...
  let snakeForward = true;
  let snakeIdx = 0;
  const nextSnakeIndex = () => {
    if (snakeForward) {
      const v = snakeIdx;
      snakeIdx++;
      if (snakeIdx >= kelList.length) {
        snakeIdx = kelList.length - 1;
        snakeForward = false;
      }
      return v;
    } else {
      const v = snakeIdx;
      snakeIdx--;
      if (snakeIdx < 0) {
        snakeIdx = 0;
        snakeForward = true;
      }
      return v;
    }
  };

  for (const p of ordered) {
    // Cari kelompok dengan slot + skor terendah jika MIN_3_PRODI atau gender_balance
    const needScoring = config.pola_prodi === "MIN_3_PRODI" || config.gender_balance;
    let chosen = -1;

    if (needScoring) {
      let bestScore = Infinity;
      // Cek snake order tapi evaluasi semua yang masih ada slot untuk skor
      for (let i = 0; i < kelList.length; i++) {
        if (terisi[i] >= kapasitasPerKelompok[i]) continue;
        const prodiKey = String(p.user.program_studi_id ?? "null");
        const sameProdi = prodiPerKelompok[i].get(prodiKey) ?? 0;
        const fillRatio = terisi[i] / kapasitasPerKelompok[i];
        const gender = p.user.jenis_kelamin === "Perempuan" ? "P" : "L";
        const g = genderPerKelompok[i];
        const imbalance = Math.abs(g.L - g.P) / Math.max(1, g.L + g.P);
        let score = fillRatio * 0.5 + (sameProdi / Math.max(1, ordered.length / kelList.length)) * 0.3;
        if (config.gender_balance) {
          const wouldBe = gender === "P" ? g.P + 1 : g.L + 1;
          const other = gender === "P" ? g.L : g.P;
          const newImb = Math.abs(wouldBe - other) / Math.max(1, wouldBe + other);
          score += newImb * 0.2;
          // bonus kecil untuk snake order
          score += i * 0.001;
          void imbalance;
        } else {
          void imbalance;
        }
        // Penalti jika kelompok hampir penuh tapi prodi masih <3 dan config MIN_3_PRODI
        if (config.pola_prodi === "MIN_3_PRODI" && terisi[i] >= 6 && prodiPerKelompok[i].size < 3) {
          // prefer kelompok yang belum 3 prodi jika peserta bawa prodi baru
          if (!prodiPerKelompok[i].has(prodiKey)) score -= 0.15;
        }
        if (score < bestScore) {
          bestScore = score;
          chosen = i;
        }
      }
      // Fallback snake jika semua penuh
      if (chosen === -1) {
        // overflow: cari yang paling kecil terisi
        let min = Infinity;
        for (let i = 0; i < kelList.length; i++) {
          if (terisi[i] < min) {
            min = terisi[i];
            chosen = i;
          }
        }
      }
    } else {
      // Pure snake round-robin
      let tries = 0;
      while (tries < kelList.length * 2) {
        const cand = nextSnakeIndex();
        if (terisi[cand] < kapasitasPerKelompok[cand]) {
          chosen = cand;
          break;
        }
        tries++;
      }
      if (chosen === -1) {
        // semua penuh -> overflow ke yang paling kecil
        let min = Infinity;
        for (let i = 0; i < kelList.length; i++) if (terisi[i] < min) { min = terisi[i]; chosen = i; }
      }
    }

    terisi[chosen]++;
    const prodiKey = String(p.user.program_studi_id ?? "null");
    prodiPerKelompok[chosen].set(prodiKey, (prodiPerKelompok[chosen].get(prodiKey) ?? 0) + 1);
    if (p.user.jenis_kelamin === "Perempuan") genderPerKelompok[chosen].P++;
    else genderPerKelompok[chosen].L++;
    perKelompokMembers[chosen].push(p);
    assignments.push({
      peserta_id: p.id,
      user_id: p.user.id,
      kelompok_id: kelList[chosen].id,
      kelompok_nama: kelList[chosen].nama,
      desa: kelList[chosen].lokasi?.desa ?? "",
    });
  }

  const per_kelompok_empty = () =>
    kelList.map((k) => ({
      kelompok_id: k.id,
      nama: k.nama,
      desa: k.lokasi?.desa ?? "",
      kecamatan: k.lokasi?.kecamatan ?? "",
      kuota: k.lokasi?.kuota ?? config.jumlah_anggota_per_kelompok,
      kapasitas_efektif: 0,
      jumlah_anggota: 0,
      gender: { L: 0, P: 0 } as { L: number; P: number },
      prodi_mix: {} as Record<string, number>,
      anggota_preview: [] as Array<{ nim: string | null; nama: string; prodi: string | null; fakultas: string | null; semester: number | null; jenis_kelamin: string | null }>,
    }));

  if (peserta.length === 0) {
    return {
      validasi,
      config,
      total_peserta: 0,
      total_kelompok: kelList.length,
      estimasi_kelompok_akan_dibuat: kelList.length,
      assignments: [] as GeneratePreviewRow[],
      per_kelompok: per_kelompok_empty(),
    };
  }

  const per_kelompok = kelList.map((k, i) => ({
    kelompok_id: k.id,
    nama: k.nama,
    desa: k.lokasi?.desa ?? "",
    kecamatan: k.lokasi?.kecamatan ?? "",
    kuota: k.lokasi?.kuota ?? config.jumlah_anggota_per_kelompok,
    kapasitas_efektif: kapasitasPerKelompok[i],
    jumlah_anggota: terisi[i],
    gender: genderPerKelompok[i],
    prodi_mix: Object.fromEntries(prodiPerKelompok[i].entries()),
    anggota_preview: perKelompokMembers[i].slice(0, 5).map((m) => ({
      nim: m.user.nidn_nip,
      nama: m.user.name,
      prodi: (m.user.ProgramStudi as { nama: string } | null)?.nama ?? null,
      fakultas: (m.user.Fakultas as { nama: string } | null)?.nama ?? null,
      semester: m.user.semester,
      jenis_kelamin: m.user.jenis_kelamin,
    })),
  }));

  return {
    validasi,
    config,
    total_peserta: peserta.length,
    total_kelompok: kelList.length,
    estimasi_kelompok_akan_dibuat: kelList.length, // 1 desa=1 kelompok fix
    assignments,
    per_kelompok,
  };
};

export const executeGenerate = async (config: KkmGenerateConfig, actorId: number) => {
  const periode = await prisma.kkmPeriod.findUnique({ where: { id: config.periode_id } });
  if (!periode) throw new HttpError("Periode KKM tidak ditemukan.", 404);
  if (periode.status === KkmPeriodStatus.SELESAI) throw new HttpError("Periode sudah SELESAI, tidak bisa generate.", 400);

  const preview = await previewGenerate(config);
  if (preview.assignments.length === 0) throw new HttpError("Tidak ada peserta siap generate (VERIFIED + syarat semester).", 400);

  // Optional: assign DPL otomatis (Beban Seimbang / Fakultas / Random)
  // Untuk MVP: hanya distribusi peserta, DPL tetap via /kkm/dpl/assign
  // Jika assign_dpl_otomatis=true dan metode_dpl=BEBAN_SEIMBANG, kita hitung tapi tidak commit DPL otomatis (preview saja)
  // Commit peserta saja dulu.

  // Cek kuota desa jika ikuti_kuota_desa
  if (config.ikuti_kuota_desa) {
    for (const g of preview.per_kelompok) {
      if (g.jumlah_anggota > g.kuota) {
        throw new HttpError(`Kelompok ${g.nama} (${g.desa}) melebihi kuota desa ${g.kuota} (akan isi ${g.jumlah_anggota}). Kurangi anggota/kelompok atau tambah kuota.`, 400);
      }
    }
  }

  // Transaksi massal update kelompok_id
  const updated = await prisma.$transaction(async (tx) => {
    for (const a of preview.assignments) {
      await tx.kkmPeserta.update({ where: { id: a.peserta_id }, data: { kelompok_id: a.kelompok_id } });
    }
    return preview.assignments.length;
  });

  void actorId;

  return {
    updated,
    preview: {
      total_peserta: preview.total_peserta,
      total_kelompok: preview.total_kelompok,
      per_kelompok: preview.per_kelompok.map((g) => ({
        kelompok_id: g.kelompok_id,
        nama: g.nama,
        desa: g.desa,
        jumlah_anggota: g.jumlah_anggota,
      })),
    },
    validasi: preview.validasi,
  };
};

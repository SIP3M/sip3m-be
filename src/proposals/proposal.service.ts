import { supabase } from "../config/storage";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../prisma";
import { HttpError } from "../common/errors/http-error";
import {
  AdminVerificationDecision,
  PengabdianStatus,
  ProposalStatus,
} from "../generated/prisma/enums";
import { recordAudit } from "../audit/audit.service";
import { resolveSkemaForSearch } from "../master/referensi/referensi.service";
import { ROLES } from "../auth/role";
import type { ProposalFiles } from "./proposal.types";
import type {
  AdminVerificationDecisionInput,
  CreateProposalInput,
  EvaluateProposalInput,
  EditProposalInput,
  UpdateProposalStatusInput,
} from "./proposal.validation";

const BUCKET_NAME = "lppm_documents";
const PROPOSALS_PER_PAGE = 5;

const buildProjectCode = (proposalId: number): string => {
  return `PENG-${new Date().getFullYear()}-${proposalId}`;
};

/**
 * Filter `?skema=` — resolve label/kode ke nama kanonis di MasterReferensi;
 * nilai yang tidak dikenal diabaikan (tanpa filter skema), sama seperti
 * perilaku lamanya.
 */
const normalizeSkemaSearch = async (
  value?: string,
): Promise<string | undefined> => {
  if (!value) {
    return undefined;
  }

  return resolveSkemaForSearch(value);
};

const extractFileName = (pathOrUrl: string | null): string | null => {
  if (!pathOrUrl) {
    return null;
  }

  const normalized = pathOrUrl.split("?")[0];
  const fileName = normalized.split("/").pop() ?? null;

  return fileName ? decodeURIComponent(fileName) : null;
};

type UploadedFile = { publicUrl: string; objectPath: string };

const uploadToSupabase = async (
  file: Express.Multer.File,
  folder: string,
  userId: number,
): Promise<UploadedFile> => {
  const sanitizedName = file.originalname.replace(/\s+/g, "_");
  const fileName = `${folder}/${userId}_${Date.now()}_${sanitizedName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw new HttpError(`Gagal mengunggah file: ${error.message}`, 500);
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

  return { publicUrl: data.publicUrl, objectPath: fileName };
};

type UploadedProposalFiles = {
  proposalFilePath: string | null;
  rabFilePath: string | null;
  /** Path objek di storage — dipakai untuk membuang file bila langkah berikutnya gagal. */
  uploadedObjectPaths: string[];
};

const uploadProposalFiles = async (
  files: ProposalFiles | undefined,
  userId: number,
): Promise<UploadedProposalFiles> => {
  const uploadedObjectPaths: string[] = [];
  let proposalFilePath: string | null = null;
  let rabFilePath: string | null = null;

  if (files?.proposal_file?.[0]) {
    const uploaded = await uploadToSupabase(
      files.proposal_file[0],
      "proposals",
      userId,
    );
    proposalFilePath = uploaded.publicUrl;
    uploadedObjectPaths.push(uploaded.objectPath);
  }

  if (files?.rab_file?.[0]) {
    const uploaded = await uploadToSupabase(files.rab_file[0], "rabs", userId);
    rabFilePath = uploaded.publicUrl;
    uploadedObjectPaths.push(uploaded.objectPath);
  }

  return { proposalFilePath, rabFilePath, uploadedObjectPaths };
};

/**
 * Buang file yang baru terupload bila langkah sesudahnya gagal (mis. INSERT
 * ke database error) supaya tidak menumpuk sebagai file orphan di storage.
 * Selalu menelan error — pembersihan tidak boleh menutupi error aslinya.
 */
const removeUploadedFiles = async (objectPaths: string[]): Promise<void> => {
  if (objectPaths.length === 0) {
    return;
  }

  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(objectPaths);
    if (error) {
      console.error(
        "[PROPOSAL_CLEANUP] Gagal menghapus file sementara:",
        error.message,
      );
    }
  } catch (cleanupError) {
    console.error(
      "[PROPOSAL_CLEANUP] Gagal menghapus file sementara:",
      cleanupError,
    );
  }
};

/**
 * Jalankan langkah tulis ke database; bila gagal, buang file yang baru
 * terupload dulu lalu lempar error aslinya kembali.
 */
const withUploadedFileCleanup = async <T>(
  objectPaths: string[],
  write: () => Promise<T>,
): Promise<T> => {
  try {
    return await write();
  } catch (error) {
    await removeUploadedFiles(objectPaths);
    throw error;
  }
};

export const createProposal = async (
  userId: number,
  input: CreateProposalInput,
  files: ProposalFiles | undefined,
) => {
  const isDraft = input.is_draft;
  const status = isDraft ? ProposalStatus.DRAFT : ProposalStatus.SUBMITTED;

  // Jika bukan draft (submit), file wajib ada — dicek SEBELUM upload supaya
  // tidak ada file yang terupload lalu ditinggalkan saat validasi ini gagal.
  if (!isDraft && (!files?.proposal_file?.[0] || !files?.rab_file?.[0])) {
    throw new HttpError(
      "File Proposal dan RAB wajib diunggah untuk melakukan Submit.",
      400,
    );
  }

  const {
    proposalFilePath,
    rabFilePath,
    uploadedObjectPaths,
  } = await uploadProposalFiles(files, userId);

  const proposal = await withUploadedFileCleanup(uploadedObjectPaths, () =>
    prisma.proposals.create({
      data: {
        title: input.title,
        faculty: input.faculty,
        skema: input.skema,
        sumber_pendanaan: input.sumber_pendanaan,
        funding_request_amount: input.funding_request_amount,
        sumber_data_penelitian: input.sumber_data_penelitian,
        detail_sumber_penelitian: input.detail_sumber_penelitian,
        tujuan_penelitian: input.tujuan_penelitian,
        metode_penelitian: input.metode_penelitian,
        abstrak: input.abstrak,
        instansi: input.instansi,
        dosen_terlibat: input.dosen_terlibat,
        nidn_dosen_terlibat: input.nidn_dosen_terlibat,
        nama_anggota: input.nama_anggota,
        nim_anggota: input.nim_anggota,
        nama_ketua: input.nama_ketua?.trim() ? input.nama_ketua.trim() : null,
        nidn_ketua: input.nidn_ketua?.trim() ? input.nidn_ketua.trim() : null,
        status,
        lead_researcher_id: userId,
        proposal_file_path: proposalFilePath,
        rab_file_path: rabFilePath,
        submitted_at: isDraft ? null : new Date(),
      },
    }),
  );

  return {
    message: isDraft ? "Draf berhasil disimpan." : "Proposal berhasil dikirim.",
    data: proposal,
  };
};

export const getAllProposals = async ({
  page,
  search,
  skema,
  tahun,
  status,
}: {
  page: number;
  search?: string;
  skema?: string;
  tahun?: number;
  status?: ProposalStatus;
}) => {
  const skip = (page - 1) * PROPOSALS_PER_PAGE;
  const skemaSearchFromSearch = await normalizeSkemaSearch(search);
  const skemaFilterNormalized = await normalizeSkemaSearch(skema);

  const andFilters: Prisma.proposalsWhereInput[] = [];

  if (status) {
    andFilters.push({ status });
  }

  if (skemaFilterNormalized) {
    andFilters.push({ skema: skemaFilterNormalized });
  }

  if (tahun) {
    const startDate = new Date(`${tahun}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${tahun + 1}-01-01T00:00:00.000Z`);
    andFilters.push({
      created_at: {
        gte: startDate,
        lt: endDate,
      },
    });
  }

  const orFilters: Prisma.proposalsWhereInput[] = [];
  if (search) {
    orFilters.push(
      {
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        faculty: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        nama_ketua: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        nidn_ketua: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        user: {
          is: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
      {
        user: {
          is: {
            nidn_nip: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
    );

    if (skemaSearchFromSearch) {
      orFilters.push({ skema: skemaSearchFromSearch });
    }
  }

  if (orFilters.length > 0) {
    andFilters.push({ OR: orFilters });
  }

  const whereClause: Prisma.proposalsWhereInput =
    andFilters.length > 0 ? { AND: andFilters } : {};

  const [totalData, rawData] = await prisma.$transaction([
    prisma.proposals.count({ where: whereClause }),
    prisma.proposals.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        lead_researcher_id: true,
        faculty: true,
        funding_request_amount: true,
        status: true,
        skema: true,
        sumber_pendanaan: true,
        sumber_data_penelitian: true,
        detail_sumber_penelitian: true,
        tujuan_penelitian: true,
        metode_penelitian: true,
        abstrak: true,
        instansi: true,
        nama_ketua: true,
        nidn_ketua: true,
        proposal_file_path: true,
        rab_file_path: true,
        submitted_at: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            name: true,
            nidn_nip: true,
          },
        },
        // Ringkasan review terbaru — untuk tooltip & popup di daftar proposal
        reviews: {
          select: {
            id: true,
            status: true,
            total_score: true,
            decision: true,
            rekomendasi_akhir: true,
            kekuatan_proposal: true,
            kelemahan_proposal: true,
            notes: true,
            created_at: true,
            reviewer: {
              select: { name: true },
            },
          },
          orderBy: { created_at: "desc" },
          take: 1,
        },
        // Status klaim verifikasi administrasi (pool bersama)
        admin_verifier_id: true,
        admin_claimed_at: true,
        admin_verifier: {
          select: { id: true, name: true },
        },
        // Penugasan reviewer (plotting) — nama reviewer hasil auto/manual
        // supaya FE bisa menampilkan siapa reviewer pada tiap proposal.
        reviewers: {
          orderBy: { created_at: "desc" },
          take: 1,
          select: {
            created_at: true,
            reviewer: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
      skip,
      take: PROPOSALS_PER_PAGE,
    }),
  ]);

  const data = rawData.map(({ reviewers, ...proposal }) => ({
    ...proposal,
    assigned_reviewer: reviewers[0]
      ? {
          name: reviewers[0].reviewer.name,
          assigned_at: reviewers[0].created_at,
        }
      : null,
  }));

  return {
    data,
    meta: {
      totalData,
      totalPages: Math.max(1, Math.ceil(totalData / PROPOSALS_PER_PAGE)),
      currentPage: page,
      limit: PROPOSALS_PER_PAGE,
    },
  };
};

export const getAssignedProposalsForReviewer = async ({
  reviewerId,
  page,
  search,
  status,
}: {
  reviewerId: number;
  page: number;
  search?: string;
  status?: ProposalStatus;
}) => {
  const skip = (page - 1) * PROPOSALS_PER_PAGE;
  const skemaSearch = await normalizeSkemaSearch(search);
  const effectiveStatus = status ?? ProposalStatus.UNDER_REVIEW;

  const orFilters: Prisma.proposalsWhereInput[] = [];
  if (search) {
    orFilters.push(
      {
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        faculty: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        nama_ketua: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        nidn_ketua: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        user: {
          is: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
      {
        user: {
          is: {
            nidn_nip: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
    );
  }

  if (skemaSearch) {
    orFilters.push({ skema: skemaSearch });
  }

  const whereClause: Prisma.proposalsWhereInput = {
    status: effectiveStatus,
    reviewers: {
      some: {
        reviewer_id: reviewerId,
      },
    },
    ...(orFilters.length > 0 ? { OR: orFilters } : {}),
  };

  const [totalData, rawData] = await prisma.$transaction([
    prisma.proposals.count({ where: whereClause }),
    prisma.proposals.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        lead_researcher_id: true,
        faculty: true,
        funding_request_amount: true,
        status: true,
        skema: true,
        sumber_pendanaan: true,
        sumber_data_penelitian: true,
        detail_sumber_penelitian: true,
        tujuan_penelitian: true,
        metode_penelitian: true,
        abstrak: true,
        instansi: true,
        nama_ketua: true,
        nidn_ketua: true,
        proposal_file_path: true,
        rab_file_path: true,
        submitted_at: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            name: true,
            nidn_nip: true,
          },
        },
        reviewers: {
          where: {
            reviewer_id: reviewerId,
          },
          select: {
            created_at: true,
          },
          take: 1,
        },
      },
      orderBy: { created_at: "desc" },
      skip,
      take: PROPOSALS_PER_PAGE,
    }),
  ]);

  const data = rawData.map(({ reviewers, ...proposal }) => ({
    ...proposal,
    assigned_at: reviewers[0]?.created_at ?? null,
  }));

  return {
    data,
    meta: {
      totalData,
      totalPages: Math.max(1, Math.ceil(totalData / PROPOSALS_PER_PAGE)),
      currentPage: page,
      limit: PROPOSALS_PER_PAGE,
    },
  };
};

export const getMyProposals = async ({
  userId,
  page,
  search,
  status,
}: {
  userId: number;
  page: number;
  search?: string;
  status?: ProposalStatus;
}) => {
  const skip = (page - 1) * PROPOSALS_PER_PAGE;
  const skemaSearch = await normalizeSkemaSearch(search);

  const orFilters: Prisma.proposalsWhereInput[] = [];
  if (search) {
    orFilters.push(
      {
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        faculty: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        nama_ketua: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        nidn_ketua: {
          contains: search,
          mode: "insensitive",
        },
      },
    );
  }

  if (skemaSearch) {
    orFilters.push({ skema: skemaSearch });
  }

  const whereClause: Prisma.proposalsWhereInput = {
    lead_researcher_id: userId,
    ...(status ? { status } : {}),
    ...(orFilters.length > 0 ? { OR: orFilters } : {}),
  };

  const [totalData, data] = await prisma.$transaction([
    prisma.proposals.count({ where: whereClause }),
    prisma.proposals.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        lead_researcher_id: true,
        faculty: true,
        funding_request_amount: true,
        status: true,
        skema: true,
        sumber_pendanaan: true,
        sumber_data_penelitian: true,
        detail_sumber_penelitian: true,
        tujuan_penelitian: true,
        metode_penelitian: true,
        abstrak: true,
        instansi: true,
        nama_ketua: true,
        nidn_ketua: true,
        proposal_file_path: true,
        rab_file_path: true,
        submitted_at: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            name: true,
            nidn_nip: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      skip,
      take: PROPOSALS_PER_PAGE,
    }),
  ]);

  return {
    data,
    meta: {
      totalData,
      totalPages: Math.max(1, Math.ceil(totalData / PROPOSALS_PER_PAGE)),
      currentPage: page,
      limit: PROPOSALS_PER_PAGE,
    },
  };
};

export const getProposalById = async (proposalId: number) => {
  const proposal = await prisma.proposals.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      title: true,
      lead_researcher_id: true,
      faculty: true,
      funding_request_amount: true,
      status: true,
      skema: true,
      sumber_pendanaan: true,
      sumber_data_penelitian: true,
      detail_sumber_penelitian: true,
      tujuan_penelitian: true,
      metode_penelitian: true,
      abstrak: true,
      instansi: true,
      dosen_terlibat: true,
      nidn_dosen_terlibat: true,
      nama_anggota: true,
      nim_anggota: true,
      nama_ketua: true,
      nidn_ketua: true,
      proposal_file_path: true,
      rab_file_path: true,
      submitted_at: true,
      created_at: true,
      updated_at: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          nidn_nip: true,
        },
      },
      // === TAMBAHAN BARU: Ambil hasil review beserta catatan revisinya ===
      // Catatan: Jika tulisan "proposalReviews" error/merah di kodemu,
      // coba ganti huruf P depannya menjadi kapital ("ProposalReviews") sesuai nama relasi di schema.prisma kamu.
      reviews: {
        select: {
          id: true,
          status: true,
          kekuatan_proposal: true,
          kelemahan_proposal: true,
          rekomendasi_akhir: true,
          notes: true,
          created_at: true,
          reviewer: {
            select: { name: true },
          },
        },
        orderBy: { created_at: "desc" }, // Ambil revisi yang paling baru di urutan teratas
      },
      // Verifikasi administrasi: klaim aktif + riwayat keputusan
      admin_verifier_id: true,
      admin_claimed_at: true,
      admin_verifier: {
        select: { id: true, name: true },
      },
      adminVerifications: {
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          decision: true,
          catatan: true,
          checklist: true,
          created_at: true,
          verifier: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!proposal) {
    throw new HttpError("Proposal tidak ditemukan.", 404);
  }

  return proposal;
};

export const editProposal = async (
  proposalId: number,
  userId: number,
  input: EditProposalInput,
  files: ProposalFiles | undefined,
) => {
  const existingProposal = await prisma.proposals.findUnique({
    where: { id: proposalId },
  });

  if (!existingProposal) {
    throw new HttpError("Proposal tidak ditemukan.", 404);
  }

  if (existingProposal.lead_researcher_id !== userId) {
    throw new HttpError(
      "Anda tidak memiliki izin untuk mengedit proposal ini.",
      403,
    );
  }

  // === PERUBAHAN 1: Izinkan edit untuk DRAFT dan REVISION ===
  if (
    existingProposal.status !== ProposalStatus.DRAFT &&
    existingProposal.status !== ProposalStatus.REVISION &&
    existingProposal.status !== ProposalStatus.ADMIN_REVISION
  ) {
    throw new HttpError(
      "Hanya proposal berstatus DRAFT, REVISION, atau ADMIN_REVISION yang dapat diedit.",
      400,
    );
  }

  // === PERUBAHAN 2: Perbaiki logika penentuan status ===
  // Jika input.is_draft bernilai true (hanya simpan/edit, tidak submit),
  // maka statusnya tetap menggunakan status yang sekarang (DRAFT atau REVISION).
  // Jika bernilai false (tombol submit ditekan), ubah menjadi SUBMITTED.
  const isDraft = input.is_draft ?? true;
  const newStatus = isDraft
    ? existingProposal.status
    : ProposalStatus.SUBMITTED;

  // === Validasi anti-double untuk edit: gabungkan existing + input agar partial update tetap ke-detect ===
  {
    const eff = {
      dosen_terlibat: input.dosen_terlibat !== undefined ? input.dosen_terlibat : (existingProposal as unknown as Record<string, string | null>).dosen_terlibat ?? undefined,
      nidn_dosen_terlibat: input.nidn_dosen_terlibat !== undefined ? input.nidn_dosen_terlibat : (existingProposal as unknown as Record<string, string | null>).nidn_dosen_terlibat ?? undefined,
      nama_ketua: input.nama_ketua !== undefined ? input.nama_ketua : (existingProposal as unknown as Record<string, string | null>).nama_ketua ?? undefined,
      nidn_ketua: input.nidn_ketua !== undefined ? input.nidn_ketua : (existingProposal as unknown as Record<string, string | null>).nidn_ketua ?? undefined,
      nama_anggota: input.nama_anggota !== undefined ? input.nama_anggota : (existingProposal as unknown as Record<string, string | null>).nama_anggota ?? undefined,
      nim_anggota: input.nim_anggota !== undefined ? input.nim_anggota : (existingProposal as unknown as Record<string, string | null>).nim_anggota ?? undefined,
    } as Record<string, string | undefined>;
    const split = (v?: string) => (v ? v.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean) : []);
    const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
    const normId = (s: string) => s.trim().toLowerCase();
    const dosenNames = split(eff.dosen_terlibat);
    const nidnDosens = split(eff.nidn_dosen_terlibat);
    // Opsi A: 5 dosen + 5 mahasiswa terpisah (ketua tidak hitung)
    const MAX_DOSEN = 5;
    const MAX_MHS = 5;
    if (dosenNames.length > MAX_DOSEN) throw new HttpError(`Maksimal ${MAX_DOSEN} dosen terlibat. Saat ini ${dosenNames.length}.`, 400);
    if (nidnDosens.length > MAX_DOSEN) throw new HttpError(`Maksimal ${MAX_DOSEN} NIDN dosen. Saat ini ${nidnDosens.length}.`, 400);
    if (dosenNames.length > 0 && nidnDosens.length > 0 && dosenNames.length !== nidnDosens.length) throw new HttpError(`Jumlah NIDN (${nidnDosens.length}) harus sama dengan jumlah nama dosen (${dosenNames.length}).`, 400);
    // duplikat dalam dosen anggota
    {
      const seen = new Set<string>();
      for (const raw of dosenNames) { const n = norm(raw); if (seen.has(n)) throw new HttpError(`Nama dosen "${raw.trim()}" duplikat di daftar anggota. Tiap dosen hanya boleh 1 kali.`, 400); seen.add(n); }
    }
    {
      const seen = new Set<string>();
      for (const raw of nidnDosens) { const n = normId(raw); if (!n) continue; if (seen.has(n)) throw new HttpError(`NIDN "${raw.trim()}" duplikat di daftar anggota.`, 400); seen.add(n); }
    }
    const ketuaNama = eff.nama_ketua?.trim();
    if (ketuaNama && dosenNames.some((x) => norm(x) === norm(ketuaNama))) throw new HttpError(`Ketua peneliti "${ketuaNama}" sudah ada di daftar anggota dosen. Tidak boleh double.`, 400);
    const ketuaNidn = eff.nidn_ketua?.trim();
    if (ketuaNidn && nidnDosens.some((x) => normId(x) === normId(ketuaNidn))) throw new HttpError(`NIDN ketua "${ketuaNidn}" sudah ada di daftar anggota.`, 400);
    const mhsNames = split(eff.nama_anggota);
    const nims = split(eff.nim_anggota);
    if (mhsNames.length > MAX_MHS) throw new HttpError(`Maksimal ${MAX_MHS} mahasiswa terlibat. Saat ini ${mhsNames.length}.`, 400);
    if (nims.length > MAX_MHS) throw new HttpError(`Maksimal ${MAX_MHS} NIM mahasiswa. Saat ini ${nims.length}.`, 400);
    if (mhsNames.length > 0 && nims.length > 0 && mhsNames.length !== nims.length) throw new HttpError(`Jumlah NIM (${nims.length}) harus sama dengan jumlah nama mahasiswa (${mhsNames.length}).`, 400);
    {
      const seen = new Set<string>();
      for (const raw of mhsNames) { const n = norm(raw); if (seen.has(n)) throw new HttpError(`Nama anggota "${raw.trim()}" duplikat.`, 400); seen.add(n); }
    }
    {
      const seen = new Set<string>();
      for (const raw of nims) { const n = normId(raw); if (!n) continue; if (seen.has(n)) throw new HttpError(`NIM "${raw.trim()}" duplikat.`, 400); seen.add(n); }
    }
  }

  // Jika submit (bukan draft), pastikan file tersedia — dicek SEBELUM upload
  // supaya validasi yang gagal tidak meninggalkan file orphan di storage.
  if (!isDraft) {
    const willHaveProposalFile =
      Boolean(files?.proposal_file?.[0]) ||
      Boolean(existingProposal.proposal_file_path);
    const willHaveRabFile =
      Boolean(files?.rab_file?.[0]) ||
      Boolean(existingProposal.rab_file_path);
    if (!willHaveProposalFile || !willHaveRabFile) {
      throw new HttpError(
        "File Proposal dan RAB wajib diunggah untuk melakukan Submit.",
        400,
      );
    }
  }

  const {
    proposalFilePath,
    rabFilePath,
    uploadedObjectPaths,
  } = await uploadProposalFiles(files, userId);

  const updatedProposal = await withUploadedFileCleanup(
    uploadedObjectPaths,
    () =>
      prisma.proposals.update({
        where: { id: proposalId },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.faculty !== undefined && { faculty: input.faculty }),
          ...(input.skema !== undefined && { skema: input.skema }),
          ...(input.funding_request_amount !== undefined && {
            funding_request_amount: input.funding_request_amount,
          }),
          ...(input.sumber_data_penelitian !== undefined && {
            sumber_data_penelitian: input.sumber_data_penelitian,
          }),
          ...(input.detail_sumber_penelitian !== undefined && {
            detail_sumber_penelitian: input.detail_sumber_penelitian,
          }),
          ...(input.tujuan_penelitian !== undefined && {
            tujuan_penelitian: input.tujuan_penelitian,
          }),
          ...(input.metode_penelitian !== undefined && {
            metode_penelitian: input.metode_penelitian,
          }),
          ...(input.abstrak !== undefined && { abstrak: input.abstrak }),
          ...(input.nama_ketua !== undefined && {
            nama_ketua: input.nama_ketua?.trim()
              ? input.nama_ketua.trim()
              : null,
          }),
          ...(input.nidn_ketua !== undefined && {
            nidn_ketua: input.nidn_ketua?.trim() ? input.nidn_ketua.trim() : null,
          }),
          ...(input.sumber_pendanaan !== undefined && {
            sumber_pendanaan: input.sumber_pendanaan,
          }),
          ...(input.instansi !== undefined && { instansi: input.instansi }),
          status: newStatus,
          proposal_file_path:
            proposalFilePath || existingProposal.proposal_file_path,
          rab_file_path: rabFilePath || existingProposal.rab_file_path,
          submitted_at: !isDraft ? new Date() : existingProposal.submitted_at,
        },
      }),
  );

  return {
    message: isDraft
      ? "Proposal berhasil diperbarui."
      : "Proposal berhasil diperbarui dan dikirim ulang.",
    data: {
      ...updatedProposal,
      file_info: {
        proposal_file: {
          previous_path: existingProposal.proposal_file_path,
          previous_name: extractFileName(
            existingProposal.proposal_file_path || "",
          ),
          current_path: updatedProposal.proposal_file_path,
          current_name: extractFileName(
            updatedProposal.proposal_file_path || "",
          ),
          replaced: Boolean(proposalFilePath),
        },
        rab_file: {
          previous_path: existingProposal.rab_file_path,
          previous_name: extractFileName(existingProposal.rab_file_path || ""),
          current_path: updatedProposal.rab_file_path,
          current_name: extractFileName(updatedProposal.rab_file_path || ""),
          replaced: Boolean(rabFilePath),
        },
      },
    },
  };
};

export const deleteProposal = async (proposalId: number, userId: number) => {
  const existingProposal = await prisma.proposals.findUnique({
    where: { id: proposalId },
  });

  if (!existingProposal) {
    throw new HttpError("Proposal tidak ditemukan.", 404);
  }

  if (existingProposal.lead_researcher_id !== userId) {
    throw new HttpError(
      "Anda tidak memiliki izin untuk menghapus proposal ini.",
      403,
    );
  }

  if (existingProposal.status !== ProposalStatus.DRAFT) {
    throw new HttpError(
      "Hanya proposal dengan status DRAFT yang dapat dihapus.",
      400,
    );
  }

  await prisma.proposals.delete({
    where: { id: proposalId },
  });

  return {
    message: "Proposal berhasil dihapus.",
  };
};

// =============================================
// Submit Proposal (Dosen)
// DRAFT → SUBMITTED, REVISION → SUBMITTED
// =============================================
export const submitProposal = async (proposalId: number, userId: number) => {
  const proposal = await prisma.proposals.findUnique({
    where: { id: proposalId },
  });

  if (!proposal) {
    throw new HttpError("Proposal tidak ditemukan.", 404);
  }

  if (proposal.lead_researcher_id !== userId) {
    throw new HttpError(
      "Anda tidak memiliki izin untuk mengirim proposal ini.",
      403,
    );
  }

  if (
    proposal.status !== ProposalStatus.DRAFT &&
    proposal.status !== ProposalStatus.REVISION &&
    proposal.status !== ProposalStatus.ADMIN_REVISION
  ) {
    throw new HttpError(
      "Hanya proposal berstatus DRAFT, REVISION, atau ADMIN_REVISION yang dapat disubmit.",
      400,
    );
  }

  // File wajib ada saat submit
  if (!proposal.proposal_file_path || !proposal.rab_file_path) {
    throw new HttpError(
      "File Proposal dan RAB wajib diunggah sebelum melakukan Submit.",
      400,
    );
  }

  // Ke-4 field naratif wajib terisi sebelum submit final
  const fieldKurang: string[] = [];
  if (!proposal.detail_sumber_penelitian?.trim())
    fieldKurang.push("Detail Sumber Data Penelitian");
  if (!proposal.tujuan_penelitian?.trim()) fieldKurang.push("Tujuan Penelitian");
  if (!proposal.metode_penelitian?.trim()) fieldKurang.push("Metode Penelitian");
  if (!proposal.abstrak?.trim()) fieldKurang.push("Abstrak");
  if (fieldKurang.length > 0) {
    throw new HttpError(
      `Lengkapi isian berikut sebelum submit: ${fieldKurang.join(", ")}.`,
      400,
    );
  }

  const updatedProposal = await prisma.proposals.update({
    where: { id: proposalId },
    data: {
      status: ProposalStatus.SUBMITTED,
      submitted_at: new Date(),
    },
  });

  return {
    message: "Proposal berhasil disubmit.",
    data: updatedProposal,
  };
};

// =============================================
// Update Status Proposal (Admin & Reviewer)
// Transisi berdasarkan role pengguna
// =============================================
const ROLE_STATUS_TRANSITIONS: Record<
  string,
  Partial<Record<ProposalStatus, ProposalStatus[]>>
> = {
  KETUA_LPPM: {
    // SUBMITTED dipindah ke endpoint verifikasi administrasi (override Ketua),
    // agar setiap keputusan menyimpan checklist + jejak verifikator.
    // Keputusan akhir: hanya Ketua LPPM yang menentukan Diterima/Tolak
    // setelah reviewer memberi rekomendasi (status REVIEW_DONE).
    [ProposalStatus.REVIEW_DONE]: [
      ProposalStatus.ACCEPTED,
      ProposalStatus.REJECTED,
    ],
  },
  // STAFF_LPPM TIDAK lagi boleh memutuskan verifikasi administratif:
  // keputusan itu wajib lewat endpoint /proposals/:id/admin-verification
  // supaya checklist & riwayatnya tercatat. Plotting reviewer tetap milik staff.
  STAFF_LPPM: {},
  REVIEWER: {
    [ProposalStatus.ADMIN_VERIFIED]: [ProposalStatus.UNDER_REVIEW],
    // Reviewer TIDAK punya hak menetapkan ACCEPTED/REJECTED —
    // keputusan final ada di tangan Ketua LPPM (REVIEW_DONE → ACCEPTED/REJECTED).
    [ProposalStatus.UNDER_REVIEW]: [ProposalStatus.REVISION],
  },
  REVIEWER_EKSTERNAL: {
    [ProposalStatus.ADMIN_VERIFIED]: [ProposalStatus.UNDER_REVIEW],
    [ProposalStatus.UNDER_REVIEW]: [ProposalStatus.REVISION],
  },
};

export const updateProposalStatus = async (
  proposalId: number,
  userId: number,
  userRole: string,
  input: UpdateProposalStatusInput,
) => {
  const proposal = await prisma.proposals.findUnique({
    where: { id: proposalId },
  });

  if (!proposal) {
    throw new HttpError("Proposal tidak ditemukan.", 404);
  }

  const currentStatus = proposal.status;
  const newStatus = input.status as ProposalStatus;

  // Validasi transisi berdasarkan role
  const roleTransitions = ROLE_STATUS_TRANSITIONS[userRole];
  if (!roleTransitions) {
    throw new HttpError(
      "Role Anda tidak memiliki izin untuk mengubah status proposal.",
      403,
    );
  }

  const allowedStatuses = roleTransitions[currentStatus];
  if (!allowedStatuses || !allowedStatuses.includes(newStatus)) {
    throw new HttpError(
      `Tidak dapat mengubah status dari ${currentStatus} ke ${newStatus} dengan role ${userRole}.`,
      400,
    );
  }

  // Buat pesan notifikasi terlebih dahulu (sebelum transaksi)
  let notifTitle: string;
  let notifMessage: string;

  switch (newStatus) {
    case ProposalStatus.ADMIN_VERIFIED:
      notifTitle = "Proposal Terverifikasi";
      notifMessage = `Proposal "${proposal.title}" telah diverifikasi oleh Ketua LPPM dan siap untuk ditinjau oleh Reviewer.`;
      break;
    case ProposalStatus.UNDER_REVIEW:
      notifTitle = "Proposal Sedang Ditinjau";
      notifMessage = `Proposal "${proposal.title}" sedang dalam proses peninjauan oleh Reviewer.`;
      break;
    case ProposalStatus.REVISION:
      notifTitle = "Proposal Perlu Revisi";
      notifMessage = `Proposal "${proposal.title}" memerlukan revisi dari Reviewer.${input.notes ? ` Catatan Reviewer: ${input.notes}` : ""}`;
      break;
    case ProposalStatus.ACCEPTED:
      notifTitle = "Proposal Diterima 🎉";
      notifMessage = `Selamat! Proposal "${proposal.title}" telah diterima dan disetujui. Proyek pengabdian Anda telah dibuat secara otomatis.`;
      break;
    case ProposalStatus.REJECTED:
      notifTitle = "Proposal Ditolak";
      notifMessage = `Mohon maaf, proposal "${proposal.title}" tidak dapat diterima.${input.notes ? ` Catatan: ${input.notes}` : ""}`;
      break;
    default:
      notifTitle = "Update Status Proposal";
      notifMessage = `Status proposal "${proposal.title}" telah diubah menjadi ${newStatus}.`;
  }

  // Jalankan semua operasi DB secara atomik dalam satu transaksi
  const result = await prisma.$transaction(async (tx) => {
    // 1. Update status proposal
    const updatedProposal = await tx.proposals.update({
      where: { id: proposalId },
      data: { status: newStatus },
    });

    // 2. Simpan riwayat review — HANYA untuk aksi reviewer.
    // Keputusan admin (verifikasi administratif, keputusan akhir ACCEPTED/REJECTED)
    // tidak boleh menulis baris ProposalReviews: baris itu berisi nama admin sebagai
    // "reviewer" dan akan menimpa tab "Catatan Reviewer" (latestReview).
    if (userRole === ROLES.REVIEWER || userRole === ROLES.REVIEWER_EKSTERNAL) {
      await tx.proposalReviews.create({
        data: {
          proposal_id: proposalId,
          reviewer_id: userId,
          status: newStatus,
          notes: input.notes ?? "",
        },
      });
    }

    // 3. Simpan notifikasi untuk Dosen (lead researcher)
    await tx.notifications.create({
      data: {
        user_id: proposal.lead_researcher_id,
        title: notifTitle,
        message: notifMessage,
      },
    });

    // 4. Jika proposal ACCEPTED, otomatis buat PengabdianProject + Milestones default
    if (newStatus === ProposalStatus.ACCEPTED) {
      // Pastikan proyek belum pernah dibuat sebelumnya (idempotent guard)
      const existingProject = await tx.pengabdianProjects.findUnique({
        where: { proposal_id: proposalId },
      });

      if (!existingProject) {
        // 4a. Buat record PengabdianProject (lengkap dengan project_code)
        const newProject = await tx.pengabdianProjects.create({
          data: {
            proposal_id: proposalId,
            title: proposal.title,
            status: PengabdianStatus.PENDING,
            project_code: buildProjectCode(proposalId),
          },
        });

        // 4b. Buat 4 milestone default sesuai spesifikasi
        await tx.pengabdianMilestones.createMany({
          data: [
            {
              project_id: newProject.id,
              sequence: 1,
              title: "Tanda Tangan Kontrak",
              target_percentage: 0,
              status: "PENDING",
            },
            {
              project_id: newProject.id,
              sequence: 2,
              title: "Laporan Kemajuan 1",
              target_percentage: 30,
              status: "PENDING",
            },
            {
              project_id: newProject.id,
              sequence: 3,
              title: "Laporan Kemajuan 2",
              target_percentage: 70,
              status: "PENDING",
            },
            {
              project_id: newProject.id,
              sequence: 4,
              title: "Laporan Akhir",
              target_percentage: 100,
              status: "PENDING",
            },
          ],
        });
      }
    }

    return updatedProposal;
  });

  return {
    message: `Status proposal berhasil diubah dari ${currentStatus} ke ${newStatus}.${newStatus === ProposalStatus.ACCEPTED ? " Proyek pengabdian dan milestone default telah dibuat secara otomatis." : ""}`,
    data: result,
  };
};

// =============================================
// Plotting reviewer — otomatis (bulk) & manual
// =============================================

type ReviewerCandidateRow = {
  id: number;
  name: string;
  faculty: string | null;
  /** Fakultas reviewer sama dengan fakultas proposal (kandidat utama auto). */
  is_sebidang: boolean;
  /** Jumlah proposal yang sedang/melewati direview reviewer ini. */
  beban: number;
  /** false = ditampilkan tapi tidak bisa dipilih (konflik kepentingan). */
  eligible: boolean;
  alasan: string[];
};

/** Blob nama anggota tim untuk cek konflik kepentingan (case-insensitive). */
const buildTeamNameBlob = (proposal: {
  dosen_terlibat?: string | null;
  nama_anggota?: string | null;
}): string =>
  `${proposal.dosen_terlibat ?? ""}\n${proposal.nama_anggota ?? ""}`.toLowerCase();

/**
 * Normalisasi nama fakultas untuk pencocokan sebidang.
 * Data tidak konsisten di lapangan: `proposal.faculty` ada yang "Teknik"
 * dan ada yang "Fakultas Teknik", sementara tabel master Fakultas selalu
 * ber-prefix "Fakultas ". Tanpa normalisasi ini, plotting otomatis untuk
 * proposal "Teknik" tidak menemukan reviewer sebidang sama sekali.
 */
const normalizeFacultyNama = (value: string | null | undefined): string =>
  (value ?? "")
    .trim()
    .replace(/^fakultas\s+/i, "")
    .replace(/\s+/g, " ")
    .toUpperCase();

const isConflictOfInterest = (teamBlob: string, reviewerName: string): boolean =>
  teamBlob.includes(reviewerName.toLowerCase());

/**
 * Daftar kandidat reviewer untuk SATU proposal — dipakai FE untuk
 * pemilihan reviewer manual (plotting manual).
 *
 * Aturan (konsisten dengan auto):
 * - Kandidat: user aktif dengan role REVIEWER / REVIEWER_EKSTERNAL.
 * - Konflik kepentingan (ketua peneliti / anggota tim) → eligible=false
 *   tetapi tetap ditampilkan agar admin tahu alasannya.
 * - Lintas fakultas DIIZINKAN (is_sebidang=false) — admin boleh memilih
 *   ahli lintas bidang; urutkan sebidang dulu, lalu beban paling ringan.
 * - Untuk proposal yang SUDAH terplot, daftar tetap dikembalikan agar
 *   FE dapat alur ubah penugasan (reassign).
 */
export const getReviewerCandidatesService = async (proposalId: number) => {
  const proposal = await prisma.proposals.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      title: true,
      faculty: true,
      status: true,
      lead_researcher_id: true,
      dosen_terlibat: true,
      nama_anggota: true,
    },
  });

  if (!proposal) {
    throw new HttpError("Proposal tidak ditemukan.", 404);
  }

  const candidates = await prisma.users.findMany({
    where: {
      roles: { roles: { in: ["REVIEWER", "REVIEWER_EKSTERNAL"] } },
      is_active: true,
    },
    select: {
      id: true,
      name: true,
      Fakultas: { select: { nama: true } },
      _count: { select: { reviewers: true } },
    },
    orderBy: { name: "asc" },
  });

  const teamBlob = buildTeamNameBlob(proposal);
  const proposalFaculty = normalizeFacultyNama(proposal.faculty);

  const rows: ReviewerCandidateRow[] = candidates.map((reviewer) => {
    const faculty = reviewer.Fakultas?.nama ?? null;
    const alasan: string[] = [];

    if (reviewer.id === proposal.lead_researcher_id) {
      alasan.push("Konflik kepentingan: ketua peneliti pada proposal ini.");
    } else if (isConflictOfInterest(teamBlob, reviewer.name)) {
      alasan.push("Konflik kepentingan: tercatat sebagai anggota tim.");
    }

    return {
      id: reviewer.id,
      name: reviewer.name,
      faculty,
      is_sebidang:
        Boolean(proposal.faculty) &&
        normalizeFacultyNama(faculty) === proposalFaculty,
      beban: reviewer._count.reviewers,
      eligible: alasan.length === 0,
      alasan,
    };
  });

  rows.sort((a, b) => {
    if (a.is_sebidang !== b.is_sebidang) return a.is_sebidang ? -1 : 1;
    if (a.beban !== b.beban) return a.beban - b.beban;
    return a.name.localeCompare(b.name);
  });

  return {
    message: "Berhasil mengambil kandidat reviewer.",
    data: {
      proposal: {
        id: proposal.id,
        title: proposal.title,
        faculty: proposal.faculty,
        status: proposal.status,
      },
      candidates: rows,
    },
  };
};

/**
 * Assign reviewer MANUAL untuk satu proposal — hanya berlaku selama
 * proposal BELUM terplot. Bila sudah ada reviewer, permintaan ini
 * ditolak dengan 409 — gunakan reassignReviewerService (PUT
 * /proposals/:id/reviewer) untuk mengganti reviewer.
 *
 * Validasi: reviewer aktif + role REVIEWER/REVIEWER_EKSTERNAL;
 * konflik kepentingan DIBLOKIR; lintas fakultas diizinkan.
 * Efek sama dengan auto: simpan relasi, status → UNDER_REVIEW, notifikasi.
 */
export const assignReviewerManualService = async (
  proposalId: number,
  reviewerId: number,
) => {
  const proposal = await prisma.proposals.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      title: true,
      status: true,
      faculty: true,
      lead_researcher_id: true,
      dosen_terlibat: true,
      nama_anggota: true,
    },
  });

  if (!proposal) {
    throw new HttpError("Proposal tidak ditemukan.", 404);
  }

  const existingAssignment = await prisma.proposalReviewers.findFirst({
    where: { proposal_id: proposalId },
    select: { reviewer_id: true },
  });
  if (existingAssignment) {
    throw new HttpError(
      "Proposal sudah terplot reviewer — gunakan ubah penugasan (PUT /proposals/:id/reviewer) untuk mengganti reviewer.",
      409,
    );
  }

  if (proposal.status !== ProposalStatus.ADMIN_VERIFIED) {
    throw new HttpError(
      `Plotting reviewer hanya bisa dilakukan setelah proposal lolos verifikasi administrasi (status ADMIN_VERIFIED). Status saat ini: ${proposal.status}.`,
      409,
    );
  }

  const reviewer = await prisma.users.findFirst({
    where: {
      id: reviewerId,
      is_active: true,
      roles: { roles: { in: ["REVIEWER", "REVIEWER_EKSTERNAL"] } },
    },
    select: {
      id: true,
      name: true,
      Fakultas: { select: { nama: true } },
    },
  });

  if (!reviewer) {
    throw new HttpError(
      "Reviewer tidak ditemukan, tidak aktif, atau bukan reviewer/reviewer eksternal.",
      404,
    );
  }

  const teamBlob = buildTeamNameBlob(proposal);
  if (reviewer.id === proposal.lead_researcher_id) {
    throw new HttpError(
      `Konflik kepentingan: "${reviewer.name}" adalah ketua peneliti pada proposal ini.`,
      409,
    );
  }
  if (isConflictOfInterest(teamBlob, reviewer.name)) {
    throw new HttpError(
      `Konflik kepentingan: "${reviewer.name}" tercatat sebagai anggota tim pada proposal ini.`,
      409,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // Cek ulang di dalam transaksi agar tidak ada plot ganda
    // pada dua request yang berbarengan.
    const stillFree = await tx.proposalReviewers.findFirst({
      where: { proposal_id: proposalId },
      select: { id: true },
    });
    if (stillFree) {
      throw new HttpError(
        "Proposal sudah terplot reviewer — gunakan ubah penugasan (PUT /proposals/:id/reviewer) untuk mengganti reviewer.",
        409,
      );
    }

    await tx.proposalReviewers.create({
      data: { proposal_id: proposalId, reviewer_id: reviewer.id },
    });

    const updatedProposal =
      proposal.status === ProposalStatus.UNDER_REVIEW
        ? { status: proposal.status }
        : await tx.proposals.update({
            where: { id: proposalId },
            data: { status: ProposalStatus.UNDER_REVIEW },
          });

    await tx.notifications.createMany({
      data: [
        {
          user_id: reviewer.id,
          title: "Penugasan Review Proposal",
          message: `Admin LPPM menugaskan Anda mereview proposal "${proposal.title}".`,
        },
        {
          user_id: proposal.lead_researcher_id,
          title: "Proposal Sedang Ditinjau",
          message: `Proposal Anda "${proposal.title}" sedang ditinjau.`,
        },
      ],
    });

    return updatedProposal;
  });

  const facultyName = reviewer.Fakultas?.nama ?? null;
  const isSebidang =
    Boolean(proposal.faculty) &&
    normalizeFacultyNama(facultyName) === normalizeFacultyNama(proposal.faculty);

  return {
    message: `Reviewer "${reviewer.name}" ditugaskan ke proposal "${proposal.title}". Status proposal menjadi UNDER_REVIEW.`,
    data: {
      proposalId: proposal.id,
      status: result.status,
      reviewer: {
        id: reviewer.id,
        name: reviewer.name,
        faculty: facultyName,
        is_sebidang: isSebidang,
      },
    },
  };
};

/**
 * Ubah (reassign) reviewer pada proposal yang SUDAH terplot.
 * Aturan validasi sama dengan assign manual: reviewer aktif + role
 * REVIEWER/REVIEWER_EKSTERNAL; konflik kepentingan DIBLOKIR; lintas
 * fakultas diizinkan. Keputusan produk: TANPA notifikasi in-app —
 * notifikasi hanya untuk penugasan awal.
 */
export const reassignReviewerService = async (
  proposalId: number,
  reviewerId: number,
) => {
  const proposal = await prisma.proposals.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      title: true,
      status: true,
      faculty: true,
      lead_researcher_id: true,
      dosen_terlibat: true,
      nama_anggota: true,
    },
  });

  if (!proposal) {
    throw new HttpError("Proposal tidak ditemukan.", 404);
  }

  const existingAssignment = await prisma.proposalReviewers.findFirst({
    where: { proposal_id: proposalId },
    select: { id: true, reviewer_id: true },
  });
  if (!existingAssignment) {
    throw new HttpError(
      "Proposal belum terplot reviewer — gunakan assign manual (POST /proposals/:id/reviewer).",
      409,
    );
  }
  if (existingAssignment.reviewer_id === reviewerId) {
    throw new HttpError(
      "Reviewer tersebut sudah menjadi reviewer proposal ini.",
      409,
    );
  }

  const reviewer = await prisma.users.findFirst({
    where: {
      id: reviewerId,
      is_active: true,
      roles: { roles: { in: ["REVIEWER", "REVIEWER_EKSTERNAL"] } },
    },
    select: {
      id: true,
      name: true,
      Fakultas: { select: { nama: true } },
    },
  });

  if (!reviewer) {
    throw new HttpError(
      "Reviewer tidak ditemukan, tidak aktif, atau bukan reviewer/reviewer eksternal.",
      404,
    );
  }

  const teamBlob = buildTeamNameBlob(proposal);
  if (reviewer.id === proposal.lead_researcher_id) {
    throw new HttpError(
      `Konflik kepentingan: "${reviewer.name}" adalah ketua peneliti pada proposal ini.`,
      409,
    );
  }
  if (isConflictOfInterest(teamBlob, reviewer.name)) {
    throw new HttpError(
      `Konflik kepentingan: "${reviewer.name}" tercatat sebagai anggota tim pada proposal ini.`,
      409,
    );
  }

  await prisma.$transaction(async (tx) => {
    // Cek ulang di dalam transaksi agar tidak race dengan aksi lain.
    const stillAssigned = await tx.proposalReviewers.findFirst({
      where: { proposal_id: proposalId },
      select: { id: true },
    });
    if (!stillAssigned) {
      throw new HttpError(
        "Proposal belum terplot reviewer — gunakan assign manual (POST /proposals/:id/reviewer).",
        409,
      );
    }

    // Perbarui reviewer + waktu penugasan (direfleksikan sebagai
    // assigned_reviewer.assigned_at di daftar proposal).
    await tx.proposalReviewers.update({
      where: { id: stillAssigned.id },
      data: { reviewer_id: reviewer.id, created_at: new Date() },
    });
  });

  const facultyName = reviewer.Fakultas?.nama ?? null;
  const isSebidang =
    Boolean(proposal.faculty) &&
    normalizeFacultyNama(facultyName) ===
      normalizeFacultyNama(proposal.faculty);

  return {
    message: `Penugasan reviewer proposal "${proposal.title}" diubah menjadi "${reviewer.name}".`,
    data: {
      proposalId: proposal.id,
      status: proposal.status,
      reviewer: {
        id: reviewer.id,
        name: reviewer.name,
        faculty: facultyName,
        is_sebidang: isSebidang,
      },
    },
  };
};

export const autoAssignReviewerService = async (
  proposalIds: number[],
  reviewerId?: number,
) => {
  const successResults = [];
  const errorResults = [];

  // Plotting massal MANUAL: satu reviewer pilihan admin untuk semua
  // proposal. Divalidasi sekali di awal — bila reviewer tidak valid,
  // seluruh request ditolak (404) karena semua item pasti gagal.
  let fixedReviewer: {
    id: number;
    name: string;
    Fakultas: { nama: string } | null;
  } | null = null;
  if (reviewerId !== undefined) {
    const found = await prisma.users.findFirst({
      where: {
        id: reviewerId,
        is_active: true,
        roles: { roles: { in: ["REVIEWER", "REVIEWER_EKSTERNAL"] } },
      },
      select: {
        id: true,
        name: true,
        Fakultas: { select: { nama: true } },
      },
    });
    if (!found) {
      throw new HttpError(
        "Reviewer tidak ditemukan, tidak aktif, atau bukan reviewer/reviewer eksternal.",
        404,
      );
    }
    fixedReviewer = found;
  }

  // Lakukan looping pada semua ID yang dikirimkan
  for (const proposalId of proposalIds) {
    try {
      // 1. Cek proposal
      const proposal = await prisma.proposals.findUnique({
        where: { id: proposalId },
      });

      if (!proposal) {
        throw new Error(`Proposal ID ${proposalId} tidak ditemukan.`);
      }

      // Jalur manual: cek "sudah terplot" mendahului cek status agar
      // alasan gagal paling relevan (sudah terplot → arahkan ke PUT).
      if (fixedReviewer) {
        const alreadyPlotted = await prisma.proposalReviewers.findFirst({
          where: { proposal_id: proposalId },
          select: { id: true },
        });
        if (alreadyPlotted) {
          throw new Error(
            `Proposal ID ${proposalId} sudah terplot reviewer — gunakan ubah penugasan (PUT /proposals/:id/reviewer).`,
          );
        }
      }

      if (proposal.status !== ProposalStatus.ADMIN_VERIFIED) {
        throw new Error(
          `Proposal ID ${proposalId} belum lolos verifikasi administrasi (status: ${proposal.status}).`,
        );
      }

      // 2. Pilih reviewer — jalur manual (reviewerId diisi admin) atau auto.
      let selectedReviewer: { id: number; name: string };
      if (fixedReviewer) {
        // Konflik kepentingan DIBLOKIR per proposal (lintas fakultas boleh).
        const teamBlob = buildTeamNameBlob(proposal);
        if (fixedReviewer.id === proposal.lead_researcher_id) {
          throw new Error(
            `Konflik kepentingan: "${fixedReviewer.name}" adalah ketua peneliti pada proposal ini.`,
          );
        }
        if (isConflictOfInterest(teamBlob, fixedReviewer.name)) {
          throw new Error(
            `Konflik kepentingan: "${fixedReviewer.name}" tercatat sebagai anggota tim pada proposal ini.`,
          );
        }

        selectedReviewer = fixedReviewer;
      } else {
        if (!proposal.faculty) {
          throw new Error(
            `Proposal ID ${proposalId} tidak memiliki data fakultas.`,
          );
        }

        // Cari candidate reviewer aktif, sebidang, dan bukan ketua.
        // Pencocokan fakultas dinormalisasi (lihat normalizeFacultyNama):
        // proposal "Teknik" tetap cocok dengan master "Fakultas Teknik".
        const candidateReviewers = await prisma.users.findMany({
          where: {
            roles: { roles: { in: ["REVIEWER", "REVIEWER_EKSTERNAL"] } },
            id: { not: proposal.lead_researcher_id },
            is_active: true,
          },
          select: {
            id: true,
            name: true,
            Fakultas: { select: { nama: true } },
            _count: { select: { reviewers: true } },
          },
        });

        const proposalFaculty = normalizeFacultyNama(proposal.faculty);
        const sebidangReviewers = candidateReviewers.filter(
          (reviewer) =>
            normalizeFacultyNama(reviewer.Fakultas?.nama) === proposalFaculty,
        );

        if (sebidangReviewers.length === 0) {
          throw new Error(
            `Tidak ada reviewer tersedia untuk Fakultas ${proposal.faculty}.`,
          );
        }

        // Filter Konflik Kepentingan (Anggota tim)
        const dosenTerlibat = (proposal.dosen_terlibat || "").toLowerCase();
        const namaAnggota = (proposal.nama_anggota || "").toLowerCase();
        const allTeamNames = `${dosenTerlibat}\n${namaAnggota}`;

        const safeReviewers = sebidangReviewers.filter((reviewer) => {
          return !allTeamNames.includes(reviewer.name.toLowerCase());
        });

        if (safeReviewers.length === 0) {
          throw new Error(
            `Semua reviewer sebidang untuk Proposal ID ${proposalId} mengalami konflik kepentingan.`,
          );
        }

        // Urutkan beban kerja (Load Balancing)
        safeReviewers.sort((a, b) => a._count.reviewers - b._count.reviewers);
        selectedReviewer = safeReviewers[0];
      }

      // 5. Eksekusi Database dalam Transaksi
      await prisma.$transaction(async (tx) => {
        await tx.proposalReviewers.create({
          data: {
            proposal_id: proposalId,
            reviewer_id: selectedReviewer.id,
          },
        });

        const updatedProposal = await tx.proposals.update({
          where: { id: proposalId },
          data: { status: ProposalStatus.UNDER_REVIEW },
        });

        await tx.notifications.createMany({
          data: [
            {
              user_id: selectedReviewer.id,
              title: "Penugasan Review Proposal",
              message: `Sistem menugaskan Anda mereview proposal "${proposal.title}".`,
            },
            {
              user_id: proposal.lead_researcher_id,
              title: "Proposal Sedang Ditinjau",
              message: `Proposal Anda "${proposal.title}" sedang ditinjau.`,
            },
          ],
        });

        return updatedProposal;
      });

      // Jika berhasil, masukkan ke daftar sukses
      successResults.push({
        proposalId,
        title: proposal.title,
        reviewerId: selectedReviewer.id,
        reviewerName: selectedReviewer.name,
      });
    } catch (error: unknown) {
      // Jika terjadi error pada SATU proposal tertentu, masukkan ke daftar gagal, namun proses (loop) untuk proposal lainnya tetap lanjut.
      errorResults.push({
        proposalId,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Mengembalikan hasil rekapan (Summary)
  return {
    message: `Proses penugasan selesai. ${successResults.length} berhasil, ${errorResults.length} gagal.`,
    data: {
      success: successResults,
      failed: errorResults,
    },
  };
};

const calculateTotalScore = (input: {
  score_perumusan: number;
  score_tinjauan: number;
  score_metode: number;
  score_anggaran: number;
  score_luaran: number;
}): number => {
  // Rata-rata terbobot — bobot sama dengan form reviewer (FE ReviewDetailPage):
  // perumusan 20%, tinjauan 20%, metode 25%, anggaran 15%, luaran 20% → skala 0–100
  const weighted =
    input.score_perumusan * 0.2 +
    input.score_tinjauan * 0.2 +
    input.score_metode * 0.25 +
    input.score_anggaran * 0.15 +
    input.score_luaran * 0.2;

  return Number(weighted.toFixed(1));
};

export const evaluateProposal = async (
  proposalId: number,
  reviewerId: number,
  input: EvaluateProposalInput,
) => {
  const proposal = await prisma.proposals.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      title: true,
      status: true,
      lead_researcher_id: true,
    },
  });

  if (!proposal) {
    throw new HttpError("Proposal tidak ditemukan.", 404);
  }

  // Review hanya boleh dilakukan saat proposal masih dalam proses review.
  // REVIEW_DONE = sudah direview menunggu keputusan admin; ACCEPTED/REJECTED =
  // keputusan final. Tanpa guard ini reviewer bisa meninjau ulang dan
  // mengubah keputusan final tanpa melalui Ketua LPPM.
  if (
    proposal.status === ProposalStatus.REVIEW_DONE ||
    proposal.status === ProposalStatus.ACCEPTED ||
    proposal.status === ProposalStatus.REJECTED
  ) {
    throw new HttpError(
      proposal.status === ProposalStatus.REVIEW_DONE
        ? "Proposal sudah direview dan menunggu keputusan akhir Ketua LPPM."
        : "Proposal sudah mendapatkan keputusan final dan tidak dapat direview ulang.",
      400,
    );
  }

  const assignment = await prisma.proposalReviewers.findFirst({
    where: {
      proposal_id: proposalId,
      reviewer_id: reviewerId,
    },
    select: { id: true },
  });

  if (!assignment) {
    throw new HttpError(
      "Anda tidak ditugaskan untuk mereview proposal ini.",
      403,
    );
  }

  const existingReview = await prisma.proposalReviews.findFirst({
    where: {
      proposal_id: proposalId,
      reviewer_id: reviewerId,
    },
  });

  if (input.is_draft) {
    const reviewStatus = existingReview?.status ?? ProposalStatus.UNDER_REVIEW;

    const draftData: Prisma.ProposalReviewsUncheckedCreateInput = {
      proposal_id: proposalId,
      reviewer_id: reviewerId,
      status: reviewStatus,
      notes: input.notes ?? existingReview?.notes ?? "",
      score_perumusan:
        input.score_perumusan ?? existingReview?.score_perumusan ?? null,
      score_tinjauan:
        input.score_tinjauan ?? existingReview?.score_tinjauan ?? null,
      score_metode: input.score_metode ?? existingReview?.score_metode ?? null,
      score_anggaran:
        input.score_anggaran ?? existingReview?.score_anggaran ?? null,
      score_luaran: input.score_luaran ?? existingReview?.score_luaran ?? null,
      catatan_perumusan:
        input.catatan_perumusan ?? existingReview?.catatan_perumusan ?? null,
      catatan_tinjauan:
        input.catatan_tinjauan ?? existingReview?.catatan_tinjauan ?? null,
      catatan_metode:
        input.catatan_metode ?? existingReview?.catatan_metode ?? null,
      catatan_anggaran:
        input.catatan_anggaran ?? existingReview?.catatan_anggaran ?? null,
      catatan_luaran:
        input.catatan_luaran ?? existingReview?.catatan_luaran ?? null,
      total_score:
        input.score_perumusan !== undefined &&
        input.score_tinjauan !== undefined &&
        input.score_metode !== undefined &&
        input.score_anggaran !== undefined &&
        input.score_luaran !== undefined
          ? calculateTotalScore({
              score_perumusan: input.score_perumusan,
              score_tinjauan: input.score_tinjauan,
              score_metode: input.score_metode,
              score_anggaran: input.score_anggaran,
              score_luaran: input.score_luaran,
            })
          : (existingReview?.total_score ?? null),
      kekuatan_proposal:
        input.kekuatan_proposal ?? existingReview?.kekuatan_proposal ?? null,
      kelemahan_proposal:
        input.kelemahan_proposal ?? existingReview?.kelemahan_proposal ?? null,
      rekomendasi_akhir:
        input.rekomendasi_akhir ?? existingReview?.rekomendasi_akhir ?? null,
    };

    const savedDraft = existingReview
      ? await prisma.proposalReviews.update({
          where: { id: existingReview.id },
          data: draftData,
        })
      : await prisma.proposalReviews.create({ data: draftData });

    return {
      message: "Draft penilaian berhasil disimpan.",
      data: savedDraft,
    };
  }

  if (proposal.status !== ProposalStatus.UNDER_REVIEW) {
    throw new HttpError(
      `Proposal belum dapat disubmit review. Status saat ini: ${proposal.status}.`,
      400,
    );
  }

  const finalTotalScore = calculateTotalScore({
    score_perumusan: input.score_perumusan,
    score_tinjauan: input.score_tinjauan,
    score_metode: input.score_metode,
    score_anggaran: input.score_anggaran,
    score_luaran: input.score_luaran,
  });

  // Determine proposal status based on decision
  // Revisi tetap langsung ke REVISION (loop revisi dosen).
  // APPROVED = rekomendasi "Layak Didanai" → menunggu keputusan akhir Ketua LPPM.
  // REJECTED = "Tidak Layak Didanai" → keputusan final reviewer (langsung ditolak).
  const getProposalStatusFromDecision = (decision: string | null | undefined): ProposalStatus => {
    if (!decision) return ProposalStatus.UNDER_REVIEW;
    
    if (decision === "APPROVED") {
      return ProposalStatus.REVIEW_DONE;
    } else if (decision === "REJECTED") {
      return ProposalStatus.REJECTED;
    } else if (decision === "REVISION_MINOR" || decision === "REVISION_MAJOR") {
      return ProposalStatus.REVISION;
    }
    return ProposalStatus.UNDER_REVIEW;
  };

  const newProposalStatus = input.decision
    ? getProposalStatusFromDecision(input.decision as string)
    : ProposalStatus.UNDER_REVIEW;

  const result = await prisma.$transaction(async (tx) => {
    const reviewData: Prisma.ProposalReviewsUncheckedCreateInput = {
      proposal_id: proposalId,
      reviewer_id: reviewerId,
      status: input.status,
      notes: input.notes ?? "",
      score_perumusan: input.score_perumusan,
      score_tinjauan: input.score_tinjauan,
      score_metode: input.score_metode,
      score_anggaran: input.score_anggaran,
      score_luaran: input.score_luaran,
      catatan_perumusan: input.catatan_perumusan ?? null,
      catatan_tinjauan: input.catatan_tinjauan ?? null,
      catatan_metode: input.catatan_metode ?? null,
      catatan_anggaran: input.catatan_anggaran ?? null,
      catatan_luaran: input.catatan_luaran ?? null,
      total_score: finalTotalScore,
      kekuatan_proposal: input.kekuatan_proposal,
      kelemahan_proposal: input.kelemahan_proposal,
      rekomendasi_akhir: input.rekomendasi_akhir,
      decision: input.decision ?? null,
      completed_at: new Date(),
      revision_deadline: input.revision_deadline ? new Date(input.revision_deadline) : null,
    };

    const review = existingReview
      ? await tx.proposalReviews.update({
          where: { id: existingReview.id },
          data: reviewData,
        })
      : await tx.proposalReviews.create({ data: reviewData });

    const updatedProposal = await tx.proposals.update({
      where: { id: proposalId },
      data: {
        status: newProposalStatus,
      },
    });

    // Buat notifikasi untuk pemilik proposal
    let notifTitle = "Proposal Sudah Direview";
    let notifMessage = `Proposal "${proposal.title}" telah direview reviewer dengan hasil ${input.decision ?? "PENDING"}.`;

    if (newProposalStatus === ProposalStatus.REVIEW_DONE) {
      notifTitle = "Review Selesai — Menunggu Keputusan";
      notifMessage = `Proposal "${proposal.title}" telah direview dan direkomendasikan LAYAK DIDANAI. Keputusan akhir (diterima/tidak) menunggu persetujuan Ketua LPPM.`;
    } else if (input.decision === "REJECTED" || newProposalStatus === ProposalStatus.REJECTED) {
      notifTitle = "Proposal Ditolak";
      notifMessage = `Maaf, Proposal "${proposal.title}" telah ditolak oleh reviewer karena tidak layak didanai.`;
    } else if (input.decision === "REVISION_MINOR" || input.decision === "REVISION_MAJOR") {
      notifTitle = "Proposal Perlu Revisi";
      const revisionType = input.decision === "REVISION_MINOR" ? "kecil" : "besar";
      notifMessage = `Proposal "${proposal.title}" perlu revisi ${revisionType}. Silakan perbaiki sesuai dengan catatan reviewer.`;
    }

    await tx.notifications.create({
      data: {
        user_id: proposal.lead_researcher_id,
        title: notifTitle,
        message: notifMessage,
      },
    });

    // Catatan: pembuatan otomatis PengabdianProject + Milestones TIDAK dilakukan
    // di sini. Proyek hanya dibuat saat Ketua LPPM mengambil keputusan akhir
    // ACCEPTED melalui updateProposalStatus.

    return {
      review,
      proposal: updatedProposal,
    };
  });

  return {
    message: "Penilaian proposal berhasil disubmit.",
    data: result,
  };
};

export const getProposalReviews = async (proposalId: number) => {
  const proposal = await prisma.proposals.findUnique({
    where: { id: proposalId },
  });

  if (!proposal) {
    throw new HttpError("Proposal tidak ditemukan.", 404);
  }

  const reviews = await prisma.proposalReviews.findMany({
    where: { proposal_id: proposalId },
    orderBy: { created_at: "asc" },
    include: {
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return reviews;
};

// =============================================
// Verifikasi Administrasi (REVIEWER_ADMINISTRASI)
// Gate wajib sebelum proposal boleh di-plotting ke reviewer substansi.
// =============================================

const CHECKLIST_JENIS = "CHECKLIST_ADMINISTRASI";

/** Checklist kelengkapan aktif dari MasterReferensi (jenis CHECKLIST_ADMINISTRASI). */
export const getAdminVerificationChecklist = async () => {
  const items = await prisma.masterReferensi.findMany({
    where: { jenis: CHECKLIST_JENIS, is_aktif: true },
    orderBy: [{ urut: "asc" }, { nama: "asc" }],
    select: { id: true, nama: true, urut: true },
  });

  return items.map((item) => ({
    kode: String(item.id),
    label: item.nama,
    urut: item.urut,
  }));
};

/** Proposal yang boleh masuk antrean verifikasi administrasi. */
const ADMIN_QUEUE_STATUSES: ProposalStatus[] = [
  ProposalStatus.SUBMITTED,
  ProposalStatus.ADMIN_REVISION,
];

const adminQueueSelect = {
  id: true,
  title: true,
  lead_researcher_id: true,
  faculty: true,
  funding_request_amount: true,
  status: true,
  skema: true,
  proposal_file_path: true,
  rab_file_path: true,
  submitted_at: true,
  created_at: true,
  updated_at: true,
  admin_verifier_id: true,
  admin_claimed_at: true,
  admin_verifier: { select: { id: true, name: true } },
  user: { select: { name: true, nidn_nip: true } },
  adminVerifications: {
    orderBy: { created_at: "desc" as const },
    take: 1,
    select: {
      decision: true,
      catatan: true,
      created_at: true,
      verifier: { select: { name: true } },
    },
  },
} satisfies Prisma.proposalsSelect;

export const getAdminVerificationQueue = async ({
  page,
  search,
  skema,
  adminStatus,
  userId,
}: {
  page: number;
  search?: string;
  skema?: string;
  adminStatus?: "unclaimed" | "mine" | "all";
  userId: number;
}) => {
  const skip = (page - 1) * PROPOSALS_PER_PAGE;
  const skemaFilterNormalized = await normalizeSkemaSearch(skema);

  const andFilters: Prisma.proposalsWhereInput[] = [
    { status: { in: ADMIN_QUEUE_STATUSES } },
  ];

  if (skemaFilterNormalized) {
    andFilters.push({ skema: skemaFilterNormalized });
  }

  if (adminStatus === "unclaimed") {
    andFilters.push({ admin_verifier_id: null });
  } else if (adminStatus === "mine") {
    andFilters.push({ admin_verifier_id: userId });
  }

  const orFilters: Prisma.proposalsWhereInput[] = [];
  if (search) {
    orFilters.push(
      { title: { contains: search, mode: "insensitive" } },
      { faculty: { contains: search, mode: "insensitive" } },
      { nama_ketua: { contains: search, mode: "insensitive" } },
      { nidn_ketua: { contains: search, mode: "insensitive" } },
      { user: { is: { name: { contains: search, mode: "insensitive" } } } },
      {
        user: {
          is: { nidn_nip: { contains: search, mode: "insensitive" } },
        },
      },
    );

    const skemaFromSearch = await normalizeSkemaSearch(search);
    if (skemaFromSearch) {
      orFilters.push({ skema: skemaFromSearch });
    }
  }

  if (orFilters.length > 0) {
    andFilters.push({ OR: orFilters });
  }

  const whereClause: Prisma.proposalsWhereInput = { AND: andFilters };

  const [totalData, rawData] = await prisma.$transaction([
    prisma.proposals.count({ where: whereClause }),
    prisma.proposals.findMany({
      where: whereClause,
      select: adminQueueSelect,
      orderBy: { submitted_at: "asc" },
      skip,
      take: PROPOSALS_PER_PAGE,
    }),
  ]);

  const data = rawData.map(({ adminVerifications, ...proposal }) => ({
    ...proposal,
    latest_admin_verification: adminVerifications[0] ?? null,
    claimed_by_me: proposal.admin_verifier_id === userId,
  }));

  return {
    data,
    meta: {
      totalData,
      totalPages: Math.max(1, Math.ceil(totalData / PROPOSALS_PER_PAGE)),
      currentPage: page,
      limit: PROPOSALS_PER_PAGE,
    },
  };
};

export const getAdminVerificationStats = async (userId: number) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [antrean, belumDiklaim, diklaimSaya, revisi, lolosHariIni, totalLolos] =
    await prisma.$transaction([
      prisma.proposals.count({ where: { status: { in: ADMIN_QUEUE_STATUSES } } }),
      prisma.proposals.count({
        where: {
          status: { in: ADMIN_QUEUE_STATUSES },
          admin_verifier_id: null,
        },
      }),
      prisma.proposals.count({
        where: {
          status: { in: ADMIN_QUEUE_STATUSES },
          admin_verifier_id: userId,
        },
      }),
      prisma.proposals.count({
        where: { status: ProposalStatus.ADMIN_REVISION },
      }),
      prisma.proposalAdminVerifications.count({
        where: {
          decision: AdminVerificationDecision.LOLOS,
          created_at: { gte: startOfDay },
        },
      }),
      prisma.proposalAdminVerifications.count({
        where: { decision: AdminVerificationDecision.LOLOS },
      }),
    ]);

  return {
    antrean,
    belum_diklaim: belumDiklaim,
    diklaim_saya: diklaimSaya,
    revisi,
    lolos_hari_ini: lolosHariIni,
    total_lolos: totalLolos,
  };
};

export const getAdminVerificationHistory = async ({
  page,
  userId,
  hanyaSaya,
}: {
  page: number;
  userId: number;
  hanyaSaya?: boolean;
}) => {
  const perPage = 10;
  const where: Prisma.ProposalAdminVerificationsWhereInput = hanyaSaya
    ? { verifier_id: userId }
    : {};

  const [totalData, data] = await prisma.$transaction([
    prisma.proposalAdminVerifications.count({ where }),
    prisma.proposalAdminVerifications.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        proposal: { select: { id: true, title: true } },
        verifier: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    data,
    meta: {
      totalData,
      totalPages: Math.max(1, Math.ceil(totalData / perPage)),
      currentPage: page,
      limit: perPage,
    },
  };
};

/** Pastikan proposal ada & masih di antrean verifikasi administrasi. */
const assertVerifiableProposal = async (proposalId: number) => {
  const proposal = await prisma.proposals.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      title: true,
      status: true,
      lead_researcher_id: true,
      admin_verifier_id: true,
    },
  });

  if (!proposal) {
    throw new HttpError("Proposal tidak ditemukan.", 404);
  }

  if (!ADMIN_QUEUE_STATUSES.includes(proposal.status)) {
    throw new HttpError(
      `Proposal tidak berada di antrean verifikasi administrasi (status: ${proposal.status}).`,
      409,
    );
  }

  return proposal;
};

export const claimAdminVerification = async (
  proposalId: number,
  userId: number,
) => {
  const proposal = await assertVerifiableProposal(proposalId);

  if (proposal.admin_verifier_id === userId) {
    return {
      message: "Proposal ini sudah Anda klaim.",
      data: { proposalId, admin_verifier_id: userId },
    };
  }

  if (proposal.admin_verifier_id) {
    throw new HttpError(
      "Proposal ini sedang diverifikasi oleh verifikator lain. Lepas klaim atau tunggu hingga selesai.",
      409,
    );
  }

  // updateMany + guard admin_verifier_id null → aman dari dua klaim bersamaan.
  const claimed = await prisma.proposals.updateMany({
    where: { id: proposalId, admin_verifier_id: null },
    data: { admin_verifier_id: userId, admin_claimed_at: new Date() },
  });

  if (claimed.count === 0) {
    throw new HttpError(
      "Proposal ini baru saja diklaim verifikator lain. Muat ulang antrean.",
      409,
    );
  }

  return {
    message: "Proposal berhasil diklaim. Selesaikan verifikasi atau lepaskan klaim.",
    data: { proposalId, admin_verifier_id: userId },
  };
};

export const releaseAdminVerificationClaim = async (
  proposalId: number,
  userId: number,
) => {
  await assertVerifiableProposal(proposalId);

  const released = await prisma.proposals.updateMany({
    where: { id: proposalId, admin_verifier_id: userId },
    data: { admin_verifier_id: null, admin_claimed_at: null },
  });

  if (released.count === 0) {
    throw new HttpError(
      "Klaim tidak ditemukan — proposal ini bukan milik Anda atau sudah dilepas.",
      409,
    );
  }

  return { message: "Klaim verifikasi dilepas." };
};

export const submitAdminVerification = async (
  proposalId: number,
  userId: number,
  input: AdminVerificationDecisionInput,
) => {
  const proposal = await assertVerifiableProposal(proposalId);

  if (proposal.admin_verifier_id && proposal.admin_verifier_id !== userId) {
    throw new HttpError(
      "Proposal ini sedang diverifikasi oleh verifikator lain.",
      409,
    );
  }

  const checklistMaster = await getAdminVerificationChecklist();
  const checkedMap = new Map(
    input.checklist.map((item) => [item.kode, item.checked]),
  );
  const belumLengkap = checklistMaster.filter(
    (item) => !checkedMap.get(item.kode),
  );

  const catatan = input.catatan?.trim() ?? "";

  if (input.keputusan === "LOLOS") {
    if (checklistMaster.length === 0) {
      throw new HttpError(
        "Checklist administrasi belum diatur. Hubungi Admin LPPM untuk mengisi Master Referensi jenis CHECKLIST_ADMINISTRASI.",
        400,
      );
    }

    if (belumLengkap.length > 0) {
      throw new HttpError(
        `Semua item checklist wajib dicentang sebelum Lolos Administrasi. Belum: ${belumLengkap
          .map((item) => item.label)
          .join("; ")}.`,
        400,
      );
    }
  }

  if (input.keputusan !== "LOLOS" && !catatan) {
    throw new HttpError(
      input.keputusan === "REVISI"
        ? "Catatan wajib diisi saat meminta revisi administrasi."
        : "Alasan wajib diisi saat menolak proposal.",
      400,
    );
  }

  const snapshot = checklistMaster.map((item) => ({
    kode: item.kode,
    label: item.label,
    checked: Boolean(checkedMap.get(item.kode)),
  }));

  const newStatus =
    input.keputusan === "LOLOS"
      ? ProposalStatus.ADMIN_VERIFIED
      : input.keputusan === "REVISI"
        ? ProposalStatus.ADMIN_REVISION
        : ProposalStatus.REJECTED;

  const decision =
    input.keputusan === "LOLOS"
      ? AdminVerificationDecision.LOLOS
      : input.keputusan === "REVISI"
        ? AdminVerificationDecision.REVISI
        : AdminVerificationDecision.TOLAK;

  const notif =
    input.keputusan === "LOLOS"
      ? {
          title: "Proposal Lolos Verifikasi Administrasi",
          message: `Proposal "${proposal.title}" lolos verifikasi administrasi LPPM dan akan diteruskan ke tahap penugasan reviewer.`,
        }
      : input.keputusan === "REVISI"
        ? {
            title: "Revisi Administrasi",
            message: `Proposal "${proposal.title}" perlu perbaikan administrasi. Catatan verifikator: ${catatan}`,
          }
        : {
            title: "Proposal Ditolak (Administrasi)",
            message: `Mohon maaf, proposal "${proposal.title}" tidak lolos verifikasi administrasi. Alasan: ${catatan}`,
          };

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.proposals.update({
      where: { id: proposalId },
      data: {
        status: newStatus,
        admin_verifier_id: null,
        admin_claimed_at: null,
      },
    });

    await tx.proposalAdminVerifications.create({
      data: {
        proposal_id: proposalId,
        verifier_id: userId,
        decision,
        catatan: catatan || null,
        checklist: snapshot as Prisma.InputJsonValue,
      },
    });

    await tx.notifications.create({
      data: {
        user_id: proposal.lead_researcher_id,
        title: notif.title,
        message: notif.message,
      },
    });

    return result;
  });

  void recordAudit({
    userId,
    modul: "Proposal",
    aksi: "VERIFY_ADMIN",
    objek: `Verifikasi administrasi proposal: ${proposal.title} (${input.keputusan})`,
    objekId: proposalId,
    status: "SUCCESS",
  });

  const pesan =
    input.keputusan === "LOLOS"
      ? "Proposal lolos verifikasi administrasi."
      : input.keputusan === "REVISI"
        ? "Proposal dikembalikan untuk revisi administrasi."
        : "Proposal ditolak pada tahap administrasi.";

  return {
    message: pesan,
    data: {
      proposal: updated,
      decision,
      checklist: snapshot,
    },
  };
};

/** Tarik kembali proposal yang sudah ADMIN_VERIFIED — hanya Ketua LPPM. */
export const revokeAdminVerification = async (
  proposalId: number,
  userId: number,
  catatan?: string,
) => {
  const proposal = await prisma.proposals.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      title: true,
      status: true,
      lead_researcher_id: true,
    },
  });

  if (!proposal) {
    throw new HttpError("Proposal tidak ditemukan.", 404);
  }

  if (proposal.status !== ProposalStatus.ADMIN_VERIFIED) {
    throw new HttpError(
      `Penarikan hanya berlaku untuk proposal berstatus ADMIN_VERIFIED (sekarang: ${proposal.status}).`,
      409,
    );
  }

  const alasan = catatan?.trim() ?? "";

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.proposals.update({
      where: { id: proposalId },
      data: {
        status: ProposalStatus.SUBMITTED,
        admin_verifier_id: null,
        admin_claimed_at: null,
      },
    });

    await tx.proposalAdminVerifications.create({
      data: {
        proposal_id: proposalId,
        verifier_id: userId,
        decision: AdminVerificationDecision.TARIK_KEMBALI,
        catatan: alasan || null,
      },
    });

    await tx.notifications.create({
      data: {
        user_id: proposal.lead_researcher_id,
        title: "Verifikasi Administrasi Ditarik",
        message: `Verifikasi administrasi proposal "${proposal.title}" ditarik kembali oleh Ketua LPPM dan akan diperiksa ulang.${alasan ? ` Catatan: ${alasan}` : ""}`,
      },
    });

    return result;
  });

  void recordAudit({
    userId,
    modul: "Proposal",
    aksi: "REVOKE",
    objek: `Tarik verifikasi administrasi proposal: ${proposal.title}`,
    objekId: proposalId,
    status: "SUCCESS",
  });

  return {
    message:
      "Verifikasi administrasi ditarik. Proposal kembali ke antrean verifikasi.",
    data: updated,
  };
};

import { supabase } from "../config/storage";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../prisma";
import { HttpError } from "../common/errors/http-error";
import { ProposalStatus } from "../generated/prisma/enums";
import type { ProposalFiles } from "./proposal.types";
import type {
  CreateProposalInput,
  EditProposalInput,
  UpdateProposalStatusInput,
} from "./proposal.validation";

const BUCKET_NAME = "lppm_documents";
const PROPOSALS_PER_PAGE = 5;

const uploadToSupabase = async (
  file: Express.Multer.File,
  folder: string,
  userId: number,
): Promise<string> => {
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

  return data.publicUrl;
};

const uploadProposalFiles = async (
  files: ProposalFiles | undefined,
  userId: number,
): Promise<{ proposalFilePath: string | null; rabFilePath: string | null }> => {
  let proposalFilePath: string | null = null;
  let rabFilePath: string | null = null;

  if (files?.proposal_file?.[0]) {
    proposalFilePath = await uploadToSupabase(
      files.proposal_file[0],
      "proposals",
      userId,
    );
  }

  if (files?.rab_file?.[0]) {
    rabFilePath = await uploadToSupabase(files.rab_file[0], "rabs", userId);
  }

  return { proposalFilePath, rabFilePath };
};

export const createProposal = async (
  userId: number,
  input: CreateProposalInput,
  files: ProposalFiles | undefined,
) => {
  const isDraft = input.is_draft;
  const status = isDraft ? ProposalStatus.DRAFT : ProposalStatus.SUBMITTED;

  const { proposalFilePath, rabFilePath } = await uploadProposalFiles(
    files,
    userId,
  );

  // Jika bukan draft (submit), file wajib ada
  if (!isDraft && (!proposalFilePath || !rabFilePath)) {
    throw new HttpError(
      "File Proposal dan RAB wajib diunggah untuk melakukan Submit.",
      400,
    );
  }

  const proposal = await prisma.proposals.create({
    data: {
      title: input.title,
      faculty: input.faculty,
      skema: input.skema,
      funding_request_amount: input.funding_request_amount,
      status,
      lead_researcher_id: userId,
      proposal_file_path: proposalFilePath,
      rab_file_path: rabFilePath,
      submitted_at: isDraft ? null : new Date(),
    },
  });

  return {
    message: isDraft ? "Draf berhasil disimpan." : "Proposal berhasil dikirim.",
    data: proposal,
  };
};

export const getAllProposals = async ({
  page,
  search,
}: {
  page: number;
  search?: string;
}) => {
  const skip = (page - 1) * PROPOSALS_PER_PAGE;

  const whereClause: Prisma.proposalsWhereInput = search
    ? {
        OR: [
          {
            title: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            skema: {
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
        ],
      }
    : {};

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

export const getMyProposals = async ({
  userId,
  page,
  search,
}: {
  userId: number;
  page: number;
  search?: string;
}) => {
  const skip = (page - 1) * PROPOSALS_PER_PAGE;

  const whereClause: Prisma.proposalsWhereInput = {
    lead_researcher_id: userId,
    ...(search
      ? {
          OR: [
            {
              title: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              skema: {
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
          ],
        }
      : {}),
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

  if (existingProposal.status !== ProposalStatus.DRAFT) {
    throw new HttpError(
      "Hanya proposal dengan status DRAFT yang dapat diedit.",
      400,
    );
  }

  const { proposalFilePath, rabFilePath } = await uploadProposalFiles(
    files,
    userId,
  );

  const isDraft =
    input.is_draft ?? existingProposal.status === ProposalStatus.DRAFT;
  const newStatus = isDraft ? ProposalStatus.DRAFT : ProposalStatus.SUBMITTED;

  // Jika submit (bukan draft), pastikan file tersedia
  if (!isDraft) {
    const finalProposalFile =
      proposalFilePath || existingProposal.proposal_file_path;
    const finalRabFile = rabFilePath || existingProposal.rab_file_path;
    if (!finalProposalFile || !finalRabFile) {
      throw new HttpError(
        "File Proposal dan RAB wajib diunggah untuk melakukan Submit.",
        400,
      );
    }
  }

  const updatedProposal = await prisma.proposals.update({
    where: { id: proposalId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.faculty !== undefined && { faculty: input.faculty }),
      ...(input.skema !== undefined && { skema: input.skema }),
      ...(input.funding_request_amount !== undefined && {
        funding_request_amount: input.funding_request_amount,
      }),
      status: newStatus,
      proposal_file_path:
        proposalFilePath || existingProposal.proposal_file_path,
      rab_file_path: rabFilePath || existingProposal.rab_file_path,
      submitted_at: !isDraft ? new Date() : existingProposal.submitted_at,
    },
  });

  return {
    message: isDraft
      ? "Proposal berhasil diperbarui."
      : "Proposal berhasil diperbarui dan dikirim.",
    data: updatedProposal,
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
    proposal.status !== ProposalStatus.REVISION
  ) {
    throw new HttpError(
      "Hanya proposal dengan status DRAFT atau REVISION yang dapat disubmit.",
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
  ADMIN_LPPM: {
    [ProposalStatus.SUBMITTED]: [
      ProposalStatus.ADMIN_VERIFIED,
      ProposalStatus.REJECTED,
    ],
  },
  STAFF_LPPM: {
    [ProposalStatus.SUBMITTED]: [
      ProposalStatus.ADMIN_VERIFIED,
      ProposalStatus.REJECTED,
    ],
  },
  REVIEWER: {
    [ProposalStatus.ADMIN_VERIFIED]: [ProposalStatus.UNDER_REVIEW],
    [ProposalStatus.UNDER_REVIEW]: [
      ProposalStatus.ACCEPTED,
      ProposalStatus.REJECTED,
      ProposalStatus.REVISION,
    ],
  },
  REVIEWER_EKSTERNAL: {
    [ProposalStatus.ADMIN_VERIFIED]: [ProposalStatus.UNDER_REVIEW],
    [ProposalStatus.UNDER_REVIEW]: [
      ProposalStatus.ACCEPTED,
      ProposalStatus.REJECTED,
      ProposalStatus.REVISION,
    ],
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

  // Update status proposal
  const updatedProposal = await prisma.proposals.update({
    where: { id: proposalId },
    data: {
      status: newStatus,
    },
  });

  // 1. Simpan riwayat review
  await prisma.proposalReviews.create({
    data: {
      proposal_id: proposalId,
      reviewer_id: userId,
      status: newStatus,
      notes: input.notes ?? "",
    },
  });

  // 2. Buat notifikasi otomatis
  let notifTitle: string;
  let notifMessage: string;

  switch (newStatus) {
    case ProposalStatus.ADMIN_VERIFIED:
      notifTitle = "Proposal Terverifikasi";
      notifMessage = `Proposal "${proposal.title}" telah diverifikasi oleh Admin LPPM dan siap untuk ditinjau oleh Reviewer.`;
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
      notifMessage = `Selamat! Proposal "${proposal.title}" telah diterima dan disetujui.`;
      break;
    case ProposalStatus.REJECTED:
      notifTitle = "Proposal Ditolak";
      notifMessage = `Mohon maaf, proposal "${proposal.title}" tidak dapat diterima.${input.notes ? ` Catatan: ${input.notes}` : ""}`;
      break;
    default:
      notifTitle = "Update Status Proposal";
      notifMessage = `Status proposal "${proposal.title}" telah diubah menjadi ${newStatus}.`;
  }

  // 3. Simpan notifikasi untuk Dosen (lead researcher)
  await prisma.notifications.create({
    data: {
      user_id: proposal.lead_researcher_id,
      title: notifTitle,
      message: notifMessage,
    },
  });

  return {
    message: `Status proposal berhasil diubah dari ${currentStatus} ke ${newStatus}.`,
    data: updatedProposal,
  };
};

export const assignReviewersService = async (
  proposalId: number,
  reviewerIds: number[],
) => {
  // 1. Cek proposal & pastikan statusnya ADMIN_VERIFIED
  const proposal = await prisma.proposals.findUnique({
    where: { id: proposalId },
  });

  if (!proposal) {
    throw new HttpError("Proposal tidak ditemukan.", 404);
  }

  if (proposal.status !== ProposalStatus.ADMIN_VERIFIED) {
    throw new HttpError(
      `Reviewer hanya dapat ditugaskan pada proposal berstatus ADMIN_VERIFIED. Status saat ini: ${proposal.status}.`,
      400,
    );
  }

  // 2. Validasi kedua reviewer: harus ada & memiliki role REVIEWER / REVIEWER_EKSTERNAL
  const reviewers = await prisma.users.findMany({
    where: {
      id: { in: reviewerIds },
      roles: {
        roles: { in: ["REVIEWER", "REVIEWER_EKSTERNAL"] },
      },
    },
    select: { id: true, name: true },
  });

  if (reviewers.length !== reviewerIds.length) {
    const foundIds = reviewers.map((r) => r.id);
    const invalidIds = reviewerIds.filter((id) => !foundIds.includes(id));
    throw new HttpError(
      `Reviewer dengan ID ${invalidIds.join(", ")} tidak ditemukan atau bukan reviewer.`,
      400,
    );
  }

  // 3. Jalankan semua operasi dalam satu transaksi
  const result = await prisma.$transaction(async (tx) => {
    // a. Insert ke ProposalReviewers
    await tx.proposalReviewers.createMany({
      data: reviewerIds.map((reviewerId) => ({
        proposal_id: proposalId,
        reviewer_id: reviewerId,
      })),
    });

    // b. Update status proposal → UNDER_REVIEW
    const updatedProposal = await tx.proposals.update({
      where: { id: proposalId },
      data: { status: ProposalStatus.UNDER_REVIEW },
    });

    // c. Notifikasi untuk kedua reviewer
    await tx.notifications.createMany({
      data: reviewerIds.map((reviewerId) => ({
        user_id: reviewerId,
        title: "Penugasan Review Proposal",
        message: `Anda ditugaskan mereview proposal "${proposal.title}".`,
      })),
    });

    // d. Notifikasi untuk pemilik proposal (lead researcher)
    await tx.notifications.create({
      data: {
        user_id: proposal.lead_researcher_id,
        title: "Proposal Sedang Ditinjau",
        message: "Proposal Anda sedang ditinjau oleh reviewer.",
      },
    });

    return updatedProposal;
  });

  return {
    message:
      "Reviewer berhasil ditugaskan dan status proposal diubah menjadi UNDER_REVIEW.",
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

import { supabase } from "../config/storage";
import { prisma } from "../prisma";
import { HttpError } from "../common/errors/http-error";
import { ProposalStatus } from "../generated/prisma/enums";
import type { ProposalFiles } from "./proposal.types";
import type {
  CreateProposalInput,
  EditProposalInput,
} from "./proposal.validation";

const BUCKET_NAME = "lppm_documents";

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
  const status: ProposalStatus = isDraft ? "DRAFT" : "SUBMITTED";

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

export const getAllProposals = async () => {
  const proposals = await prisma.proposals.findMany({
    orderBy: { created_at: "desc" },
  });
  return proposals;
};

export const getProposalById = async (proposalId: number) => {
  const proposal = await prisma.proposals.findUnique({
    where: { id: proposalId },
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

  if (existingProposal.status !== "DRAFT") {
    throw new HttpError(
      "Hanya proposal dengan status DRAFT yang dapat diedit.",
      400,
    );
  }

  const { proposalFilePath, rabFilePath } = await uploadProposalFiles(
    files,
    userId,
  );

  const isDraft = input.is_draft ?? existingProposal.status === "DRAFT";
  const newStatus: ProposalStatus = isDraft ? "DRAFT" : "SUBMITTED";

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

  if (existingProposal.status !== "DRAFT") {
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

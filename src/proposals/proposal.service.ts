import { supabase } from "../config/storage";
import { prisma } from "../prisma";
import { HttpError } from "../common/errors/http-error";
import { ProposalStatus } from "../generated/prisma/enums";
import type { ProposalFiles } from "./proposal.types";
import type { CreateProposalInput } from "./proposal.validation";

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

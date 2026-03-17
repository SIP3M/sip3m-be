import { PengabdianStatus, ProposalStatus } from "../generated/prisma/enums";
import { HttpError } from "../common/errors/http-error";
import { prisma } from "../prisma";

const PENGABDIAN_STATUS_TRANSITIONS: Record<
  PengabdianStatus,
  PengabdianStatus[]
> = {
  [PengabdianStatus.PENDING]: [PengabdianStatus.SEDANG_BERJALAN],
  [PengabdianStatus.SEDANG_BERJALAN]: [PengabdianStatus.SELESAI],
  [PengabdianStatus.SELESAI]: [],
};

export const createPengabdianProject = async (proposalId: number) => {
  const proposal = await prisma.proposals.findUnique({
    where: { id: proposalId },
    include: {
      pengabdianProject: {
        select: { id: true },
      },
    },
  });

  if (!proposal) {
    throw new HttpError("Proposal tidak ditemukan.", 404);
  }

  if (proposal.status !== ProposalStatus.ACCEPTED) {
    throw new HttpError(
      "Proyek pengabdian hanya dapat dibuat untuk proposal berstatus ACCEPTED.",
      400,
    );
  }

  if (proposal.pengabdianProject) {
    throw new HttpError("Proyek pengabdian untuk proposal ini sudah ada.", 409);
  }

  const generatedProjectCode = `PENG-${new Date().getFullYear()}-${proposal.id}`;

  // Create Project
  const project = await prisma.pengabdianProjects.create({
    data: {
      proposal_id: proposalId,
      status: PengabdianStatus.PENDING,
      title: proposal.title,            
      project_code: generatedProjectCode, 
    },
  });

  return {
    message: "Proyek pengabdian berhasil dibuat.",
    data: project,
  };
};

export const getPengabdianProjectByProposalId = async (proposalId: number) => {
  const project = await prisma.pengabdianProjects.findUnique({
    where: { proposal_id: proposalId },
    include: {
      proposal: {
        select: {
          id: true,
          title: true,
          status: true,
          lead_researcher_id: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });

  if (!project) {
    throw new HttpError(
      "Proyek pengabdian untuk proposal ini belum tersedia.",
      404,
    );
  }

  return {
    message: "Berhasil mengambil data proyek pengabdian.",
    data: project,
  };
};

export const updatePengabdianStatus = async (
  projectId: number,
  newStatus: PengabdianStatus,
) => {
  const project = await prisma.pengabdianProjects.findUnique({
    where: { id: projectId },
    include: {
      proposal: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!project) {
    throw new HttpError("Proyek pengabdian tidak ditemukan.", 404);
  }

  const currentStatus = project.status;

  if (currentStatus === newStatus) {
    return {
      message: "Status proyek pengabdian tidak berubah.",
      data: project,
    };
  }

  const allowedNextStatuses = PENGABDIAN_STATUS_TRANSITIONS[currentStatus];
  if (!allowedNextStatuses.includes(newStatus)) {
    throw new HttpError(
      `Perubahan status dari ${currentStatus} ke ${newStatus} tidak diizinkan.`,
      400,
    );
  }

  const updatedProject = await prisma.pengabdianProjects.update({
    where: { id: projectId },
    data: { status: newStatus },
    include: {
      proposal: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return {
    message: `Status proyek pengabdian berhasil diubah dari ${currentStatus} ke ${newStatus}.`,
    data: updatedProject,
  };
};

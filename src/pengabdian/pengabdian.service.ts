import {
  PengabdianMilestoneStatus,
  PengabdianStatus,
  ProposalStatus,
} from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";
import { HttpError } from "../common/errors/http-error";
import { prisma } from "../prisma";
import type {
  UpdateProjectDetailsInput,
  GetAllPengabdianProjectsParams,
} from "./pengabdian.types";

const PENGABDIAN_STATUS_TRANSITIONS: Record<
  PengabdianStatus,
  PengabdianStatus[]
> = {
  [PengabdianStatus.PENDING]: [PengabdianStatus.SEDANG_BERJALAN],
  [PengabdianStatus.SEDANG_BERJALAN]: [PengabdianStatus.SELESAI],
  [PengabdianStatus.SELESAI]: [],
};

const generateStandardMilestones = async (projectId: number): Promise<void> => {
  const milestoneCount = await prisma.pengabdianMilestones.count({
    where: { project_id: projectId },
  });

  if (milestoneCount > 0) {
    return;
  }

  await prisma.pengabdianMilestones.createMany({
    data: [
      {
        project_id: projectId,
        title: "Tanda Tangan Kontrak",
        sequence: 0, // KEMBALIKAN KE 0
        target_percentage: 0,
        status: PengabdianMilestoneStatus.PENDING,
      },
      {
        project_id: projectId,
        title: "Laporan Kemajuan 1",
        sequence: 1, // KEMBALIKAN KE 1
        target_percentage: 30,
        status: PengabdianMilestoneStatus.PENDING,
      },
      {
        project_id: projectId,
        title: "Laporan Kemajuan 2", // UBAH JADI KEMAJUAN 2
        sequence: 2, // KEMBALIKAN KE 2
        target_percentage: 70,
        status: PengabdianMilestoneStatus.PENDING,
      },
      {
        project_id: projectId,
        title: "Laporan Akhir",
        sequence: 3, // TETAP 3
        target_percentage: 100,
        status: PengabdianMilestoneStatus.PENDING,
      },
    ],
  });
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

  // JIKA ADMIN MULAI PROYEK (Artinya Kontrak Fisik Sudah Ditandatangani)
  if (newStatus === PengabdianStatus.SEDANG_BERJALAN) {
    // 1. Generate milestone (kalau belum ada)
    await generateStandardMilestones(projectId);
    
    // 2. OTOMATIS ubah milestone kontrak (sequence 0) menjadi COMPLETED
    // karena tombol ini ditekan admin setelah tanda tangan offline
    await prisma.pengabdianMilestones.updateMany({
      where: { 
        project_id: projectId,
        sequence: 0 // Pastikan ini sequence untuk Tanda Tangan Kontrak
      },
      data: {
        status: PengabdianMilestoneStatus.COMPLETED
      }
    });

    // 3. (Opsional tapi direkomendasikan) Ubah milestone Laporan Kemajuan 1 (sequence 1) 
    // menjadi ONGOING agar dosen tahu ini tahapan yang aktif sekarang
    await prisma.pengabdianMilestones.updateMany({
      where: {
        project_id: projectId,
        sequence: 1
      },
      data: {
        status: PengabdianMilestoneStatus.ONGOING
      }
    });
  }

  return {
    message: `Status proyek pengabdian berhasil diubah dari ${currentStatus} ke ${newStatus}.`,
    data: updatedProject,
  };
};

export const getAllPengabdianProjects = async ({
  page,
  limit,
  search,
  is_archived,
  userId,
  userRole,
}: GetAllPengabdianProjectsParams) => {
  const skip = (page - 1) * limit;
  const now = new Date();

  const baseWhereClause: Prisma.PengabdianProjectsWhereInput = {
    ...(is_archived !== undefined ? { is_archived } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { project_code: { contains: search, mode: "insensitive" } },
            {
              proposal: {
                user: {
                  is: {
                    name: { contains: search, mode: "insensitive" },
                  },
                },
              },
            },
          ],
        }
      : {}),
    ...(userRole === "DOSEN"
      ? {
          proposal: {
            lead_researcher_id: userId,
          },
        }
      : {}),
  };

  const activeWhereClause: Prisma.PengabdianProjectsWhereInput = {
    ...baseWhereClause,
    status: PengabdianStatus.SEDANG_BERJALAN,
  };

  const completedWhereClause: Prisma.PengabdianProjectsWhereInput = {
    ...baseWhereClause,
    status: PengabdianStatus.SELESAI,
  };

  const delayedWhereClause: Prisma.PengabdianProjectsWhereInput = {
    ...baseWhereClause,
    status: PengabdianStatus.SEDANG_BERJALAN,
    milestones: {
      some: {
        status: PengabdianMilestoneStatus.ONGOING,
        due_date: {
          lt: now,
        },
      },
    },
  };

  const listWhereClause: Prisma.PengabdianProjectsWhereInput = baseWhereClause;

  const [totalData, activeCount, completedCount, delayedCount, projects] =
    await prisma.$transaction([
      prisma.pengabdianProjects.count({
        where: listWhereClause,
      }),
      prisma.pengabdianProjects.count({
        where: activeWhereClause,
      }),
      prisma.pengabdianProjects.count({
        where: completedWhereClause,
      }),
      prisma.pengabdianProjects.count({
        where: delayedWhereClause,
      }),
      prisma.pengabdianProjects.findMany({
        where: listWhereClause,
        select: {
          id: true,
          project_code: true,
          title: true,
          status: true,
          is_archived: true,
          overall_progress: true,
          realized_amount: true,
          created_at: true,
          proposal: {
            select: {
              id: true,
              lead_researcher_id: true,
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          milestones: {
            where: {
              status: PengabdianMilestoneStatus.ONGOING,
            },
            select: {
              title: true,
              due_date: true,
            },
            orderBy: {
              sequence: "asc",
            },
            take: 1,
          },
        },
        orderBy: {
          created_at: "desc",
        },
        skip,
        take: limit,
      }),
    ]);

  const data = projects.map((project) => {
    const { milestones, ...rest } = project;
    const ongoingMilestone = milestones[0] ?? null;
    const isDelayed =
      ongoingMilestone?.due_date !== null &&
      ongoingMilestone?.due_date !== undefined &&
      ongoingMilestone.due_date < now;

    return {
      ...rest,
      is_delayed: Boolean(isDelayed),
      next_milestone: ongoingMilestone?.title ?? null,
    };
  });

  return {
    data,
    statistics: {
      active: activeCount,
      completed: completedCount,
      delayed: delayedCount,
    },
    meta: {
      totalData,
      totalPages: Math.max(1, Math.ceil(totalData / limit)),
      currentPage: page,
      limit,
    },
  };
};

const toValidDate = (value: string | Date, fieldName: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(`${fieldName} tidak valid.`, 400);
  }
  return parsed;
};

export const updateProjectDetails = async (
  projectId: number,
  data: UpdateProjectDetailsInput,
) => {
  const project = await prisma.pengabdianProjects.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new HttpError("Proyek pengabdian tidak ditemukan.", 404);
  }

  const updateData: {
    summary?: string;
    start_date?: Date;
    end_date?: Date;
  } = {};

  if (data.summary !== undefined) {
    updateData.summary = data.summary;
  }

  if (data.start_date !== undefined) {
    updateData.start_date = toValidDate(data.start_date, "start_date");
  }

  if (data.end_date !== undefined) {
    updateData.end_date = toValidDate(data.end_date, "end_date");
  }

  const updatedProject = await prisma.pengabdianProjects.update({
    where: { id: projectId },
    data: updateData,
    include: {
      proposal: {
        select: {
          id: true,
          status: true,
          lead_researcher_id: true,
        },
      },
    },
  });

  return {
    message: "Detail proyek pengabdian berhasil diperbarui.",
    data: updatedProject,
  };
};

export const archiveProject = async (projectId: number) => {
  const project = await prisma.pengabdianProjects.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new HttpError("Proyek pengabdian tidak ditemukan.", 404);
  }

  const archivedProject = await prisma.pengabdianProjects.update({
    where: { id: projectId },
    data: {
      is_archived: true,
    },
  });

  return {
    message: "Proyek pengabdian berhasil diarsipkan.",
    data: archivedProject,
  };
};

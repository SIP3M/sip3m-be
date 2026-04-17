import { HttpError } from "../common/errors/http-error";
import {
  PengabdianMilestoneStatus,
  PengabdianStatus,
} from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../prisma";

const PROYEK_PER_PAGE = 5;

const ACTIVE_PROJECT_STATUSES: PengabdianStatus[] = [
  PengabdianStatus.PENDING,
  PengabdianStatus.SEDANG_BERJALAN,
];

type CalculatedStatus = "COMPLETED" | "DELAYED" | "ON TRACK";

type MilestoneLike = {
  title: string;
  due_date: Date | null;
  status: PengabdianMilestoneStatus;
};

const isMilestoneCompleted = (
  milestoneStatus: PengabdianMilestoneStatus,
): boolean => milestoneStatus === PengabdianMilestoneStatus.COMPLETED;

const isMilestoneOverdue = (milestone: MilestoneLike, now: Date): boolean =>
  !isMilestoneCompleted(milestone.status) &&
  milestone.due_date !== null &&
  milestone.due_date < now;

const calculateProgressPercentage = (milestones: MilestoneLike[]): number => {
  if (milestones.length === 0) {
    return 0;
  }

  const completedCount = milestones.filter((milestone) =>
    isMilestoneCompleted(milestone.status),
  ).length;

  return Number(((completedCount / milestones.length) * 100).toFixed(2));
};

const getNextMilestoneTitle = (milestones: MilestoneLike[]): string | null => {
  const pendingMilestones = milestones.filter(
    (milestone) => !isMilestoneCompleted(milestone.status),
  );

  if (pendingMilestones.length === 0) {
    return null;
  }

  pendingMilestones.sort((a, b) => {
    if (a.due_date === null && b.due_date === null) {
      return 0;
    }
    if (a.due_date === null) {
      return 1;
    }
    if (b.due_date === null) {
      return -1;
    }

    return a.due_date.getTime() - b.due_date.getTime();
  });

  return pendingMilestones[0]?.title ?? null;
};

const calculateProjectStatus = (
  projectStatus: PengabdianStatus,
  milestones: MilestoneLike[],
  now: Date,
): CalculatedStatus => {
  if (projectStatus === PengabdianStatus.SELESAI) {
    return "COMPLETED";
  }

  const hasOverdueMilestone = milestones.some((milestone) =>
    isMilestoneOverdue(milestone, now),
  );

  if (hasOverdueMilestone) {
    return "DELAYED";
  }

  return "ON TRACK";
};

export const getProjectsDashboard = async (
  page: number,
  search?: string,
  statusFilter?: PengabdianStatus,
) => {
  const currentPage = Number.isInteger(page) && page > 0 ? page : 1;
  const skip = (currentPage - 1) * PROYEK_PER_PAGE;
  const take = PROYEK_PER_PAGE;

  const trimmedSearch = search?.trim();

  const whereClause: Prisma.PengabdianProjectsWhereInput = {
    ...(trimmedSearch
      ? {
          OR: [
            {
              title: {
                contains: trimmedSearch,
                mode: "insensitive",
              },
            },
            {
              proposal: {
                user: {
                  name: {
                    contains: trimmedSearch,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const now = new Date();

  const [
    totalProyekAktif,
    proyekSelesai,
    proyekTerlambat,
    dataTabel,
    totalData,
  ] = await Promise.all([
    prisma.pengabdianProjects.count({
      where: {
        status: {
          in: ACTIVE_PROJECT_STATUSES,
        },
      },
    }),
    prisma.pengabdianProjects.count({
      where: {
        status: PengabdianStatus.SELESAI,
      },
    }),
    prisma.pengabdianProjects.count({
      where: {
        milestones: {
          some: {
            status: {
              not: PengabdianMilestoneStatus.COMPLETED,
            },
            due_date: {
              lt: now,
            },
          },
        },
      },
    }),
    prisma.pengabdianProjects.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        project_code: true,
        title: true,
        status: true,
        created_at: true,
        proposal: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        milestones: {
          select: {
            id: true,
            title: true,
            due_date: true,
            status: true,
          },
          orderBy: [{ due_date: "asc" }, { id: "asc" }],
        },
      },
    }),
    prisma.pengabdianProjects.count({
      where: whereClause,
    }),
  ]);

  const transformedData = dataTabel.map((project) => {
    const milestones: MilestoneLike[] = project.milestones.map((milestone) => ({
      title: milestone.title,
      due_date: milestone.due_date,
      status: milestone.status,
    }));

    return {
      id: project.id,
      project_code: project.project_code,
      title: project.title,
      status: project.status,
      created_at: project.created_at,
      user: {
        name: project.proposal.user.name,
      },
      progress_percentage: calculateProgressPercentage(milestones),
      milestone_berikutnya: getNextMilestoneTitle(milestones),
      calculated_status: calculateProjectStatus(
        project.status,
        milestones,
        now,
      ),
    };
  });

  return {
    summary: {
      total_aktif: totalProyekAktif,
      total_selesai: proyekSelesai,
      total_terlambat: proyekTerlambat,
    },
    data: transformedData,
    meta: {
      totalData,
      totalPages: Math.max(1, Math.ceil(totalData / PROYEK_PER_PAGE)),
      currentPage,
      limit: PROYEK_PER_PAGE,
    },
  };
};

export const getProjectDetail = async (projectId: number) => {
  const now = new Date();

  const project = await prisma.pengabdianProjects.findUnique({
    where: {
      id: projectId,
    },
    include: {
      proposal: {
        select: {
          user: {
            select: {
              name: true,
              nidn_nip: true,
            },
          },
        },
      },
      milestones: {
        orderBy: {
          due_date: "asc",
        },
      },
      documents: true,
    },
  });

  if (!project) {
    throw new HttpError("Proyek tidak ditemukan.", 404);
  }

  const milestones: MilestoneLike[] = project.milestones.map((milestone) => ({
    title: milestone.title,
    due_date: milestone.due_date,
    status: milestone.status,
  }));

  const { proposal, ...projectData } = project;

  return {
    ...projectData,
    user: {
      name: proposal.user.name,
      nidn_nip: proposal.user.nidn_nip,
    },
    progress_percentage: calculateProgressPercentage(milestones),
    milestone_berikutnya: getNextMilestoneTitle(milestones),
    calculated_status: calculateProjectStatus(project.status, milestones, now),
    milestones: project.milestones,
    documents: project.documents,
  };
};

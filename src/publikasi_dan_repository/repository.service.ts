import {
  DocumentVerificationStatus,
  PengabdianDocumentType,
  PengabdianStatus,
} from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";
import { supabase } from "../config/storage";
import { prisma } from "../prisma";

type GetPublicRepositoryParams = {
  page: number;
  limit: number;
  search?: string;
};

export const getPublicPengabdianRepository = async ({
  page,
  limit,
  search,
}: GetPublicRepositoryParams) => {
  const skip = (page - 1) * limit;

  const whereClause: Prisma.PengabdianProjectsWhereInput = {
    status: PengabdianStatus.SELESAI,
    documents: {
      some: {
        document_type: PengabdianDocumentType.LAPORAN_AKHIR,
        verification_status: DocumentVerificationStatus.APPROVED,
      },
    },
    ...(search
      ? {
          title: {
            contains: search,
            mode: "insensitive",
          },
        }
      : {}),
  };

  const [totalData, projects] = await prisma.$transaction([
    prisma.pengabdianProjects.count({ where: whereClause }),
    prisma.pengabdianProjects.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        project_code: true,
        created_at: true,
        proposal: {
          select: {
            id: true,
            lead_researcher_id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        documents: {
          where: {
            document_type: PengabdianDocumentType.LAPORAN_AKHIR,
            verification_status: DocumentVerificationStatus.APPROVED,
          },
          select: {
            id: true,
            file_path: true,
            uploaded_at: true,
          },
          orderBy: {
            uploaded_at: "desc",
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
    }),
  ]);

  const data = projects.map((project) => ({
    ...project,
    documents: project.documents.map((doc) => ({
      ...doc,
      public_url: supabase.storage
        .from("lppm_documents")
        .getPublicUrl(doc.file_path).data.publicUrl,
    })),
  }));

  return {
    data,
    meta: {
      totalData,
      totalPages: Math.max(1, Math.ceil(totalData / limit)),
      currentPage: page,
      limit,
    },
  };
};

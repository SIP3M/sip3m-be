import { HttpError } from "../common/errors/http-error";
import { StatusPencairanDana } from "../generated/prisma/enums";
import { prisma } from "../prisma";
import { FinanceSummary } from "./finance.types";

export const getSummary = async (): Promise<FinanceSummary> => {
  const [proposalAgg, realizedAgg] = await Promise.all([
    prisma.proposals.aggregate({
      _sum: { funding_request_amount: true },
      where: {
        pengabdianProject: {
          isNot: null,
        },
      },
    }),
    prisma.pengabdianProjects.aggregate({
      _sum: { realized_amount: true },
      where: { disbursement_status: StatusPencairanDana.TERCAIRKAN },
    }),
  ]);

  const totalAnggaranHibah = proposalAgg._sum.funding_request_amount ?? 0;
  const danaTerserap = realizedAgg._sum.realized_amount ?? 0;

  return {
    total_anggaran_hibah: totalAnggaranHibah,
    dana_terserap: danaTerserap,
    sisa_anggaran: totalAnggaranHibah - danaTerserap,
  };
};

export const getFinanceProjects = async () => {
  return prisma.pengabdianProjects.findMany({
    include: {
      proposal: {
        select: {
          id: true,
          title: true,
          funding_request_amount: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });
};

export const disburseProject = async (
  projectId: number,
  realizedAmount: number,
) => {
  if (realizedAmount <= 0) {
    throw new HttpError("realized_amount harus lebih dari 0.", 400);
  }

  const project = await prisma.pengabdianProjects.findUnique({
    where: { id: projectId },
    include: {
      proposal: {
        select: {
          funding_request_amount: true,
        },
      },
    },
  });

  if (!project) {
    throw new HttpError("Proyek pengabdian tidak ditemukan.", 404);
  }

  if (realizedAmount > project.proposal.funding_request_amount) {
    throw new HttpError(
      "realized_amount melebihi funding_request_amount.",
      400,
    );
  }

  return prisma.pengabdianProjects.update({
    where: { id: projectId },
    data: {
      disbursement_status: StatusPencairanDana.TERCAIRKAN,
      realized_amount: realizedAmount,
      disbursed_at: new Date(),
    },
    include: {
      proposal: {
        select: {
          id: true,
          title: true,
          funding_request_amount: true,
        },
      },
    },
  });
};

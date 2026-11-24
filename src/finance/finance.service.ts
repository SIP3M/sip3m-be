import ExcelJS from "exceljs";
import { Prisma } from "../generated/prisma/client";
import { StatusPencairanDana } from "../generated/prisma/enums";
import { HttpError } from "../common/errors/http-error";
import { prisma } from "../prisma";
import { supabase } from "../config/storage";
import { FinanceSummary, GetFinanceProjectsFilters } from "./finance.types";

const BUCKET_NAME = "lppm_documents";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const EXPORT_MAX_ROWS = 1000;

/** Bangun klausa WHERE daftar/export proyek keuangan. */
const buildWhere = (
  filters: GetFinanceProjectsFilters,
): Prisma.PengabdianProjectsWhereInput => {
  const and: Prisma.PengabdianProjectsWhereInput[] = [];

  if (filters.status) {
    and.push({ disbursement_status: filters.status });
  }

  if (filters.skema) {
    and.push({ proposal: { is: { skema: filters.skema } } });
  }

  if (filters.tahun) {
    and.push({
      created_at: {
        gte: new Date(Date.UTC(filters.tahun, 0, 1)),
        lt: new Date(Date.UTC(filters.tahun + 1, 0, 1)),
      },
    });
  }

  if (filters.search) {
    const search = filters.search;
    and.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { project_code: { contains: search, mode: "insensitive" } },
        {
          proposal: {
            is: { title: { contains: search, mode: "insensitive" } },
          },
        },
        {
          proposal: {
            is: {
              user: { is: { name: { contains: search, mode: "insensitive" } } },
            },
          },
        },
        {
          proposal: {
            is: {
              user: {
                is: { nidn_nip: { contains: search, mode: "insensitive" } },
              },
            },
          },
        },
      ],
    });
  }

  return and.length > 0 ? { AND: and } : {};
};

const financeProjectSelect = {
  id: true,
  project_code: true,
  title: true,
  status: true,
  created_at: true,
  disbursement_status: true,
  disbursement_approved_at: true,
  disbursed_at: true,
  realized_amount: true,
  disbursement_note: true,
  transfer_proof_path: true,
  transfer_proof_url: true,
  approver: { select: { id: true, name: true } },
  disburser: { select: { id: true, name: true } },
  proposal: {
    select: {
      id: true,
      title: true,
      skema: true,
      sumber_pendanaan: true,
      funding_request_amount: true,
      rab_file_path: true,
      user: {
        select: {
          id: true,
          name: true,
          nidn_nip: true,
          Fakultas: { select: { nama: true } },
        },
      },
    },
  },
} satisfies Prisma.PengabdianProjectsSelect;

type FinanceProjectRow = Prisma.PengabdianProjectsGetPayload<{
  select: typeof financeProjectSelect;
}>;

const toListItem = (row: FinanceProjectRow) => {
  const fundingRequestAmount = row.proposal.funding_request_amount;
  const realizedAmount = row.realized_amount ?? 0;

  return {
    id: row.id,
    project_code: row.project_code,
    title: row.title ?? row.proposal.title,
    status: row.status,
    created_at: row.created_at,
    funding_request_amount: fundingRequestAmount,
    realized_amount: realizedAmount,
    sisa_anggaran: fundingRequestAmount - realizedAmount,
    disbursement_status: row.disbursement_status,
    disbursement_approved_at: row.disbursement_approved_at,
    disbursed_at: row.disbursed_at,
    disbursement_note: row.disbursement_note,
    transfer_proof_url: row.transfer_proof_url,
    approved_by: row.approver?.name ?? null,
    disbursed_by: row.disburser?.name ?? null,
    proposal: {
      id: row.proposal.id,
      title: row.proposal.title,
      skema: row.proposal.skema,
      sumber_pendanaan: row.proposal.sumber_pendanaan,
      rab_file_path: row.proposal.rab_file_path,
    },
    ketua: {
      id: row.proposal.user.id,
      name: row.proposal.user.name,
      nidn_nip: row.proposal.user.nidn_nip,
      fakultas: row.proposal.user.Fakultas?.nama ?? null,
    },
  };
};

export const getSummary = async (): Promise<FinanceSummary> => {
  const [proposalAgg, realizedAgg, statusGroups] = await Promise.all([
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
    prisma.pengabdianProjects.groupBy({
      by: ["disbursement_status"],
      _count: { _all: true },
    }),
  ]);

  const totalAnggaranHibah = proposalAgg._sum.funding_request_amount ?? 0;
  const danaTerserap = realizedAgg._sum.realized_amount ?? 0;

  const countByStatus = (status: StatusPencairanDana): number =>
    statusGroups.find((group) => group.disbursement_status === status)?._count
      ._all ?? 0;

  return {
    total_anggaran_hibah: totalAnggaranHibah,
    dana_terserap: danaTerserap,
    sisa_anggaran: totalAnggaranHibah - danaTerserap,
    jumlah_proyek: statusGroups.reduce((sum, group) => sum + group._count._all, 0),
    menunggu_persetujuan: countByStatus(
      StatusPencairanDana.MENUNGGU_PERSETUJUAN,
    ),
    disetujui: countByStatus(StatusPencairanDana.DISETUJUI),
    tercairkan: countByStatus(StatusPencairanDana.TERCAIRKAN),
  };
};

export const getFinanceProjects = async (filters: GetFinanceProjectsFilters) => {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = Math.min(
    filters.limit && filters.limit > 0 ? filters.limit : DEFAULT_LIMIT,
    MAX_LIMIT,
  );
  const skip = (page - 1) * limit;

  const whereClause = buildWhere(filters);

  const [totalData, rows] = await prisma.$transaction([
    prisma.pengabdianProjects.count({ where: whereClause }),
    prisma.pengabdianProjects.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: financeProjectSelect,
    }),
  ]);

  return {
    data: rows.map(toListItem),
    meta: {
      totalData,
      totalPages: Math.max(1, Math.ceil(totalData / limit)),
      currentPage: page,
      limit,
    },
  };
};

export const getFinanceProjectDetail = async (projectId: number) => {
  const project = await prisma.pengabdianProjects.findUnique({
    where: { id: projectId },
    select: {
      ...financeProjectSelect,
      summary: true,
      start_date: true,
      end_date: true,
      overall_progress: true,
    },
  });

  if (!project) {
    throw new HttpError("Proyek pengabdian tidak ditemukan.", 404);
  }

  return {
    ...toListItem(project),
    summary: project.summary,
    start_date: project.start_date,
    end_date: project.end_date,
    overall_progress: project.overall_progress,
  };
};

export const approveProjectFunding = async (
  projectId: number,
  userId: number,
) => {
  const project = await prisma.pengabdianProjects.findUnique({
    where: { id: projectId },
    select: { id: true, disbursement_status: true },
  });

  if (!project) {
    throw new HttpError("Proyek pengabdian tidak ditemukan.", 404);
  }

  if (project.disbursement_status === StatusPencairanDana.DISETUJUI) {
    throw new HttpError("Anggaran proyek ini sudah disetujui.", 400);
  }

  if (project.disbursement_status === StatusPencairanDana.TERCAIRKAN) {
    throw new HttpError(
      "Dana proyek ini sudah dicairkan, persetujuan anggaran tidak dapat diubah.",
      400,
    );
  }

  const updated = await prisma.pengabdianProjects.update({
    where: { id: projectId },
    data: {
      disbursement_status: StatusPencairanDana.DISETUJUI,
      disbursement_approved_at: new Date(),
      disbursement_approved_by: userId,
    },
    select: financeProjectSelect,
  });

  return {
    message: "Anggaran proyek berhasil disetujui.",
    data: toListItem(updated),
  };
};

type UploadedProof = { path: string; url: string };

const uploadTransferProof = async (
  file: Express.Multer.File,
  projectId: number,
): Promise<UploadedProof> => {
  const safeFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `keuangan/pencairan/${projectId}/${Date.now()}-${safeFileName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      cacheControl: "3600",
    });

  if (error) {
    throw new HttpError(`Gagal mengunggah bukti transfer: ${error.message}`, 500);
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

  return { path: filePath, url: data.publicUrl };
};

type DisburseInput = {
  realizedAmount: number;
  note?: string;
  proof?: Express.Multer.File;
};

export const disburseProject = async (
  projectId: number,
  userId: number,
  input: DisburseInput,
) => {
  const project = await prisma.pengabdianProjects.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      disbursement_status: true,
      transfer_proof_path: true,
      proposal: {
        select: {
          title: true,
          funding_request_amount: true,
          lead_researcher_id: true,
        },
      },
    },
  });

  if (!project) {
    throw new HttpError("Proyek pengabdian tidak ditemukan.", 404);
  }

  if (project.disbursement_status === StatusPencairanDana.MENUNGGU_PERSETUJUAN) {
    throw new HttpError(
      "Anggaran proyek belum disetujui Ketua LPPM. Pencairan belum dapat diinput.",
      400,
    );
  }

  if (project.disbursement_status === StatusPencairanDana.DITOLAK) {
    throw new HttpError(
      "Anggaran proyek ditolak. Pencairan tidak dapat diinput.",
      400,
    );
  }

  if (
    input.realizedAmount > project.proposal.funding_request_amount
  ) {
    throw new HttpError(
      "realized_amount melebihi funding_request_amount.",
      400,
    );
  }

  const wasDisbursed =
    project.disbursement_status === StatusPencairanDana.TERCAIRKAN;

  const uploadedProof = input.proof
    ? await uploadTransferProof(input.proof, projectId)
    : null;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.pengabdianProjects.update({
        where: { id: projectId },
        data: {
          disbursement_status: StatusPencairanDana.TERCAIRKAN,
          realized_amount: input.realizedAmount,
          disbursed_at: new Date(),
          disbursed_by: userId,
          disbursement_note: input.note ?? null,
          ...(uploadedProof
            ? {
                transfer_proof_path: uploadedProof.path,
                transfer_proof_url: uploadedProof.url,
              }
            : {}),
        },
        select: financeProjectSelect,
      });

      // Notifikasi dosen hanya saat pencairan pertama (bukan saat edit nominal).
      if (!wasDisbursed) {
        await tx.notifications.create({
          data: {
            user_id: project.proposal.lead_researcher_id,
            title: "Dana Penelitian Dicairkan",
            message: `Dana untuk proyek "${project.title ?? project.proposal.title}" telah dicairkan sebesar Rp ${input.realizedAmount.toLocaleString("id-ID")}.`,
          },
        });
      }

      return saved;
    });

    // Bukti lama dibuang setelah data baru tersimpan (best-effort).
    if (uploadedProof && project.transfer_proof_path) {
      try {
        await supabase.storage
          .from(BUCKET_NAME)
          .remove([project.transfer_proof_path]);
      } catch {
        // abaikan kegagalan cleanup
      }
    }

    return {
      message: "Dana proyek berhasil dicairkan.",
      data: toListItem(updated),
    };
  } catch (error) {
    if (uploadedProof) {
      try {
        await supabase.storage.from(BUCKET_NAME).remove([uploadedProof.path]);
      } catch {
        // abaikan kegagalan cleanup
      }
    }

    throw error;
  }
};

export const exportFinanceExcel = async (
  filters: GetFinanceProjectsFilters,
): Promise<Buffer> => {
  const rows = await prisma.pengabdianProjects.findMany({
    where: buildWhere(filters),
    take: EXPORT_MAX_ROWS,
    orderBy: { created_at: "desc" },
    select: financeProjectSelect,
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Rekap Keuangan");

  worksheet.columns = [
    { header: "No", key: "no", width: 6 },
    { header: "Kode Proyek", key: "project_code", width: 20 },
    { header: "Judul", key: "title", width: 45 },
    { header: "Ketua Peneliti", key: "ketua", width: 28 },
    { header: "NIDN/NIP", key: "nidn", width: 18 },
    { header: "Fakultas", key: "fakultas", width: 26 },
    { header: "Skema", key: "skema", width: 26 },
    { header: "Dana Diajukan", key: "funding", width: 18 },
    { header: "Dana Cair", key: "realized", width: 18 },
    { header: "Status Pencairan", key: "status", width: 22 },
    { header: "Disetujui Oleh", key: "approved_by", width: 24 },
    { header: "Tanggal Cair", key: "disbursed_at", width: 16 },
  ];

  rows.forEach((row, index) => {
    const item = toListItem(row);
    worksheet.addRow({
      no: index + 1,
      project_code: item.project_code ?? "-",
      title: item.title ?? "-",
      ketua: item.ketua.name,
      nidn: item.ketua.nidn_nip ?? "-",
      fakultas: item.ketua.fakultas ?? "-",
      skema: item.proposal.skema ?? "-",
      funding: item.funding_request_amount,
      realized: item.realized_amount,
      status: item.disbursement_status,
      approved_by: item.approved_by ?? "-",
      disbursed_at: item.disbursed_at
        ? new Date(item.disbursed_at).toISOString().slice(0, 10)
        : "-",
    });
  });

  const excelBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(excelBuffer);
};

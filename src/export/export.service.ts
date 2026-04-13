import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { prisma } from "../prisma";
import { PengabdianProjectExport, WritableBuffer } from "./export.types";

const getPengabdianExportData = async (): Promise<
  PengabdianProjectExport[]
> => {
  return prisma.pengabdianProjects.findMany({
    select: {
      project_code: true,
      title: true,
      status: true,
      overall_progress: true,
      proposal: {
        select: {
          funding_request_amount: true,
          user: {
            select: {
              name: true,
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

const toNodeBuffer = (value: WritableBuffer): Buffer => {
  if (value instanceof Buffer) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(value));
  }

  return Buffer.from(value);
};

export const exportPengabdianExcel = async (): Promise<Buffer> => {
  const projects = await getPengabdianExportData();

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Rekap Pengabdian");

  worksheet.columns = [
    { header: "No", key: "no", width: 8 },
    { header: "Kode Proyek", key: "project_code", width: 24 },
    { header: "Judul", key: "title", width: 45 },
    { header: "Ketua Peneliti", key: "ketua_peneliti", width: 28 },
    { header: "Dana Disetujui", key: "dana_disetujui", width: 20 },
    { header: "Status", key: "status", width: 22 },
    { header: "Progress (%)", key: "progress", width: 15 },
  ];

  projects.forEach((project, index) => {
    worksheet.addRow({
      no: index + 1,
      project_code: project.project_code ?? "-",
      title: project.title ?? "-",
      ketua_peneliti: project.proposal.user.name,
      dana_disetujui: project.proposal.funding_request_amount,
      status: project.status,
      progress: project.overall_progress,
    });
  });

  const excelBuffer = await workbook.xlsx.writeBuffer();
  return toNodeBuffer(excelBuffer);
};

export const exportPengabdianPdf = async (): Promise<Buffer> => {
  const projects = await getPengabdianExportData();

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on("error", (error: Error) => {
      reject(error);
    });

    doc.fontSize(16).text("Rekapitulasi Pengabdian", { align: "center" });
    doc.moveDown();

    projects.forEach((project, index) => {
      doc.fontSize(12).text(`${index + 1}. Judul: ${project.title ?? "-"}`);
      doc.text(`   Kode Proyek: ${project.project_code ?? "-"}`);
      doc.text(`   Ketua Peneliti: ${project.proposal.user.name}`);
      doc.text(
        `   Dana Disetujui: Rp ${project.proposal.funding_request_amount.toLocaleString("id-ID")}`,
      );
      doc.text(`   Status: ${project.status}`);
      doc.text(`   Progress: ${project.overall_progress}%`);
      doc.moveDown();
    });

    doc.end();
  });
};

import { prisma } from "../prisma";
import { supabase } from "../config/storage";
import { HttpError } from "../common/errors/http-error";
import {
  PengabdianStatus,
  PengabdianDocumentType,
  DocumentVerificationStatus,
  PengabdianMilestoneStatus,
} from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";

const SUPABASE_BUCKET = "lppm_documents";
// const MILESTONE_DOCUMENT_BUCKET = "documents";

type MilestoneUploadFiles = {
  [fieldname: string]: Express.Multer.File[];
};

/**
 * Ambil URL publik dokumen dari Supabase Storage.
 * - Utama: pakai `public_url` yang tersimpan di database.
 * - Fallback (data lama yang public_url-nya NULL): hitung dari `file_path`.
 */
export const resolvePublicUrl = (doc: {
  file_path: string;
  public_url?: string | null;
}): string =>
  doc.public_url ??
  supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(doc.file_path).data
    .publicUrl;

export const getBaseDocumentTypeFromMilestone = (
  milestoneTitle: string,
  milestoneSequence: number,
): PengabdianDocumentType => {
  const title = milestoneTitle.toLowerCase();

  if (title.includes("akhir") || title.includes("final")) {
    return PengabdianDocumentType.LAPORAN_AKHIR;
  }

  if (milestoneSequence <= 1) {
    return PengabdianDocumentType.LAPORAN_KEMAJUAN_1;
  }

  return PengabdianDocumentType.LAPORAN_KEMAJUAN_2;
};

const mapFieldToDocumentType = (
  fieldName: string,
  baseDocumentType: PengabdianDocumentType,
): PengabdianDocumentType => {
  if (fieldName === "laporan") {
    return baseDocumentType;
  }

  if (fieldName === "logbook") {
    return PengabdianDocumentType.LOGBOOK_KEGIATAN;
  }

  if (fieldName === "anggaran") {
    return PengabdianDocumentType.BUKTI_PENGGUNAAN_ANGGARAN;
  }

  throw new HttpError(`Field upload tidak dikenali: ${fieldName}`, 400);
};

/** Catatan verifikasi untuk dokumen yang di-approve otomatis saat upload. */
const AUTO_APPROVED_NOTE = "Disetujui otomatis — bukan laporan akhir";

/**
 * Hanya `LAPORAN_AKHIR` yang tetap menunggu persetujuan Admin LPPM.
 * Semua dokumen lain (laporan kemajuan, logbook, bukti anggaran) di-approve
 * otomatis saat diunggah.
 */
const requiresAdminApproval = (
  documentType: PengabdianDocumentType,
): boolean => documentType === PengabdianDocumentType.LAPORAN_AKHIR;

/** Konteks dokumen (milestone + proyek) yang dibutuhkan untuk efek persetujuan. */
export type ApprovalContext = {
  id: number;
  title: string | null;
  document_type: PengabdianDocumentType;
  milestone: {
    id: number;
    sequence: number;
    target_percentage: number;
    project_id: number;
  } | null;
  project: {
    id: number;
    status: PengabdianStatus;
    proposal: {
      lead_researcher_id: number;
    };
  };
};

export type ApprovalEffects = {
  milestone: {
    id: number;
    status: PengabdianMilestoneStatus;
    completed_at: Date | null;
  } | null;
  project: {
    id: number;
    status: PengabdianStatus;
    overall_progress: number;
    start_date: Date | null;
    end_date: Date | null;
  } | null;
  next_milestone: {
    id: number;
    sequence: number;
    status: PengabdianMilestoneStatus;
    due_date: Date | null;
  } | null;
};

/**
 * Efek persetujuan dokumen milestone — dipakai `approveDocument` (Admin LPPM)
 * dan auto-approve saat upload:
 * 1. milestone -> COMPLETED (+ completed_at)
 * 2. proyek.overall_progress = target milestone
 * 3. proyek PENDING -> SEDANG_BERJALAN (+ start_date)
 * 4. milestone terakhir -> proyek SELESAI (+ end_date)
 * 5. milestone berikutnya -> ONGOING (+ due_date 40 hari)
 * 6. notifikasi ke ketua peneliti
 *
 * Harus dipanggil di dalam `prisma.$transaction`.
 */
export const applyApprovalEffects = async (
  tx: Prisma.TransactionClient,
  document: ApprovalContext,
  approvedAt: Date,
): Promise<ApprovalEffects> => {
  if (!document.milestone) {
    throw new HttpError(
      "Dokumen tidak terhubung ke milestone, tidak dapat melakukan proses persetujuan milestone.",
      400,
    );
  }

  const updatedMilestone = await tx.pengabdianMilestones.update({
    where: { id: document.milestone.id },
    data: {
      status: PengabdianMilestoneStatus.COMPLETED,
      completed_at: approvedAt,
    },
    select: {
      id: true,
      status: true,
      completed_at: true,
    },
  });

  const projectUpdateData: Prisma.PengabdianProjectsUpdateInput = {};

  // Progres mengikuti target milestone (0 / 30 / 70 / 100), bukan hardcode sequence.
  projectUpdateData.overall_progress = document.milestone.target_percentage;

  // Proyek dianggap berjalan saat milestone pertama disetujui.
  if (document.project.status === PengabdianStatus.PENDING) {
    projectUpdateData.status = PengabdianStatus.SEDANG_BERJALAN;
    projectUpdateData.start_date = approvedAt;
  }

  // Proyek hanya SELESAI jika milestone yang disetujui adalah yang terakhir
  // (tidak ada milestone dengan sequence lebih besar). Dengan ini "Laporan
  // Akhir" wajib disetujui lebih dulu sebelum proyek dianggap selesai.
  const moreMilestones = await tx.pengabdianMilestones.count({
    where: {
      project_id: document.milestone.project_id,
      sequence: { gt: document.milestone.sequence },
    },
  });

  if (moreMilestones === 0) {
    projectUpdateData.status = PengabdianStatus.SELESAI;
    projectUpdateData.end_date = approvedAt;
  }

  let updatedProject: ApprovalEffects["project"] = null;

  if (Object.keys(projectUpdateData).length > 0) {
    updatedProject = await tx.pengabdianProjects.update({
      where: { id: document.project.id },
      data: projectUpdateData,
      select: {
        id: true,
        status: true,
        overall_progress: true,
        start_date: true,
        end_date: true,
      },
    });
  }

  const nextSequence = document.milestone.sequence + 1;
  const dueDate = new Date(approvedAt);
  dueDate.setDate(dueDate.getDate() + 40);

  const nextMilestoneRaw = await tx.pengabdianMilestones.findUnique({
    where: {
      project_id_sequence: {
        project_id: document.milestone.project_id,
        sequence: nextSequence,
      },
    },
    select: {
      id: true,
      sequence: true,
    },
  });

  let nextMilestone: ApprovalEffects["next_milestone"] = null;

  if (nextMilestoneRaw) {
    nextMilestone = await tx.pengabdianMilestones.update({
      where: { id: nextMilestoneRaw.id },
      data: {
        status: PengabdianMilestoneStatus.ONGOING,
        due_date: dueDate,
      },
      select: {
        id: true,
        sequence: true,
        status: true,
        due_date: true,
      },
    });
  }

  const docName = document.title?.trim() || document.document_type;

  await tx.notifications.create({
    data: {
      user_id: document.project.proposal.lead_researcher_id,
      title: "Dokumen Milestone Disetujui",
      message: `Dokumen ${docName} telah disetujui.`,
    },
  });

  return {
    milestone: updatedMilestone,
    project: updatedProject,
    next_milestone: nextMilestone,
  };
};

/**
 * Upload dokumen laporan pengabdian ke Supabase Storage
 */
export const uploadDocument = async (
  projectId: number,
  documentType: PengabdianDocumentType,
  file: Express.Multer.File,
  uploadedByUserId: number,
) => {
  // Validasi project exists
  const project = await prisma.pengabdianProjects.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new HttpError(
      `Proyek pengabdian dengan ID ${projectId} tidak ditemukan.`,
      404,
    );
  }

  // Buat nama file unik: timestamp-originalname
  const timestamp = Date.now();
  const safeFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueFileName = `${timestamp}-${safeFileName}`;
  const filePath = `pengabdian/${projectId}/${uniqueFileName}`;

  try {
    // Upload file ke Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: "3600",
      });

    if (uploadError || !data) {
      throw new Error(`Gagal upload ke Supabase: ${uploadError?.message}`);
    }

    // Dapatkan public URL untuk disimpan di database (dipakai tombol "Lihat")
    const {
      data: { publicUrl },
    } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filePath);

    // Simpan ke database PengabdianDocuments
    // (hanya LAPORAN_AKHIR yang menunggu admin; sisanya langsung APPROVED)
    const document = await prisma.pengabdianDocuments.create({
      data: {
        project_id: projectId,
        document_type: documentType,
        title: file.originalname,
        file_path: filePath,
        public_url: publicUrl,
        file_size: file.size,
        mime_type: file.mimetype,
        verification_status: requiresAdminApproval(documentType)
          ? DocumentVerificationStatus.PENDING
          : DocumentVerificationStatus.APPROVED,
        verification_notes: requiresAdminApproval(documentType)
          ? null
          : AUTO_APPROVED_NOTE,
        uploaded_by: uploadedByUserId,
      },
    });

    return {
      id: document.id,
      project_id: document.project_id,
      file_path: document.file_path,
      title: document.title,
      document_type: document.document_type,
      verification_status: document.verification_status,
      uploaded_at: document.uploaded_at,
    };
  } catch (error) {
    // Jika terjadi error saat upload, pastikan file dihapus dari Supabase
    try {
      await supabase.storage.from(SUPABASE_BUCKET).remove([filePath]);
    } catch {
      // Abaikan error saat cleanup
    }

    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(
      `Terjadi kesalahan saat upload dokumen: ${error instanceof Error ? error.message : "Unknown error"}`,
      500,
    );
  }
};

export const uploadMilestoneDocuments = async (
  projectId: number,
  milestoneId: number,
  files: MilestoneUploadFiles,
  userId: number,
  isDraft: boolean,
) => {
  const [project, milestone] = await Promise.all([
    prisma.pengabdianProjects.findUnique({ where: { id: projectId } }),
    prisma.pengabdianMilestones.findUnique({ where: { id: milestoneId } }),
  ]);

  if (!project) {
    throw new HttpError(
      `Proyek pengabdian dengan ID ${projectId} tidak ditemukan.`,
      404,
    );
  }

  if (!milestone || milestone.project_id !== projectId) {
    throw new HttpError(
      `Milestone dengan ID ${milestoneId} tidak ditemukan pada proyek ${projectId}.`,
      404,
    );
  }

  const baseDocumentType = getBaseDocumentTypeFromMilestone(
    milestone.title,
    milestone.sequence,
  );

  const fileEntries = Object.entries(files).flatMap(([fieldName, values]) =>
    (values ?? []).map((file) => ({ fieldName, file })),
  );

  if (fileEntries.length === 0) {
    throw new HttpError("Minimal satu file harus diunggah.", 400);
  }

  const uploadTasks = fileEntries.map(async ({ fieldName, file }) => {
    const documentType = mapFieldToDocumentType(fieldName, baseDocumentType);
    const safeFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${Date.now()}-${safeFileName}`;
    const filePath = `pengabdian/${projectId}/milestone_${milestoneId}/${uniqueFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw new HttpError(
        `Gagal upload file ${file.originalname}: ${uploadError.message}`,
        500,
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filePath);

    // Status per dokumen:
    // - draft            -> DRAFT (menunggu dosen kirim final)
    // - LAPORAN_AKHIR    -> PENDING (menunggu Admin LPPM)
    // - selainnya        -> APPROVED otomatis
    const isFinalReport = requiresAdminApproval(documentType);
    const verificationStatus: DocumentVerificationStatus = isDraft
      ? "DRAFT"
      : isFinalReport
        ? DocumentVerificationStatus.PENDING
        : DocumentVerificationStatus.APPROVED;

    const createdDocument = await prisma.pengabdianDocuments.create({
      data: {
        project_id: projectId,
        milestone_id: milestoneId,
        document_type: documentType,
        title: file.originalname,
        file_path: filePath,
        public_url: publicUrl,
        file_size: file.size,
        mime_type: file.mimetype,
        verification_status: verificationStatus,
        verification_notes: !isDraft && !isFinalReport ? AUTO_APPROVED_NOTE : null,
        uploaded_by: userId,
      },
    });

    return {
      ...createdDocument,
      public_url: publicUrl,
      upload_field: fieldName,
    };
  });

  const uploadedDocuments = await Promise.all(uploadTasks);

  // Setelah semua dokumen berhasil diunggah:
  // - Dokumen non-akhir (laporan kemajuan, logbook, bukti anggaran) langsung
  //   APPROVED -> jalankan efek persetujuan SEKALI: milestone COMPLETED,
  //   progres naik ke target milestone, milestone berikutnya dibuka (ONGOING),
  //   dan notifikasi ke ketua peneliti.
  // - Milestone "akhir" (judul akhir/final atau milestone terakhir) TIDAK pernah
  //   di-auto-complete: proyek baru SELESAI setelah Admin LPPM menyetujui
  //   LAPORAN_AKHIR.
  // - Draft tetap menunggu dosen mengirim versi final.
  const autoApprovedDocuments = uploadedDocuments.filter(
    (doc) => doc.verification_status === DocumentVerificationStatus.APPROVED,
  );

  const moreMilestones = await prisma.pengabdianMilestones.count({
    where: {
      project_id: projectId,
      sequence: { gt: milestone.sequence },
    },
  });

  const isFinalMilestone =
    baseDocumentType === PengabdianDocumentType.LAPORAN_AKHIR ||
    moreMilestones === 0;

  const shouldAutoComplete =
    !isDraft &&
    !isFinalMilestone &&
    autoApprovedDocuments.length > 0 &&
    milestone.status !== PengabdianMilestoneStatus.COMPLETED;

  if (shouldAutoComplete) {
    await prisma.$transaction(async (tx) => {
      const context = await tx.pengabdianDocuments.findUnique({
        where: { id: autoApprovedDocuments[0].id },
        include: {
          milestone: {
            select: {
              id: true,
              sequence: true,
              target_percentage: true,
              project_id: true,
            },
          },
          project: {
            select: {
              id: true,
              status: true,
              proposal: {
                select: {
                  lead_researcher_id: true,
                },
              },
            },
          },
        },
      });

      if (!context) {
        throw new HttpError(
          `Dokumen dengan ID ${autoApprovedDocuments[0].id} tidak ditemukan.`,
          404,
        );
      }

      await applyApprovalEffects(tx, context, new Date());
    });
  } else if (milestone.status !== PengabdianMilestoneStatus.COMPLETED) {
    // Milestone tetap/diatur ke ONGOING sampai dokumen disetujui admin.
    await prisma.pengabdianMilestones.updateMany({
      where: {
        id: milestoneId,
        status: { not: PengabdianMilestoneStatus.COMPLETED },
      },
      data: { status: PengabdianMilestoneStatus.ONGOING },
    });
  }

  return uploadedDocuments;
};

/**
 * Ambil semua dokumen terkait project
 */
export const getDocumentsByProjectId = async (projectId: number) => {
  // Validasi project exists
  const project = await prisma.pengabdianProjects.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new HttpError(
      `Proyek pengabdian dengan ID ${projectId} tidak ditemukan.`,
      404,
    );
  }

  const documents = await prisma.pengabdianDocuments.findMany({
    where: { project_id: projectId },
    select: {
      id: true,
      project_id: true,
      milestone_id: true,
      title: true,
      file_path: true,
      public_url: true,
      file_size: true,
      mime_type: true,
      document_type: true,
      verification_status: true,
      uploaded_at: true,
      uploader: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { uploaded_at: "desc" },
  });

  return documents.map((document) => ({
    ...document,
    public_url: resolvePublicUrl(document),
  }));
};

/**
 * Verifikasi dokumen (set status APPROVED atau REJECTED dengan opsional notes)
 */
export const approveDocument = async (
  documentId: number,
  statusTujuan: DocumentVerificationStatus,
  notes?: string,
) => {
  try {
    const approvedAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const document = await tx.pengabdianDocuments.findUnique({
        where: { id: documentId },
        include: {
          milestone: {
            select: {
              id: true,
              sequence: true,
              target_percentage: true,
              project_id: true,
            },
          },
          project: {
            select: {
              id: true,
              status: true,
              proposal: {
                select: {
                  lead_researcher_id: true,
                },
              },
            },
          },
        },
      });

      if (!document) {
        throw new HttpError(
          `Dokumen dengan ID ${documentId} tidak ditemukan.`,
          404,
        );
      }

      const updatedDocument = await tx.pengabdianDocuments.update({
        where: { id: documentId },
        data: {
          verification_status: statusTujuan,
          verification_notes: notes ?? null,
        },
      });

      let updatedMilestone: ApprovalEffects["milestone"] = null;

      let updatedProject: ApprovalEffects["project"] = null;

      let nextMilestone: ApprovalEffects["next_milestone"] = null;

      if (statusTujuan === DocumentVerificationStatus.APPROVED) {
        // Efek persetujuan (milestone COMPLETED, progres proyek, milestone
        // berikutnya, notifikasi) dibagikan dengan auto-approve saat upload.
        const effects = await applyApprovalEffects(tx, document, approvedAt);
        updatedMilestone = effects.milestone;
        updatedProject = effects.project;
        nextMilestone = effects.next_milestone;
      }

      return {
        document: updatedDocument,
        milestone: updatedMilestone,
        project: updatedProject,
        next_milestone: nextMilestone,
      };
    });

    return {
      message: `Dokumen berhasil diverifikasi dengan status ${statusTujuan}.`,
      data: result,
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(
      `Terjadi kesalahan saat memproses persetujuan dokumen milestone: ${error instanceof Error ? error.message : "Unknown error"}`,
      500,
    );
  }
};

export const verifyDocument = approveDocument;

/**
 * Hapus dokumen dari Supabase Storage dan database
 * - Dokumen yang sudah APPROVED tidak boleh dihapus
 */
export const deleteDocument = async (documentId: number) => {
  const document = await prisma.pengabdianDocuments.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new HttpError(
      `Dokumen dengan ID ${documentId} tidak ditemukan.`,
      404,
    );
  }

  // Cek status: APPROVED dokumen tidak boleh dihapus
  if (document.verification_status === DocumentVerificationStatus.APPROVED) {
    throw new HttpError(
      "Dokumen yang sudah disetujui tidak dapat dihapus.",
      400,
    );
  }

  try {
    // Hapus file dari Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .remove([document.file_path]);

    if (deleteError) {
      throw new Error(`Gagal hapus dari Supabase: ${deleteError.message}`);
    }

    // Hapus record dari database
    await prisma.pengabdianDocuments.delete({
      where: { id: documentId },
    });

    return { message: "Dokumen berhasil dihapus.", id: documentId };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(
      `Terjadi kesalahan saat menghapus dokumen: ${error instanceof Error ? error.message : "Unknown error"}`,
      500,
    );
  }
};

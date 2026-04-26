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

const getBaseDocumentTypeFromMilestone = (
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

    // Dapatkan public URL (untuk referensi)
    supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filePath);

    // Simpan ke database PengabdianDocuments
    const document = await prisma.pengabdianDocuments.create({
      data: {
        project_id: projectId,
        document_type: documentType,
        title: file.originalname,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.mimetype,
        verification_status: DocumentVerificationStatus.PENDING,
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

  const initialStatus = (
    isDraft ? "DRAFT" : DocumentVerificationStatus.PENDING
  ) as DocumentVerificationStatus;

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

    const createdDocument = await prisma.pengabdianDocuments.create({
      data: {
        project_id: projectId,
        milestone_id: milestoneId,
        document_type: documentType,
        title: file.originalname,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.mimetype,
        verification_status: initialStatus,
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

  // Setelah semua dokumen berhasil diunggah, update milestone & project progress secara atomik
  if (!isDraft) {
    await prisma.$transaction([
      // a. Ubah status milestone menjadi COMPLETED
      prisma.pengabdianMilestones.update({
        where: { id: milestoneId },
        data: { status: PengabdianMilestoneStatus.COMPLETED },
      }),
      // b. Timpa overall_progress proyek dengan target_percentage milestone ini
      prisma.pengabdianProjects.update({
        where: { id: projectId },
        data: { overall_progress: milestone.target_percentage },
      }),
    ]);
  } else {
    // Draft: tandai milestone sebagai ONGOING agar progress bar bisa me-render status
    await prisma.pengabdianMilestones.update({
      where: { id: milestoneId },
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

  return documents;
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
              project_id: true,
            },
          },
          project: {
            select: {
              id: true,
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

      let updatedMilestone: {
        id: number;
        status: PengabdianMilestoneStatus;
        completed_at: Date | null;
      } | null = null;

      let updatedProject: {
        id: number;
        status: PengabdianStatus;
        overall_progress: number;
        start_date: Date | null;
        end_date: Date | null;
      } | null = null;

      let nextMilestone: {
        id: number;
        sequence: number;
        status: PengabdianMilestoneStatus;
        due_date: Date | null;
      } | null = null;

      if (statusTujuan === DocumentVerificationStatus.APPROVED) {
        if (!document.milestone) {
          throw new HttpError(
            "Dokumen tidak terhubung ke milestone, tidak dapat melakukan proses persetujuan milestone.",
            400,
          );
        }

        updatedMilestone = await tx.pengabdianMilestones.update({
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

        if (document.milestone.sequence === 0) {
          projectUpdateData.status = PengabdianStatus.SEDANG_BERJALAN;
          projectUpdateData.start_date = approvedAt;
        } else if (document.milestone.sequence === 1) {
          projectUpdateData.overall_progress = 30;
        } else if (document.milestone.sequence === 2) {
          projectUpdateData.overall_progress = 70;
        } else if (document.milestone.sequence === 3) {
          projectUpdateData.overall_progress = 100;
          projectUpdateData.status = PengabdianStatus.SELESAI;
          projectUpdateData.end_date = approvedAt;
        }

        if (Object.keys(projectUpdateData).length > 0) {
          updatedProject = await tx.pengabdianProjects.update({
            where: { id: document.project_id },
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

        const docName =
          updatedDocument.title?.trim() || updatedDocument.document_type;

        await tx.notifications.create({
          data: {
            user_id: document.project.proposal.lead_researcher_id,
            title: "Dokumen Milestone Disetujui",
            message: `Dokumen ${docName} telah disetujui.`,
          },
        });
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

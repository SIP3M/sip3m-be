import { prisma } from "../prisma";
import { supabase } from "../config/storage";
import { HttpError } from "../common/errors/http-error";
import {
  PengabdianDocumentType,
  DocumentVerificationStatus,
} from "../generated/prisma/enums";

const SUPABASE_BUCKET = "lppm_documents";

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
export const verifyDocument = async (
  documentId: number,
  status: DocumentVerificationStatus,
  notes?: string,
) => {
  const document = await prisma.pengabdianDocuments.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new HttpError(
      `Dokumen dengan ID ${documentId} tidak ditemukan.`,
      404,
    );
  }

  const updatedDocument = await prisma.pengabdianDocuments.update({
    where: { id: documentId },
    data: {
      verification_status: status,
      verification_notes: notes || null,
    },
  });

  return updatedDocument;
};

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

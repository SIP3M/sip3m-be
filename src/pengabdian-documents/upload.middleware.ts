import multer, { MulterError } from "multer";
import { Response, NextFunction, Request } from "express";

// Konfigurasi Multer dengan memory storage
const storage = multer.memoryStorage();

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
]);

// Filter file: terima PDF, DOCX, XLSX, ZIP
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback,
): void => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    callback(
      new Error(
        `File type tidak didukung. Format yang diperbolehkan: PDF, DOCX, XLSX, ZIP. Anda mengunggah: ${file.mimetype}`,
      ),
    );
    return;
  }

  callback(null, true);
};

// Buat middleware upload
export const uploadDocumentMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

export const milestoneDocumentUploadFields: multer.Field[] = [
  { name: "laporan", maxCount: 1 },
  { name: "logbook", maxCount: 1 },
  { name: "anggaran", maxCount: 1 },
];

// Error handler untuk upload
export const handleUploadError = (
  err: Error | null,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (err instanceof MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        message: `Ukuran file terlalu besar. Maksimal 10 MB.`,
      });
      return;
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      res.status(400).json({
        message: "Hanya satu file yang diperbolehkan.",
      });
      return;
    }
    res.status(400).json({
      message: `Upload error: ${err.message}`,
    });
    return;
  }

  if (err) {
    res.status(400).json({
      message: err.message,
    });
    return;
  }

  next();
};

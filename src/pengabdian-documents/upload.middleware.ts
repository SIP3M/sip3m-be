import multer, { MulterError } from "multer";
import { Response, NextFunction, Request } from "express";

// Konfigurasi Multer dengan memory storage
const storage = multer.memoryStorage();

// Filter file: hanya terima PDF
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback,
): void => {
  // Cek MIME type
  if (file.mimetype !== "application/pdf") {
    callback(
      new Error(
        `File type tidak didukung. Hanya file PDF yang diperbolehkan. Anda mengunggah: ${file.mimetype}`,
      ),
    );
    return;
  }

  // Cek ekstensi file
  const allowedExtensions = [".pdf"];
  const fileExtension = (file.originalname.match(/\.[^/.]+$/) || [""])[0];
  if (!allowedExtensions.includes(fileExtension.toLowerCase())) {
    callback(
      new Error(
        `Ekstensi file tidak didukung. Hanya file PDF (.pdf) yang diperbolehkan.`,
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
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

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
        message: `Ukuran file terlalu besar. Maksimal 5 MB.`,
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

import multer, { MulterError } from "multer";
import type { Request, Response, NextFunction } from "express";

const allowedProofMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const fileFilter: multer.Options["fileFilter"] = (_req, file, callback): void => {
  if (!allowedProofMimeTypes.has(file.mimetype)) {
    callback(
      new Error("Bukti transfer harus berformat PDF, JPG, atau PNG."),
    );
    return;
  }

  callback(null, true);
};

/** Upload bukti transfer (opsional) — disimpan di memory, lalu ke Supabase. */
export const financeUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const handleFinanceUploadError = (
  err: Error | null,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (err instanceof MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        message: "Ukuran file terlalu besar. Maksimal 5 MB.",
      });
      return;
    }

    res.status(400).json({ message: `Upload error: ${err.message}` });
    return;
  }

  if (err) {
    res.status(400).json({ message: err.message });
    return;
  }

  next();
};

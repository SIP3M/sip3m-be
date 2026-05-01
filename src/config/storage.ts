import { createClient } from "@supabase/supabase-js";
import multer, { MulterError } from "multer";
import dotenv from "dotenv";
import type { Request, Response, NextFunction } from "express";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_KEY as string;
export const supabase = createClient(supabaseUrl, supabaseKey);

const storage = multer.memoryStorage();
const allowedProposalMimeTypes = new Set(["application/pdf"]);
const allowedRabMimeTypes = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const fileFilter: multer.Options["fileFilter"] = (
  _req,
  file,
  callback,
): void => {
  if (file.fieldname === "proposal_file") {
    if (!allowedProposalMimeTypes.has(file.mimetype)) {
      callback(
        new Error("File proposal harus berformat PDF (application/pdf)."),
      );
      return;
    }
    callback(null, true);
    return;
  }

  if (file.fieldname === "rab_file") {
    if (!allowedRabMimeTypes.has(file.mimetype)) {
      callback(
        new Error(
          "File RAB harus berformat PDF atau Excel (application/pdf, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet).",
        ),
      );
      return;
    }
    callback(null, true);
    return;
  }

  callback(null, true);
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const handleProposalUploadError = (
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

import { Response, Request } from 'express';
import { registerDosen, loginUser, registerReviewer } from './auth.service';
import { HttpError } from '../common/errors/http-error';
import {
  LoginInput,
  RegisterDosenInput,

} from './types/auth.types';
import { AuthenticatedRequest } from './types/auth.jwt.types';
import { prisma } from '../prisma';
import { loginSchema, registerDosenSchema, registerReviewerSchema } from './auth.validation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_ANON_KEY as string
);

// register
export const registerDosenController = async (
  req: { body: RegisterDosenInput },
  res: Response,
) : Promise<Response> => {
  try {
    const validation = registerDosenSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: 'Validasi data gagal.',
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const user = await registerDosen(validation.data);
    
    return res.status(201).json({
      message: 'Registrasi Dosen berhasil. Akun Anda sedang menunggu verifikasi oleh Admin.',
      data: user,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: 'Terjadi kesalahan pada server saat registrasi.',
    });
  }
}

// register reviewer
export const registerReviewerController = async (
  req: Request, 
  res: Response,
) => { 
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File CV wajib diunggah." });
    }
    
    // 👇 PROSES UPLOAD KE SUPABASE
    // Buat nama file unik (gabungan timestamp dan nama asli file)
    const uniqueFileName = `cv-${Date.now()}-${req.file.originalname.replace(/\s+/g, '-')}`;
    
    // Upload buffer dari memori ke Supabase Storage (bucket: cv_reviewer)
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('cv_reviewer') // Pastikan nama bucket sesuai dengan yang kamu buat
      .upload(uniqueFileName, req.file.buffer, {
        contentType: req.file.mimetype,
      });

    if (uploadError) {
      console.error('[SUPABASE_UPLOAD_ERROR]', uploadError);
      return res.status(500).json({ message: "Gagal mengunggah file CV ke Storage." });
    }

    // Ambil Public URL dari file yang baru saja diupload
    const { data: publicUrlData } = supabase
      .storage
      .from('cv_reviewer')
      .getPublicUrl(uniqueFileName);

    // Ini adalah URL asli yang bisa dibuka di browser (https://...)
    const cvFilePath = publicUrlData.publicUrl; 

    // 👇 PROSES VALIDASI ZOD
    // Gabungkan body dengan cv_path (URL dari Supabase)
    const dataToValidate = {
      ...req.body,
      cv_path: cvFilePath 
    };

    const validation = registerReviewerSchema.safeParse(dataToValidate);

    if (!validation.success) {
      // (Opsional tapi direkomendasikan: Hapus file dari Supabase jika validasi Zod gagal)
      await supabase.storage.from('cv_reviewer').remove([uniqueFileName]);

      return res.status(400).json({
        message: "Validasi data gagal!",
        errors: validation.error.flatten().fieldErrors 
      });
    }

    // Simpan ke database melalui service
    const user = await registerReviewer(validation.data, cvFilePath);

    return res.status(201).json({
      message: 'Registrasi Reviewer Eksternal berhasil. Akun Anda sedang menunggu verifikasi oleh Admin LPPM.',
      data: user,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    
    console.error('[REGISTER_REVIEWER_ERROR]', error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server saat registrasi.' });
  }
};

// login
export const loginController = async (
  req: { body: LoginInput },
  res: Response
): Promise<Response> => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: "Validasi data gagal!",
        errors: validation.error.flatten().fieldErrors 
      });
    }

    const result = await loginUser(validation.data);

    return res.status(200).json({
      message: 'Login berhasil.',
      data: result,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Terjadi kesalahan pada server saat login.'});
  }
};

// me endpoint untuk mendapatkan info user yang sedang login
export const me = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Unauthorized.',
    });
  }

  const userId = Number(req.user.userId);

  if (Number.isNaN(userId)) {
    return res.status(401).json({
      message: 'Invalid authentication token.',
    });
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: {
      roles: {
        select: {
          id: true,
          roles: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(404).json({
      message: 'User not found.',
    });
  }

  return res.status(200).json({
    data: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      nomor_hp: user.nomor_hp,
      is_active: user.is_active,
      roles: {
        id: user.roles.id,
        roles: user.roles.roles,
      },
      nidn: user.nidn_nip,
      fakultas: user.fakultas,
      program_studi: user.program_studi,
      instansi: user.instansi,
      bidang_keahlian: user.bidang_keahlian,
      pengalaman_review: user.pengalaman_review
    },
  });
};

// 
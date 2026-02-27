export interface RegisterRequestBody {
  name?: string;
  email?: string;
  password?: string;
  nidn?: string;
  fakultas?: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  nidn: string | null;
  fakultas: string | null;
  roles: {
    id: number;
    roles: string;
  };
}

export interface RegisterDosenInput {
  name: string;
  email: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  alamat?: string;
  nomor_hp: string;
  nidn: string;
  fakultas: string;
  program_studi: string;
  username: string;
  password: string;
}

export interface RegisterDosenResult {
  id: number;
  name: string;
  email: string;
  username: string | null;
  nidn: string | null;
  roles: {
    id: number;
    roles: string;
  };
  is_active: boolean | null;
}

export interface RegisterReviewerInput {
  name: string;
  email: string;
  nomor_hp: string;
  instansi: string;
  bidang_keahlian: string;
  pengalaman_review: string;
  cv_path: string;
  username: string;
  password: string;
}

export interface RegisterReviewerResult {
  id: number;
  name: string;
  email: string;
  username: string | null;
  roles: {
    id: number;
    roles: string;
  };
  is_active: boolean | null;
}

export interface LoginInput {
  identifier: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResult {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    nidn: string | null;
    fakultas: string | null;
    roles: {
      id: number;
      roles: string;
    };
  };
}

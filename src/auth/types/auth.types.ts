// REQUEST TYPES

export interface RegisterRequestBody {
  name?: string;
  email?: string;
  password?: string;
  nidn?: string;
  fakultas?: string;
}

export interface LoginRequestBody {
  email?: string;
  password?: string;
}

// SERVICE INPUT TYPES

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  nidn?: string;
  fakultas?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// RESPONSE TYPES

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

export interface RegisterResult {
  id: number;
  name: string;
  email: string;
  nidn: string | null;
  fakultas: string | null;
  roles: {
    id: number;
    roles: string;
  };
  created_at: Date;
}

export interface LoginResult {
  access_token: string;
  user: AuthUser;
}

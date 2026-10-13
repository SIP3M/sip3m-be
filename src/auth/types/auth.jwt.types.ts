import { JwtPayload } from "jsonwebtoken";
import { Request } from "express";

export interface AuthJwtPayload extends JwtPayload {
  sub?: string;
  userId?: number;
  role?: string;
  roles?: string;
  jti?: string;
  deviceId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthJwtPayload;
}

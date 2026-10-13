import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "../../common/errors/http-error";
import { AuthenticatedRequest, AuthJwtPayload } from "../types/auth.jwt.types";
import { isSessionActive } from "../session.service";

export const authMiddleware = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new HttpError("Authorization header is missing.", 401);
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new HttpError("Invalid authorization format.", 401);
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new HttpError("JWT secret is not configured.", 500);
  }

  try {
    const decoded = jwt.verify(token, secret) as AuthJwtPayload;
    // Single-Session per Browser: jti harus masih aktif
    if (decoded.jti) {
      const active = await isSessionActive(decoded.jti);
      if (!active) {
        throw new HttpError("Sesi di browser ini sudah digantikan. Silakan login ulang.", 401);
      }
    }
    req.user = {
      ...decoded,
      sub: decoded.sub ?? (decoded.userId ? String(decoded.userId) : undefined),
      userId: decoded.userId ?? (decoded.sub ? Number(decoded.sub) : undefined),
      role: decoded.role ?? decoded.roles,
      roles: decoded.roles ?? decoded.role,
    };
    next();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError("Invalid or expired authentication token.", 401);
  }
};

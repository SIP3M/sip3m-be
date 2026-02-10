import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from '../../common/errors/http-error';
import {
  AuthenticatedRequest,
  AuthJwtPayload,
} from '../types/auth.jwt.types';

export const authMiddleware = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  console.log('[AUTH HEADER]', req.headers.authorization);

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new HttpError('Authorization header is missing.', 401);
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new HttpError('Invalid authorization format.', 401);
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new HttpError('JWT secret is not configured.', 500);
  }


  try {
    const decoded = jwt.verify(token, secret) as AuthJwtPayload;
    req.user = decoded;
    next();
  } catch {
    throw new HttpError('Invalid or expired authentication token.', 401);
  }

};

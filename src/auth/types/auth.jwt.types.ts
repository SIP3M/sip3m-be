import { JwtPayload } from 'jsonwebtoken';
import { Request } from 'express';

export interface AuthJwtPayload extends JwtPayload {
  sub: string;
  roles: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthJwtPayload;
}

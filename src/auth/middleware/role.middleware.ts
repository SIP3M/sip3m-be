import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/auth.jwt.types";
import { HttpError } from "../../common/errors/http-error";
import { Role } from "../role";

export const requireRole =
  (allowedRoles: Role[]) =>
  (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new HttpError("Unauthorized.", 401);
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      throw new HttpError(
        "You do not have permission to access this resource.",
        403,
      );
    }

    next();
  };

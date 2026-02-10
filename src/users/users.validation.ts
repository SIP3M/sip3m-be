import { z } from 'zod';
import { ROLES } from '../auth/role';

export const updateUserRoleSchema = z.object({
  roles: z.enum([
    ROLES.ADMIN_LPPM,
    ROLES.STAFF_LPPM,
    ROLES.DOSEN,
    ROLES.REVIEWER,
    ROLES.PIHAK_EKSTERNAL,
  ]),
});

export const updateUserStatusSchema = z.object({
  is_active: z.boolean(),
});

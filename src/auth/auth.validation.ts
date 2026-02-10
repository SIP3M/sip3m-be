import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required.")
    .min(3, 'Name must be at least 3 characters.')
    .max(100, 'Name must not exceed 100 characters.'),

  email: z
    .string()
    .min(1, 'Email is required.')
    .email('Email format is invalid.'),

  password: z
    .string()
    .min(1, 'Password is required.')
    .min(8, 'Password must be at least 8 characters.')
    .max(100, 'Password must not exceed 100 characters.'),

  nidn: z
    .string()
    .length(9, 'NIDN must be exactly 9 digits.')
    .regex(/^\d+$/, 'NIDN must contain only numbers.')
    .optional(),

  fakultas: z
    .string()
    .min(3, 'Faculty name is too short.')
    .max(100, 'Faculty name is too long.')
    .optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required.')
    .email('Email format is invalid.'),

  password: z
    .string()
    .min(1, 'Password is required.')
    .min(8, 'Password must be at least 8 characters.')
    .max(100, 'Password must not exceed 100 characters.'),
});

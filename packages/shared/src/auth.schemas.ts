import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const createCollegeSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  // Initial College Admin created alongside the college
  adminFullName: z.string().min(2),
  adminEmail: z.string().email(),
});
export type CreateCollegeInput = z.infer<typeof createCollegeSchema>;

export const createUserSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['COLLEGE_ADMIN', 'PLACEMENT_OFFICER']),
  phone: z.string().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

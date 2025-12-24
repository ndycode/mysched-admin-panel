import { z } from 'zod'

import { RoleEnum, StatusEnum } from './shared'

// Password must have: 8+ chars, at least one uppercase, lowercase, number, and special char
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const UserCreateSchema = z
  .object({
    email: z.string().email('Valid email required').toLowerCase(),
    password: passwordSchema,
    full_name: z.string().trim().min(1, 'Full name is required').max(120, 'Max 120 characters'),
    student_id: z.string().trim().max(40, 'Max 40 characters').nullable().optional(),
    app_user_id: z.coerce.number().int().nonnegative('App user id must be >= 0').nullable().optional(),
    role: RoleEnum.optional(),
    status: StatusEnum.optional(),
  })
  .strict()

export const UserPatchSchema = z
  .object({
    email: z.string().email('Valid email required').toLowerCase().optional(),
    password: passwordSchema.optional(),
    full_name: z.string().trim().max(120, 'Max 120 characters').optional(),
    student_id: z.string().trim().max(40, 'Max 40 characters').nullable().optional(),
    app_user_id: z.coerce.number().int().nonnegative('App user id must be >= 0').nullable().optional(),
    role: RoleEnum.optional(),
    status: StatusEnum.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'No changes supplied' })

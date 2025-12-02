import { z } from 'zod'

import { RoleEnum, StatusEnum } from './shared'

export const UserCreateSchema = z
  .object({
    email: z.string().email('Valid email required').toLowerCase(),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long'),
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
    password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long').optional(),
    full_name: z.string().trim().max(120, 'Max 120 characters').optional(),
    student_id: z.string().trim().max(40, 'Max 40 characters').nullable().optional(),
    app_user_id: z.coerce.number().int().nonnegative('App user id must be >= 0').nullable().optional(),
    role: RoleEnum.optional(),
    status: StatusEnum.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'No changes supplied' })

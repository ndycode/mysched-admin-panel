import { z } from 'zod';

export const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const SectionSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(40, 'Max 40 chars'),
});

export const ClassCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120, 'Max 120 chars'),
  code: z.string().trim().min(1, 'Code is required').max(20, 'Max 20 chars'),
  section_id: z.coerce.number().int().positive('Section id must be > 0'),
  day: z.coerce.number().int().min(1).max(7).nullable().optional(),
  start: z.string().regex(timeRe, 'Start must be HH:MM'),
  end: z.string().regex(timeRe, 'End must be HH:MM'),
  units: z.coerce.number().int().min(0).max(12).nullable().optional(),
  room: z.string().trim().max(40).nullable().optional(),
  instructor: z.string().trim().max(80).nullable().optional(),
}).refine(
  (data) => {
    // Allow if either time is missing (will fail regex validation anyway)
    if (!data.start || !data.end) return true
    // Compare times as strings (HH:MM format is lexicographically orderable)
    return data.start < data.end
  },
  {
    message: 'End time must be after start time',
    path: ['end'],
  }
);
export const ClassPatchSchema = ClassCreateSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'Nothing to update' }
);

// helpers
export type ZodIssue = { path: string; message: string };
export function issues(e: unknown): ZodIssue[] {
  if (e instanceof z.ZodError) {
    return e.issues.map(i => ({ path: i.path.join('.') || '', message: i.message }));
  }
  return [{ path: '', message: 'Unexpected error' }];
}

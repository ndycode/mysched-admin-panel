import { z } from 'zod'

const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/

const titleField = z
  .string()
  .trim()
  .min(1, 'Title is required')
  .max(120, 'Max 120 characters')

const codeField = z
  .string()
  .trim()
  .min(1, 'Code is required')
  .max(20, 'Max 20 characters')

const sectionIdField = z.coerce
  .number()
  .int()
  .positive('Section id must be > 0')

const dayField = z
  .union([
    z.coerce.number().int().min(1).max(7),
    z.string().trim().min(1).max(20),
  ])
  .nullable()
  .optional()

const timeField = z.string().regex(timeRe, 'Time must be HH:MM')

const unitsField = z.coerce
  .number()
  .int()
  .min(0)
  .max(12)
  .nullable()
  .optional()

const roomField = z.string().trim().max(40).nullable().optional()

const instructorField = z.string().trim().max(80).nullable().optional()

const instructorIdField = z.string().uuid('Instructor id must be a valid UUID').nullable().optional()

export const ClassCreateSchema = z
  .object({
    title: titleField,
    code: codeField,
    section_id: sectionIdField,
    day: dayField,
    start: timeField,
    end: timeField,
    units: unitsField,
    room: roomField,
    instructor: instructorField,
    instructor_id: instructorIdField,
  })
  .strict()
  .refine(({ start, end }) => start < end, {
    message: 'Start must be before end',
    path: ['end'],
  })

export const ClassPatchSchema = z
  .object({
    title: titleField.optional(),
    code: codeField.optional(),
    section_id: sectionIdField.optional(),
    day: dayField,
    start: timeField.optional(),
    end: timeField.optional(),
    units: unitsField,
    room: roomField,
    instructor: instructorField,
    instructor_id: instructorIdField,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'Nothing to update' })
  .refine((data) => (data.start && data.end ? data.start < data.end : true), {
    message: 'Start must be before end',
    path: ['end'],
  })

export const ClassIdArraySchema = z
  .array(z.coerce.number().int().positive('Class id must be > 0'))
  .min(1, 'At least one class id is required')

// ==============================================================================
// PIXY EDU — ZOD VALIDATION SCHEMAS
// Module: module_school (School Space)
// Path: src/modules/features/school/schemas/school.schema.ts
// ==============================================================================

import { z } from 'zod';

export const PerformanceTierSchema = z.enum(['Superior', 'Alto', 'Básico', 'Bajo']);

export const SchoolAssignmentSchema = z.object({
  id: z.string().uuid().optional(),
  course_id: z.string().uuid({ message: 'Curso es requerido' }),
  period_id: z.string().uuid({ message: 'Período es requerido' }),
  title: z.string().min(3, { message: 'El título debe tener al menos 3 caracteres' }),
  description: z.string().optional().nullable(),
  competency_standard: z.string().optional().nullable(),
  target_week: z.number().int().min(1).max(12).optional().nullable(),
  weight_percentage: z.number().min(1).max(100, { message: 'El porcentaje debe estar entre 1 y 100' }),
  due_date: z.string().min(1, { message: 'Fecha de entrega es requerida' }),
  grading_type: z.enum(['numeric', 'rubric', 'qualitative']).default('numeric'),
  rubric_schema: z.record(z.string(), z.any()).optional().nullable(),
  blocked_by_assignment_id: z.string().uuid().optional().nullable(),
});

export const SchoolGradeInputSchema = z.object({
  assignment_id: z.string().uuid(),
  enrollment_id: z.string().uuid(),
  score: z.number().min(1.0).max(5.0).optional().nullable(),
  performance_tier: PerformanceTierSchema.optional().nullable(),
  qualitative_feedback: z.string().max(1000).optional().nullable(),
  is_excused: z.boolean().default(false),
});

export const BulkGradesInputSchema = z.object({
  assignment_id: z.string().uuid(),
  records: z.array(
    z.object({
      enrollment_id: z.string().uuid(),
      score: z.number().min(1.0).max(5.0).optional().nullable(),
      performance_tier: PerformanceTierSchema.optional().nullable(),
      qualitative_feedback: z.string().max(1000).optional().nullable(),
      is_excused: z.boolean().default(false),
    })
  ),
});

export const AttendanceMarkSchema = z.object({
  enrollment_id: z.string().uuid(),
  course_id: z.string().uuid().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Formato YYYY-MM-DD requerido' }),
  status: z.enum(['present', 'absent', 'late', 'excused']),
  source: z.enum(['teacher_portal', 'qr_gate', 'biometric']).default('teacher_portal'),
  notes: z.string().max(255).optional().nullable(),
});

export const BulkAttendanceSchema = z.object({
  course_id: z.string().uuid().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  marks: z.array(
    z.object({
      enrollment_id: z.string().uuid(),
      status: z.enum(['present', 'absent', 'late', 'excused']),
      notes: z.string().optional().nullable(),
    })
  ),
  notify_absent_via_whatsapp: z.boolean().default(true),
});

export const AwardBadgeSchema = z.object({
  enrollment_id: z.string().uuid(),
  badge_id: z.string().uuid(),
  period_id: z.string().uuid().optional().nullable(),
  justification: z.string().min(5, { message: 'Justificación pedagógica requerida (min 5 caracteres)' }),
});

export const CreateTuitionInvoiceSchema = z.object({
  enrollment_id: z.string().uuid(),
  concept: z.string().min(3),
  period_month: z.string().regex(/^\d{4}-\d{2}$/, { message: 'Formato YYYY-MM requerido' }),
  amount: z.number().positive(),
  late_fee_amount: z.number().nonnegative().default(0),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const GeneratePeriodBulletinSchema = z.object({
  period_id: z.string().uuid(),
  section_id: z.string().uuid().optional(),
  override_tuition_lock: z.boolean().default(false),
});

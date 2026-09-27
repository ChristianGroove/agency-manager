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

// ==============================================================================
// 1. GUARDIANS SCHEMAS
// ==============================================================================

export const SchoolGuardianSchema = z.object({
  id: z.string().uuid().optional(),
  student_id: z.string().uuid({ message: 'Estudiante es requerido' }),
  relationship: z.enum(['mother', 'father', 'legal_guardian', 'grandparent', 'uncle_aunt', 'other']),
  first_name: z.string().min(2, { message: 'Nombres requeridos (mínimo 2 caracteres)' }),
  last_name: z.string().min(2, { message: 'Apellidos requeridos (mínimo 2 caracteres)' }),
  document_type: z.enum(['CC', 'CE', 'TI', 'PP', 'NIT', 'PEP', 'PPT']).default('CC'),
  document_number: z.string().min(3, { message: 'Número de documento requerido' }),
  email: z.string().email({ message: 'Correo inválido' }).optional().nullable().or(z.literal('')),
  phone: z.string().min(7, { message: 'Teléfono de contacto requerido' }),
  whatsapp_enabled: z.boolean().default(true),
  is_primary_contact: z.boolean().default(false),
  is_emergency_contact: z.boolean().default(false),
  is_financial_responsible: z.boolean().default(false),
  occupation: z.string().max(100).optional().nullable(),
  company_name: z.string().max(120).optional().nullable(),
  billing_address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).default('Bogotá D.C.'),
  notes: z.string().max(500).optional().nullable(),
});

// ==============================================================================
// 2. OBSERVER LOG SCHEMAS (Ley 115)
// ==============================================================================

export const SchoolObserverLogSchema = z.object({
  id: z.string().uuid().optional(),
  enrollment_id: z.string().uuid({ message: 'Matrícula del estudiante es requerida' }),
  period_id: z.string().uuid().optional().nullable(),
  log_type: z.enum(['pedagogical', 'positive', 'formative', 'disciplinary', 'academic_alert', 'attendance']),
  title: z.string().min(3, { message: 'Título del registro requerido' }),
  description: z.string().min(10, { message: 'Descripción detallada requerida (mínimo 10 caracteres)' }),
  context_location: z.string().max(100).optional().nullable(),
  student_statement: z.string().max(2000).optional().nullable(), // Descargos
  student_commitment: z.string().max(1000).optional().nullable(),
  guardian_commitment: z.string().max(1000).optional().nullable(),
  institutional_actions: z.string().max(1000).optional().nullable(),
  is_resolved: z.boolean().default(false),
  follow_up_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
  student_signed: z.boolean().optional(),
  guardian_signed: z.boolean().optional(),
});

// ==============================================================================
// 3. CONVIVENCIA SCHEMAS (Ley 1620)
// ==============================================================================

export const InvolvedStudentSchema = z.object({
  enrollment_id: z.string().uuid(),
  student_name: z.string().optional(),
  role: z.enum(['agresor', 'victima', 'testigo', 'involucrado']),
  notes: z.string().max(500).optional(),
});

export const ConvivenciaProtocolStepSchema = z.object({
  step_name: z.string().min(3),
  executed_at: z.string(),
  executed_by_name: z.string().min(2),
  details: z.string().optional(),
});

export const SchoolConvivenciaIncidentSchema = z.object({
  id: z.string().uuid().optional(),
  incident_number: z.string().optional(),
  incident_type: z.enum(['tipo_1', 'tipo_2', 'tipo_3']),
  title: z.string().min(3, { message: 'Título del incidente requerido' }),
  description: z.string().min(15, { message: 'Descripción de los hechos requerida (mínimo 15 caracteres)' }),
  date_occurred: z.string().min(1, { message: 'Fecha y hora del suceso requerida' }),
  location: z.string().max(100).optional().nullable(),
  involved_students: z.array(InvolvedStudentSchema).min(1, { message: 'Debe incluir al menos un estudiante involucrado' }),
  status: z.enum([
    'reported',
    'under_investigation',
    'conciliation_session',
    'committee_review',
    'sanctioned',
    'closed',
    'referred_siuce',
  ]).default('reported'),
  protocol_steps_applied: z.array(ConvivenciaProtocolStepSchema).default([]),
  conciliation_agreements: z.string().max(2000).optional().nullable(),
  committee_minutes: z.string().max(3000).optional().nullable(),
  siuce_report_number: z.string().max(100).optional().nullable(),
  reported_to_external_entities: z.boolean().default(false),
});

// ==============================================================================
// 4. PIAR SCHEMAS (Decreto 1421)
// ==============================================================================

export const DiagnosedBarrierSchema = z.object({
  barrier_type: z.enum(['comunicativa', 'actitudinal', 'pedagogica', 'metodologica', 'fisica_espacial']),
  description: z.string().min(3),
});

export const CurricularAdaptationSchema = z.object({
  course_id: z.string().uuid().optional(),
  subject_name: z.string().min(2),
  learning_objectives_adapted: z.string().min(5),
  methodology_adjustments: z.string().min(5),
  evaluation_adjustments: z.string().min(5),
  reasonable_accommodations: z.array(z.string()).default([]),
});

export const PedagogicalGoalSchema = z.object({
  period_number: z.number().int().min(1).max(6),
  goal: z.string().min(5),
  status: z.enum(['pending', 'in_progress', 'achieved']).default('pending'),
  evidence: z.string().optional(),
});

export const SchoolPiarPlanSchema = z.object({
  id: z.string().uuid().optional(),
  enrollment_id: z.string().uuid({ message: 'Matrícula del estudiante es requerida' }),
  academic_year_id: z.string().uuid({ message: 'Año lectivo es requerido' }),
  medical_diagnosis: z.string().max(500).optional().nullable(),
  diagnosed_barriers: z.array(DiagnosedBarrierSchema).default([]),
  individual_strengths: z.string().max(1000).optional().nullable(),
  curricular_adaptations: z.array(CurricularAdaptationSchema).default([]),
  pedagogical_goals: z.array(PedagogicalGoalSchema).default([]),
  family_commitments: z.string().max(1500).optional().nullable(),
  school_commitments: z.string().max(1500).optional().nullable(),
  review_period: z.string().default('trimestral'),
  status: z.enum(['draft', 'active', 'reviewed', 'archived']).default('draft'),
});

// ==============================================================================
// 5. SCHEDULE SCHEMAS
// ==============================================================================

export const SchoolScheduleSchema = z.object({
  id: z.string().uuid().optional(),
  course_id: z.string().uuid({ message: 'Curso es requerido' }),
  day_of_week: z.number().int().min(1).max(7),
  block_start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'Formato HH:mm o HH:mm:ss requerido' }),
  block_end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'Formato HH:mm o HH:mm:ss requerido' }),
  block_number: z.number().int().min(1).max(15).optional().nullable(),
  classroom_location: z.string().max(100).optional().nullable(),
  recurrence: z.enum(['weekly', 'biweekly', 'custom']).default('weekly'),
  is_active: z.boolean().default(true),
});


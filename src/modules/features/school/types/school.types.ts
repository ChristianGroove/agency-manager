// ==============================================================================
// PIXY EDU — SCHOOL OPERATING SYSTEM (AOS) DOMAIN TYPES
// Module: module_school (School Space)
// Path: src/modules/features/school/types/school.types.ts
// ==============================================================================

export interface ActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export type SchoolLevel = 'preschool' | 'primary' | 'secondary' | 'high_school';

export type ColombianPerformanceTier = 'Superior' | 'Alto' | 'Básico' | 'Bajo';

export interface GradingScaleTier {
  label: ColombianPerformanceTier;
  min: number;
  max: number;
  color: string;
}

export interface SchoolGradingScaleConfig {
  min: number;
  max: number;
  passing: number;
  tiers: GradingScaleTier[];
}

export interface SchoolAcademicYear {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'closed';
  grading_scale: SchoolGradingScaleConfig;
  created_at?: string;
  updated_at?: string;
}

export interface SchoolPeriod {
  id: string;
  organization_id: string;
  academic_year_id: string;
  name: string;
  period_number: number;
  weight_percentage: number;
  start_date: string;
  end_date: string;
  is_grading_open: boolean;
  is_closed: boolean;
  created_at?: string;
}

export interface SchoolGrade {
  id: string;
  organization_id: string;
  name: string;
  short_name: string;
  level: SchoolLevel;
  order_index: number;
  created_at?: string;
}

export interface SchoolSection {
  id: string;
  organization_id: string;
  grade_id: string;
  name: string;
  homeroom_teacher_id?: string | null;
  classroom_location?: string | null;
  max_capacity: number;
  grade?: SchoolGrade;
  homeroom_teacher?: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url?: string | null;
    email?: string | null;
  } | null;
  created_at?: string;
}

export interface SchoolAcademicArea {
  id: string;
  organization_id: string;
  name: string;
  short_code: string;
  order_index: number;
  created_at?: string;
}

export interface SchoolCourse {
  id: string;
  organization_id: string;
  section_id: string;
  area_id: string;
  subject_name: string;
  lead_teacher_id: string;
  co_teachers?: string[];
  weekly_hours: number;
  area_weight_percentage: number;
  color?: string;
  icon?: string;
  section?: SchoolSection;
  area?: SchoolAcademicArea;
  lead_teacher?: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url?: string | null;
    email?: string | null;
  };
  created_at?: string;
}

export interface SchoolEnrollment {
  id: string;
  organization_id: string;
  student_id: string;
  academic_year_id: string;
  section_id: string;
  student_code: string;
  status: 'active' | 'withdrawn' | 'suspended' | 'graduated';
  qr_access_token: string;
  student?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
    metadata?: Record<string, any>;
  };
  section?: SchoolSection;
  created_at?: string;
}

export type GradingType = 'numeric' | 'rubric' | 'qualitative';

export interface SchoolAssignment {
  id: string;
  organization_id: string;
  course_id: string;
  period_id: string;
  title: string;
  description?: string | null;
  competency_standard?: string | null;
  target_week?: number | null;
  weight_percentage: number;
  due_date: string;
  grading_type: GradingType;
  rubric_schema?: Record<string, any> | null;
  blocked_by_assignment_id?: string | null;
  created_by_teacher_id: string;
  created_at?: string;
}

export interface SchoolGradeRecord {
  id: string;
  organization_id: string;
  assignment_id: string;
  enrollment_id: string;
  score?: number | null;
  performance_tier?: ColombianPerformanceTier | null;
  qualitative_feedback?: string | null;
  is_excused?: boolean;
  graded_by_teacher_id: string;
  graded_at?: string;
  updated_at?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface SchoolAttendanceLog {
  id: string;
  organization_id: string;
  enrollment_id: string;
  course_id?: string | null;
  date: string;
  status: AttendanceStatus;
  recorded_by_staff_id?: string | null;
  check_in_time?: string;
  source: 'teacher_portal' | 'qr_gate' | 'biometric';
  guardian_notified_at?: string | null;
  notes?: string | null;
  created_at?: string;
}

export type BadgeCategory = 'academic' | 'habits' | 'leadership' | 'civic';
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'legendary';

export interface SchoolBadge {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  tier: BadgeTier;
  icon_svg?: string | null;
  beam_color: string;
  is_active: boolean;
  created_at?: string;
}

export interface SchoolAwardedBadge {
  id: string;
  organization_id: string;
  enrollment_id: string;
  badge_id: string;
  period_id?: string | null;
  awarded_by_teacher_id: string;
  justification: string;
  awarded_at?: string;
  badge?: SchoolBadge;
}

export type TuitionStatus = 'pending' | 'paid' | 'late' | 'canceled';

export interface SchoolTuitionInvoice {
  id: string;
  organization_id: string;
  enrollment_id: string;
  concept: string;
  period_month: string;
  amount: number;
  late_fee_amount: number;
  due_date: string;
  status: TuitionStatus;
  wompi_checkout_url?: string | null;
  wompi_transaction_id?: string | null;
  paid_at?: string | null;
  whatsapp_sent_at?: string | null;
  whatsapp_status?: string | null;
  created_at?: string;
}

export interface SchoolPeriodBulletin {
  id: string;
  organization_id: string;
  enrollment_id: string;
  period_id: string;
  overall_average: number;
  cohort_ranking?: number | null;
  general_performance_tier: ColombianPerformanceTier;
  radar_competency_data: Record<string, number>;
  total_absences: number;
  homeroom_teacher_comment?: string | null;
  is_cleared_for_download: boolean;
  pdf_storage_path?: string | null;
  verification_sha256: string;
  sent_whatsapp_at?: string | null;
  created_at?: string;
}

// ==============================================================================
// COMPUTED / AGGREGATE TYPES
// ==============================================================================

export interface SubjectFinalEvaluation {
  courseId: string;
  subjectName: string;
  areaId: string;
  areaName: string;
  weeklyHours: number;
  numericScore: number;
  performanceTier: ColombianPerformanceTier;
  absencesCount: number;
  absenceRatePercentage: number;
  isFailingByAbsence: boolean;
  teacherName: string;
}

export interface AreaFinalEvaluation {
  areaId: string;
  areaName: string;
  areaAverageScore: number;
  areaPerformanceTier: ColombianPerformanceTier;
  subjects: SubjectFinalEvaluation[];
}

export interface StudentAcademicSummary {
  enrollmentId: string;
  studentCode: string;
  studentName: string;
  overallAverage: number;
  generalTier: ColombianPerformanceTier;
  cohortPosition?: number;
  totalStudentsInCohort?: number;
  totalAbsences: number;
  areas: AreaFinalEvaluation[];
  awardedBadges: SchoolAwardedBadge[];
  hasTuitionDebt: boolean;
  clearedForBulletin: boolean;
}

// ==============================================================================
// 1. GUARDIANS (Multi-acudiente: Ley 115 / DIAN)
// ==============================================================================

export type GuardianRelationship = 'mother' | 'father' | 'legal_guardian' | 'grandparent' | 'uncle_aunt' | 'other';
export type GuardianDocumentType = 'CC' | 'CE' | 'TI' | 'PP' | 'NIT' | 'PEP' | 'PPT';

export interface SchoolGuardian {
  id: string;
  organization_id: string;
  student_id: string;
  relationship: GuardianRelationship;
  first_name: string;
  last_name: string;
  document_type: GuardianDocumentType;
  document_number: string;
  email?: string | null;
  phone: string;
  whatsapp_enabled?: boolean;
  is_primary_contact: boolean;
  is_emergency_contact: boolean;
  is_financial_responsible: boolean;
  occupation?: string | null;
  company_name?: string | null;
  billing_address?: string | null;
  city?: string | null;
  notes?: string | null;
  student?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
  };
  created_at?: string;
  updated_at?: string;
}

// ==============================================================================
// 2. OBSERVER LOGS (Observador del Estudiante - Ley 115)
// ==============================================================================

export type ObserverLogType = 'pedagogical' | 'positive' | 'formative' | 'disciplinary' | 'academic_alert' | 'attendance';

export interface SchoolObserverLog {
  id: string;
  organization_id: string;
  enrollment_id: string;
  period_id?: string | null;
  logged_by_staff_id: string;
  log_type: ObserverLogType;
  title: string;
  description: string;
  context_location?: string | null;
  student_statement?: string | null;
  student_commitment?: string | null;
  guardian_commitment?: string | null;
  institutional_actions?: string | null;
  is_resolved: boolean;
  follow_up_date?: string | null;
  student_signed_at?: string | null;
  guardian_signed_at?: string | null;
  staff_signed_at: string;
  attachments?: Array<{ name: string; url: string; type?: string }>;
  enrollment?: SchoolEnrollment;
  logged_by_staff?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
  };
  period?: SchoolPeriod;
  created_at?: string;
  updated_at?: string;
}

// ==============================================================================
// 3. CONVIVENCIA ESCOLAR (Comité de Convivencia - Ley 1620 de 2013)
// ==============================================================================

export type ConvivenciaIncidentType = 'tipo_1' | 'tipo_2' | 'tipo_3';
export type ConvivenciaIncidentStatus =
  | 'reported'
  | 'under_investigation'
  | 'conciliation_session'
  | 'committee_review'
  | 'sanctioned'
  | 'closed'
  | 'referred_siuce';

export interface InvolvedStudent {
  enrollment_id: string;
  student_name?: string;
  role: 'agresor' | 'victima' | 'testigo' | 'involucrado';
  notes?: string;
}

export interface ConvivenciaProtocolStep {
  step_name: string;
  executed_at: string;
  executed_by_name: string;
  details?: string;
}

export interface SchoolConvivenciaIncident {
  id: string;
  organization_id: string;
  incident_number: string;
  incident_type: ConvivenciaIncidentType;
  title: string;
  description: string;
  date_occurred: string;
  location?: string | null;
  involved_students: InvolvedStudent[];
  reporter_staff_id: string;
  status: ConvivenciaIncidentStatus;
  protocol_steps_applied: ConvivenciaProtocolStep[];
  conciliation_agreements?: string | null;
  committee_minutes?: string | null;
  siuce_report_number?: string | null;
  reported_to_external_entities: boolean;
  closed_at?: string | null;
  closed_by_staff_id?: string | null;
  reporter_staff?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  created_at?: string;
  updated_at?: string;
}

// ==============================================================================
// 4. PIAR (Plan Individual de Ajustes Razonables - Decreto 1421 de 2017)
// ==============================================================================

export type PiarStatus = 'draft' | 'active' | 'reviewed' | 'archived';

export interface DiagnosedBarrier {
  barrier_type: 'comunicativa' | 'actitudinal' | 'pedagogica' | 'metodologica' | 'fisica_espacial';
  description: string;
}

export interface CurricularAdaptation {
  course_id?: string;
  subject_name: string;
  learning_objectives_adapted: string;
  methodology_adjustments: string;
  evaluation_adjustments: string;
  reasonable_accommodations: string[];
}

export interface PedagogicalGoal {
  period_number: number;
  goal: string;
  status: 'pending' | 'in_progress' | 'achieved';
  evidence?: string;
}

export interface SchoolPiarPlan {
  id: string;
  organization_id: string;
  enrollment_id: string;
  academic_year_id: string;
  medical_diagnosis?: string | null;
  diagnosed_barriers: DiagnosedBarrier[];
  individual_strengths?: string | null;
  curricular_adaptations: CurricularAdaptation[];
  pedagogical_goals: PedagogicalGoal[];
  family_commitments?: string | null;
  school_commitments?: string | null;
  review_period: string;
  status: PiarStatus;
  created_by_staff_id: string;
  approved_by_staff_id?: string | null;
  last_reviewed_at?: string | null;
  enrollment?: SchoolEnrollment;
  academic_year?: SchoolAcademicYear;
  created_by_staff?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  created_at?: string;
  updated_at?: string;
}

// ==============================================================================
// 5. SCHEDULES (Horarios Semanales por Bloques)
// ==============================================================================

export interface SchoolSchedule {
  id: string;
  organization_id: string;
  course_id: string;
  day_of_week: number; // 1 = Lunes ... 7 = Domingo
  block_start_time: string; // HH:mm:ss or HH:mm
  block_end_time: string;
  block_number?: number | null;
  classroom_location?: string | null;
  recurrence: 'weekly' | 'biweekly' | 'custom';
  is_active: boolean;
  course?: SchoolCourse;
  created_at?: string;
  updated_at?: string;
}


// ==============================================================================
// PIXY EDU — SCHOOL OPERATING SYSTEM (AOS) DOMAIN TYPES
// Module: module_school (School Space)
// Path: src/modules/features/school/types/school.types.ts
// ==============================================================================

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

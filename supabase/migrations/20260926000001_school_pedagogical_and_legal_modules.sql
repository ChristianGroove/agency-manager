-- ==============================================================================
-- MIGRATION: 20260926000001_school_pedagogical_and_legal_modules.sql
-- PURPOSE: Pending Pedagogical, Convivencia (Ley 1620), Observer (Ley 115),
--          PIAR Inclusion (Decreto 1421), Multi-Guardians & Weekly Schedules.
-- IDEMPOTENT: Safe to run multiple times
-- ==============================================================================

-- 1. SCHOOL GUARDIANS (Multi-acudiente: madre, padre, acudiente legal, responsable financiero DIAN)
CREATE TABLE IF NOT EXISTS public.school_guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL CHECK (relationship IN ('mother', 'father', 'legal_guardian', 'grandparent', 'uncle_aunt', 'other')),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    document_type TEXT NOT NULL DEFAULT 'CC' CHECK (document_type IN ('CC', 'CE', 'TI', 'PP', 'NIT', 'PEP', 'PPT')),
    document_number TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    whatsapp_enabled BOOLEAN DEFAULT true,
    is_primary_contact BOOLEAN DEFAULT false,
    is_emergency_contact BOOLEAN DEFAULT false,
    is_financial_responsible BOOLEAN DEFAULT false,
    occupation TEXT,
    company_name TEXT,
    billing_address TEXT,
    city TEXT DEFAULT 'Bogotá D.C.',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. SCHOOL STUDENT OBSERVER LOGS (Observador del alumno - Ley 115)
CREATE TABLE IF NOT EXISTS public.school_student_observer_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.school_enrollments(id) ON DELETE CASCADE,
    period_id UUID REFERENCES public.school_periods(id) ON DELETE SET NULL,
    logged_by_staff_id UUID NOT NULL REFERENCES public.organization_staff(id) ON DELETE RESTRICT,
    log_type TEXT NOT NULL CHECK (log_type IN ('pedagogical', 'positive', 'formative', 'disciplinary', 'academic_alert', 'attendance')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    context_location TEXT,
    student_statement TEXT,
    student_commitment TEXT,
    guardian_commitment TEXT,
    institutional_actions TEXT,
    is_resolved BOOLEAN DEFAULT false,
    follow_up_date DATE,
    student_signed_at TIMESTAMPTZ,
    guardian_signed_at TIMESTAMPTZ,
    staff_signed_at TIMESTAMPTZ DEFAULT now(),
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. SCHOOL CONVIVENCIA INCIDENTS (Comité de Convivencia Escolar - Ley 1620 de 2013)
CREATE TABLE IF NOT EXISTS public.school_convivencia_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    incident_number TEXT NOT NULL,
    incident_type TEXT NOT NULL CHECK (incident_type IN ('tipo_1', 'tipo_2', 'tipo_3')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date_occurred TIMESTAMPTZ NOT NULL,
    location TEXT,
    involved_students JSONB NOT NULL DEFAULT '[]'::jsonb,
    reporter_staff_id UUID NOT NULL REFERENCES public.organization_staff(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'under_investigation', 'conciliation_session', 'committee_review', 'sanctioned', 'closed', 'referred_siuce')),
    protocol_steps_applied JSONB NOT NULL DEFAULT '[]'::jsonb,
    conciliation_agreements TEXT,
    committee_minutes TEXT,
    siuce_report_number TEXT,
    reported_to_external_entities BOOLEAN DEFAULT false,
    closed_at TIMESTAMPTZ,
    closed_by_staff_id UUID REFERENCES public.organization_staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. SCHOOL PIAR PLANS (Plan Individual de Ajustes Razonables - Decreto 1421 de 2017)
CREATE TABLE IF NOT EXISTS public.school_piar_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.school_enrollments(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.school_academic_years(id) ON DELETE CASCADE,
    medical_diagnosis TEXT,
    diagnosed_barriers JSONB NOT NULL DEFAULT '[]'::jsonb,
    individual_strengths TEXT,
    curricular_adaptations JSONB NOT NULL DEFAULT '[]'::jsonb,
    pedagogical_goals JSONB NOT NULL DEFAULT '[]'::jsonb,
    family_commitments TEXT,
    school_commitments TEXT,
    review_period TEXT DEFAULT 'trimestral',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'reviewed', 'archived')),
    created_by_staff_id UUID NOT NULL REFERENCES public.organization_staff(id) ON DELETE RESTRICT,
    approved_by_staff_id UUID REFERENCES public.organization_staff(id) ON DELETE SET NULL,
    last_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(enrollment_id, academic_year_id)
);

-- 5. SCHOOL SCHEDULES (Grilla de horarios semanales por bloques lunes-viernes)
CREATE TABLE IF NOT EXISTS public.school_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.school_courses(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    block_start_time TIME NOT NULL,
    block_end_time TIME NOT NULL,
    block_number INTEGER,
    classroom_location TEXT,
    recurrence TEXT NOT NULL DEFAULT 'weekly' CHECK (recurrence IN ('weekly', 'biweekly', 'custom')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- INDEXES FOR QUERY OPTIMIZATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_school_guardians_student ON public.school_guardians(organization_id, student_id);
CREATE INDEX IF NOT EXISTS idx_school_guardians_financial ON public.school_guardians(organization_id, is_financial_responsible);
CREATE INDEX IF NOT EXISTS idx_school_observer_enrollment ON public.school_student_observer_logs(organization_id, enrollment_id, log_type);
CREATE INDEX IF NOT EXISTS idx_school_convivencia_org ON public.school_convivencia_incidents(organization_id, incident_type, status);
CREATE INDEX IF NOT EXISTS idx_school_piar_enrollment ON public.school_piar_plans(organization_id, enrollment_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_school_schedules_course ON public.school_schedules(course_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_school_schedules_org ON public.school_schedules(organization_id, day_of_week);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.school_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_student_observer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_convivencia_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_piar_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_schedules ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'school_guardians',
        'school_student_observer_logs',
        'school_convivencia_incidents',
        'school_piar_plans',
        'school_schedules'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation policy for %I" ON public.%I', tbl, tbl);
        EXECUTE format('
            CREATE POLICY "Tenant isolation policy for %I" ON public.%I
            FOR ALL TO authenticated
            USING (
                organization_id IN (
                    SELECT om.organization_id 
                    FROM public.organization_members om 
                    WHERE om.user_id = auth.uid()
                )
            )
            WITH CHECK (
                organization_id IN (
                    SELECT om.organization_id 
                    FROM public.organization_members om 
                    WHERE om.user_id = auth.uid()
                )
            )', tbl, tbl);
    END LOOP;
END $$;

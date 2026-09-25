-- ==============================================================================
-- MIGRATION: 20260925000001_create_school_space_schema.sql
-- PURPOSE: Provision School Space (Pixy Edu - Academic Operating System)
-- IDEMPOTENT: Safe to run multiple times
-- ==============================================================================

-- 1. Insert or update the SaaS App for School Space
INSERT INTO public.saas_apps (
    id,
    name,
    slug,
    description,
    long_description,
    category,
    vertical_compatibility,
    icon,
    color,
    price_monthly,
    trial_days,
    is_active,
    is_featured,
    sort_order,
    space_category,
    ui_config
) VALUES (
    'app_school_pro',
    'Pixy Edu - School Operating System',
    'school',
    'Sistema integral de gestión académica, boletines ejecutivos, carnets QR y cobranza para colegios y academias',
    'Plataforma académica integral para colegios privados y sector público: Sprints curriculares, portal docente táctico, control de asistencia Zero-Trust con QR, insignias de alto rendimiento, boletines oficiales Decreto 1290 en PDF marca blanca y cobranza mensual por WhatsApp y Wompi.',
    'school',
    ARRAY['school', 'education', 'academy'],
    'GraduationCap',
    '#2563eb',
    120.00,
    14,
    true,
    true,
    8,
    'school',
    '{
        "terminology": {
            "client": "Estudiante",
            "clients": "Estudiantes",
            "project": "Asignatura / Área",
            "sale": "Pensión / Matrícula",
            "action_new": "Matricular Estudiante",
            "task": "Competencia / Actividad",
            "tasks": "Logros y Calificaciones"
        },
        "capabilities": [
            "crm.core",
            "crm.advanced",
            "messaging.standard",
            "messaging.bulk",
            "billing.management",
            "automation.engine",
            "whitelabel.branding",
            "whitelabel.domain_custom",
            "school.core",
            "school.curriculum_matrix",
            "school.teacher_portal",
            "school.zero_trust_attendance",
            "school.neuro_badges",
            "school.executive_reports",
            "school.early_warning_radar",
            "school.student_parent_portal",
            "school.tuition_billing"
        ],
        "policies": {
            "visibleTabs": ["info", "activity", "academics", "attendance", "grades", "bulletins", "billing"],
            "showBilling": true,
            "showHosting": false,
            "showServices": true,
            "showOrders": false,
            "allowedChannels": ["whatsapp", "email", "sms"],
            "defaultDashboard": "school"
        }
    }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    long_description = EXCLUDED.long_description,
    category = EXCLUDED.category,
    vertical_compatibility = EXCLUDED.vertical_compatibility,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    price_monthly = EXCLUDED.price_monthly,
    trial_days = EXCLUDED.trial_days,
    is_active = EXCLUDED.is_active,
    is_featured = EXCLUDED.is_featured,
    sort_order = EXCLUDED.sort_order,
    space_category = EXCLUDED.space_category,
    ui_config = EXCLUDED.ui_config,
    updated_at = NOW();

-- 2. Link modules to School Space app
INSERT INTO public.saas_app_modules (
    app_id,
    module_key,
    auto_enable,
    is_core,
    is_optional,
    sort_order
) VALUES
    ('app_school_pro', 'core_crm', true, true, false, 1),
    ('app_school_pro', 'core_clients', true, true, false, 2),
    ('app_school_pro', 'module_messaging', true, false, false, 3),
    ('app_school_pro', 'module_billing', true, false, false, 4),
    ('app_school_pro', 'module_automation', true, false, false, 5),
    ('app_school_pro', 'module_attendance', true, false, false, 6),
    ('app_school_pro', 'module_school', true, true, false, 7)
ON CONFLICT (app_id, module_key) DO NOTHING;

-- 3. Register Welcome Banner for School Space in global_dashboard_banners
INSERT INTO public.global_dashboard_banners (
    title, 
    description, 
    space_type, 
    is_active, 
    cta_text, 
    cta_url
) VALUES (
    'Bienvenido a Pixy Edu',
    '["Has activado el Sistema Operativo Académico (AOS) para colegios y academias.", "Gestiona calificaciones Decreto 1290, toma asistencia con QR y despacha boletines por WhatsApp."]',
    'school',
    true,
    'Ir al Campus',
    '/school'
) ON CONFLICT (space_type) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    cta_text = EXCLUDED.cta_text,
    cta_url = EXCLUDED.cta_url;

-- 3. Academic Years (Años Lectivos)
CREATE TABLE IF NOT EXISTS public.school_academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'closed')),
    grading_scale JSONB NOT NULL DEFAULT '{
        "min": 1.0,
        "max": 5.0,
        "passing": 3.0,
        "tiers": [
            {"label": "Superior", "min": 4.6, "max": 5.0, "color": "#10b981"},
            {"label": "Alto", "min": 4.0, "max": 4.5, "color": "#3b82f6"},
            {"label": "Básico", "min": 3.0, "max": 3.9, "color": "#f59e0b"},
            {"label": "Bajo", "min": 1.0, "max": 2.9, "color": "#ef4444"}
        ]
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Academic Periods (Períodos Escolares)
CREATE TABLE IF NOT EXISTS public.school_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.school_academic_years(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    period_number INTEGER NOT NULL CHECK (period_number BETWEEN 1 AND 6),
    weight_percentage NUMERIC(5,2) NOT NULL DEFAULT 25.00,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_grading_open BOOLEAN NOT NULL DEFAULT true,
    is_closed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Grades & Sections (Grados y Grupos)
CREATE TABLE IF NOT EXISTS public.school_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('preschool', 'primary', 'secondary', 'high_school')),
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    grade_id UUID NOT NULL REFERENCES public.school_grades(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    homeroom_teacher_id UUID REFERENCES public.organization_staff(id) ON DELETE SET NULL,
    classroom_location TEXT,
    max_capacity INTEGER DEFAULT 35,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Academic Areas & Courses (Áreas y Asignaturas)
CREATE TABLE IF NOT EXISTS public.school_academic_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    short_code TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES public.school_sections(id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES public.school_academic_areas(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    lead_teacher_id UUID NOT NULL REFERENCES public.organization_staff(id) ON DELETE RESTRICT,
    co_teachers UUID[] DEFAULT '{}',
    weekly_hours INTEGER NOT NULL DEFAULT 4,
    area_weight_percentage NUMERIC(5,2) DEFAULT 100.00,
    color TEXT DEFAULT '#2563eb',
    icon TEXT DEFAULT 'BookOpen',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Student Enrollments (Matrículas con Tokens QR de Carnet)
CREATE TABLE IF NOT EXISTS public.school_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.school_academic_years(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES public.school_sections(id) ON DELETE CASCADE,
    student_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'suspended', 'graduated')),
    qr_access_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, academic_year_id, student_id)
);

-- 8. Curricular Assignments & Sprints (Actividades, Evaluaciones y Logros)
CREATE TABLE IF NOT EXISTS public.school_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.school_courses(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.school_periods(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    competency_standard TEXT,
    target_week INTEGER CHECK (target_week BETWEEN 1 AND 12),
    weight_percentage NUMERIC(5,2) NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    grading_type TEXT NOT NULL DEFAULT 'numeric' CHECK (grading_type IN ('numeric', 'rubric', 'qualitative')),
    rubric_schema JSONB,
    blocked_by_assignment_id UUID REFERENCES public.school_assignments(id) ON DELETE SET NULL,
    created_by_teacher_id UUID NOT NULL REFERENCES public.organization_staff(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Grade Records (Calificaciones Atómicas con Decreto 1290)
CREATE TABLE IF NOT EXISTS public.school_grades_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES public.school_assignments(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.school_enrollments(id) ON DELETE CASCADE,
    score NUMERIC(4,2),
    performance_tier TEXT CHECK (performance_tier IN ('Superior', 'Alto', 'Básico', 'Bajo')),
    qualitative_feedback TEXT,
    is_excused BOOLEAN DEFAULT false,
    graded_by_teacher_id UUID NOT NULL REFERENCES public.organization_staff(id) ON DELETE RESTRICT,
    graded_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(assignment_id, enrollment_id)
);

-- 10. Attendance Logs (Asistencia Zero-Trust y Notificación Instantánea)
CREATE TABLE IF NOT EXISTS public.school_attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.school_enrollments(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.school_courses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    recorded_by_staff_id UUID REFERENCES public.organization_staff(id) ON DELETE SET NULL,
    check_in_time TIMESTAMPTZ DEFAULT now(),
    source TEXT NOT NULL DEFAULT 'teacher_portal' CHECK (source IN ('teacher_portal', 'qr_gate', 'biometric')),
    guardian_notified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(enrollment_id, course_id, date)
);

-- 11. Badges & Gamification Catalog & Awards (Insignias de Rendimiento)
CREATE TABLE IF NOT EXISTS public.school_badges_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('academic', 'habits', 'leadership', 'civic')),
    tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond', 'legendary')),
    icon_svg TEXT,
    beam_color TEXT DEFAULT '#38bdf8',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_awarded_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.school_enrollments(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES public.school_badges_catalog(id) ON DELETE CASCADE,
    period_id UUID REFERENCES public.school_periods(id) ON DELETE SET NULL,
    awarded_by_teacher_id UUID NOT NULL REFERENCES public.organization_staff(id) ON DELETE RESTRICT,
    justification TEXT NOT NULL,
    awarded_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Tuition Invoices & Wompi Checkout (Cobranza Escolar por WhatsApp)
CREATE TABLE IF NOT EXISTS public.school_tuition_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.school_enrollments(id) ON DELETE CASCADE,
    concept TEXT NOT NULL,
    period_month TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    late_fee_amount NUMERIC(12,2) DEFAULT 0,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late', 'canceled')),
    wompi_checkout_url TEXT,
    wompi_transaction_id TEXT,
    paid_at TIMESTAMPTZ,
    whatsapp_sent_at TIMESTAMPTZ,
    whatsapp_status TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Consolidated Period Bulletins (Boletines Ejecutivos Oficiales)
CREATE TABLE IF NOT EXISTS public.school_period_bulletins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.school_enrollments(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.school_periods(id) ON DELETE CASCADE,
    overall_average NUMERIC(4,2) NOT NULL,
    cohort_ranking INTEGER,
    general_performance_tier TEXT NOT NULL,
    radar_competency_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_absences INTEGER DEFAULT 0,
    homeroom_teacher_comment TEXT,
    is_cleared_for_download BOOLEAN DEFAULT false,
    pdf_storage_path TEXT,
    verification_sha256 TEXT NOT NULL,
    sent_whatsapp_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(enrollment_id, period_id)
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_school_years_org ON public.school_academic_years(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_school_periods_year ON public.school_periods(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_school_courses_sec ON public.school_courses(section_id, lead_teacher_id);
CREATE INDEX IF NOT EXISTS idx_school_enrollments_student ON public.school_enrollments(organization_id, student_id);
CREATE INDEX IF NOT EXISTS idx_school_enrollments_qr ON public.school_enrollments(qr_access_token);
CREATE INDEX IF NOT EXISTS idx_school_assignments_course ON public.school_assignments(course_id, period_id);
CREATE INDEX IF NOT EXISTS idx_school_grades_assignment ON public.school_grades_records(assignment_id, enrollment_id);
CREATE INDEX IF NOT EXISTS idx_school_attendance_date ON public.school_attendance_logs(course_id, date, status);
CREATE INDEX IF NOT EXISTS idx_school_tuition_month ON public.school_tuition_invoices(organization_id, period_month, status);
CREATE INDEX IF NOT EXISTS idx_school_bulletins_student ON public.school_period_bulletins(enrollment_id, period_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.school_academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_academic_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_grades_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_badges_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_awarded_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_tuition_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_period_bulletins ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'school_academic_years',
        'school_periods',
        'school_grades',
        'school_sections',
        'school_academic_areas',
        'school_courses',
        'school_enrollments',
        'school_assignments',
        'school_grades_records',
        'school_attendance_logs',
        'school_badges_catalog',
        'school_awarded_badges',
        'school_tuition_invoices',
        'school_period_bulletins'
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

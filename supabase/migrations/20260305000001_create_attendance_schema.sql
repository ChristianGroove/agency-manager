-- Migración: Módulo de Asistencia (Attendance) y Staff General
-- Fecha: 2026-03-05
-- Descripción: Tablas para gestión de personal, registro de asistencia anti-fraude y turnos.

-- 1. Tabla de Staff General (Agnostic to Space)
CREATE TABLE IF NOT EXISTS public.organization_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.organization_locations(id) ON DELETE SET NULL, -- Sede principal asignada
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Si tiene acceso de admin/manager
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    document_id TEXT, -- Cédula/DNI
    phone TEXT,
    email TEXT,
    role TEXT DEFAULT 'staff', -- 'manager', 'associate', 'staff'
    pin_code TEXT, -- Hash del PIN opcional para validación doble
    access_token UUID UNIQUE DEFAULT uuid_generate_v4(), -- Token para portal móvil sin auth
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Registro de Asistencia (Logs)
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.organization_staff(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.organization_locations(id) ON DELETE SET NULL,
    -- Source of Truth: La base de datos es el único reloj válido.
    timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL, 
    type TEXT NOT NULL CHECK (type IN ('check_in', 'check_out', 'break_start', 'break_end')),
    photo_url TEXT NOT NULL, -- Obligatorio para evidencia
    device_lat DECIMAL(10, 8),
    device_lng DECIMAL(11, 8),
    accuracy_meters FLOAT,
    distance_to_location INTEGER, -- Distancia calculada al momento de la marca
    is_valid BOOLEAN DEFAULT TRUE, -- Falso si algo falló (GPS apagado, Spoofing, etc)
    fraud_flags TEXT[] DEFAULT '{}', -- Ej: ['out_of_geofence', 'low_accuracy', 'vpn_detected']
    device_metadata JSONB DEFAULT '{}'::jsonb, -- UserAgent, Plataforma, IP
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Consolidado de Turnos Diarios (Shifts)
CREATE TABLE IF NOT EXISTS public.attendance_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.organization_staff(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.organization_locations(id) ON DELETE SET NULL,
    date DATE NOT NULL, -- Fecha local de la sede (ej 2026-03-05)
    first_in TIMESTAMPTZ,
    last_out TIMESTAMPTZ,
    total_break_minutes INTEGER DEFAULT 0,
    total_worked_minutes INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open', -- 'open', 'completed', 'anomaly'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(staff_id, date) -- Un solo turno maestro por empleado por día
);

-- Índices de Optimización
CREATE INDEX idx_org_staff_org_id ON public.organization_staff(organization_id);
CREATE INDEX idx_org_staff_access_token ON public.organization_staff(access_token);
CREATE INDEX idx_attendance_logs_staff ON public.attendance_logs(staff_id);
CREATE INDEX idx_attendance_logs_org_date ON public.attendance_logs(organization_id, timestamp);
CREATE INDEX idx_attendance_shifts_staff_date ON public.attendance_shifts(staff_id, date);

-- Triggers de actualización
CREATE TRIGGER set_org_staff_updated_at
BEFORE UPDATE ON public.organization_staff
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER set_attendance_shifts_updated_at
BEFORE UPDATE ON public.attendance_shifts
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Fórmulas GIS Opcionales (Si habilitas PostGIS en el futuro, pero lo haremos via math en app/db por simplicidad cruzada)

-- Políticas RLS (Security)
ALTER TABLE public.organization_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_shifts ENABLE ROW LEVEL SECURITY;

-- STAFF: Managers pueden ver staff
CREATE POLICY "Managers can manage staff" ON public.organization_staff
    FOR ALL TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- LOGS: El portal (anon o role genérico) inserta logs evadiendo RLS si usamos service_role (Action), pero si lo hacemos nativo permitimos insertar
CREATE POLICY "Anyone can insert logs via security definer" ON public.attendance_logs
    FOR INSERT TO authenticated, anon
    WITH CHECK (true); -- La validación real se hará en la Server Action

CREATE POLICY "Managers can view logs" ON public.attendance_logs
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- SHIFTS: View only por managers
CREATE POLICY "Managers can view shifts" ON public.attendance_shifts
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

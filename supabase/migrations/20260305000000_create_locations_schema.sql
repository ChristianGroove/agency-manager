-- Migración: Módulo de Sedes (Locations)
-- Fecha: 2026-03-05
-- Descripción: Tabla principal para gestionar sucursales físicas con geocercas y horarios.

CREATE TABLE IF NOT EXISTS public.organization_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    timezone TEXT DEFAULT 'America/Bogota',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geofence_radius_meters INTEGER DEFAULT 100,
    manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    business_hours JSONB DEFAULT '{
      "monday":{"open":"08:00","close":"18:00","is_closed":false},
      "tuesday":{"open":"08:00","close":"18:00","is_closed":false},
      "wednesday":{"open":"08:00","close":"18:00","is_closed":false},
      "thursday":{"open":"08:00","close":"18:00","is_closed":false},
      "friday":{"open":"08:00","close":"18:00","is_closed":false},
      "saturday":{"open":"09:00","close":"14:00","is_closed":false},
      "sunday":{"is_closed":true}
    }'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de optimización
CREATE INDEX IF NOT EXISTS idx_org_locations_org_id ON public.organization_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_locations_active ON public.organization_locations(is_active);

-- Función para actualizar el timestamp si no existe en este scope
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$ language 'plpgsql';

-- Trigger de actualización
CREATE TRIGGER set_org_locations_updated_at
BEFORE UPDATE ON public.organization_locations
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Políticas de Seguridad (RLS)
ALTER TABLE public.organization_locations ENABLE ROW LEVEL SECURITY;

-- Select: Todos los miembros de la org pueden ver las sedes
CREATE POLICY "Members can view organization locations" ON public.organization_locations
    FOR SELECT TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

-- All: Solo owners y admins pueden crear/editar sedes
CREATE POLICY "Admins can manage organization locations" ON public.organization_locations
    FOR ALL TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

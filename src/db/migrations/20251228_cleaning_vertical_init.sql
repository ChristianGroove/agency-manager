-- Tabla de Servicios de Limpieza (Catálogo)
CREATE TABLE IF NOT EXISTS cleaning_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  price_unit TEXT DEFAULT 'per_service', -- 'per_hour', 'per_sqm', 'flat'
  estimated_duration_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Tabla de Perfiles de Staff de Limpieza (Extensión de Miembros)
CREATE TABLE IF NOT EXISTS cleaning_staff_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE, -- Relación 1:1 con el miembro base
  hourly_rate NUMERIC(10, 2) DEFAULT 0,
  skills TEXT[] DEFAULT '{}', -- Ej: ['deep_clean', 'windows', 'biohazard']
  color TEXT DEFAULT '#3B82F6', -- Para el calendario
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(member_id)
);

-- Habilitar RLS
ALTER TABLE cleaning_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_staff_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (Aislamiento por Organización)
CREATE POLICY "Org Access Services" ON cleaning_services
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org Access Staff" ON cleaning_staff_profiles
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

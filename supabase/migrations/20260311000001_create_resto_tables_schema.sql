-- Migration 20260311000001_create_resto_tables_schema.sql

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime" SCHEMA extensions;


-- =========================================================================
-- 1. ZONES (Salones/Áreas)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.resto_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    grid_width INTEGER DEFAULT 2000,
    grid_height INTEGER DEFAULT 2000,
    visual_elements JSONB DEFAULT '[]'::jsonb, -- Walls, plants, decorations (Zero-waste UI elements)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 2. TABLES (Mesas)
-- =========================================================================
-- Define shapes
CREATE TYPE public.resto_table_shape AS ENUM ('circle', 'square', 'rectangle', 'oval');
CREATE TYPE public.resto_table_status AS ENUM ('available', 'occupied', 'reserved', 'cleaning', 'billing');

CREATE TABLE IF NOT EXISTS public.resto_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES public.resto_zones(id) ON DELETE CASCADE,
    
    table_identifier VARCHAR(100) NOT NULL, -- e.g., "T1", "M1"
    capacity INTEGER DEFAULT 4,
    shape public.resto_table_shape DEFAULT 'square',
    
    -- Canvas positioning (Absolute positioned)
    pos_x FLOAT NOT NULL DEFAULT 0,
    pos_y FLOAT NOT NULL DEFAULT 0,
    width FLOAT NOT NULL DEFAULT 100,
    height FLOAT NOT NULL DEFAULT 100,
    rotation FLOAT NOT NULL DEFAULT 0,
    
    -- State
    status public.resto_table_status DEFAULT 'available',
    current_session_id UUID, -- Logical FK to resto_table_sessions
    qr_token VARCHAR(255) UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'), -- For In-Site QR ordering
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(zone_id, table_identifier) -- A table ID must be unique per zone
);

-- =========================================================================
-- 3. SESSIONS (Rondas de servicio / In-Site Orders)
-- =========================================================================
CREATE TYPE public.resto_session_status AS ENUM ('active', 'payment_pending', 'closed');

CREATE TABLE IF NOT EXISTS public.resto_table_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.resto_tables(id) ON DELETE CASCADE,
    
    opened_by UUID REFERENCES public.organization_staff(id) ON DELETE SET NULL,
    closed_by UUID REFERENCES public.organization_staff(id) ON DELETE SET NULL,
    
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    
    guest_count INTEGER DEFAULT 1,
    status public.resto_session_status DEFAULT 'active',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add the logical FK to tables to avoid circular dependency initially
ALTER TABLE public.resto_tables
ADD CONSTRAINT fk_current_session
FOREIGN KEY (current_session_id) REFERENCES public.resto_table_sessions(id) ON DELETE SET NULL;

-- =========================================================================
-- INDEXES & TRIGGERS
-- =========================================================================
CREATE INDEX idx_resto_zones_org ON public.resto_zones(organization_id);
CREATE INDEX idx_resto_tables_org ON public.resto_tables(organization_id);
CREATE INDEX idx_resto_tables_zone ON public.resto_tables(zone_id);
CREATE INDEX idx_resto_sessions_org ON public.resto_table_sessions(organization_id);
CREATE INDEX idx_resto_sessions_table ON public.resto_table_sessions(table_id);

-- Update timestamps trigger 
CREATE TRIGGER handle_updated_at_resto_zones BEFORE UPDATE ON public.resto_zones FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
CREATE TRIGGER handle_updated_at_resto_tables BEFORE UPDATE ON public.resto_tables FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
CREATE TRIGGER handle_updated_at_resto_table_sessions BEFORE UPDATE ON public.resto_table_sessions FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

-- =========================================================================
-- REALTIME (Critical for Live Mode Reactivity)
-- =========================================================================
-- Add tables to realtime publication (Important for UI Socket connectivity)
-- Realtime will only catch 'resto_tables' status updates via UI subscription filters.
ALTER PUBLICATION supabase_realtime ADD TABLE resto_zones;
ALTER PUBLICATION supabase_realtime ADD TABLE resto_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE resto_table_sessions;

-- =========================================================================
-- RLS (Row Level Security) - Wide tenant-level policies
-- =========================================================================
ALTER TABLE public.resto_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resto_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resto_table_sessions ENABLE ROW LEVEL SECURITY;

-- Zones Policies
CREATE POLICY "Users can manage zones of their organization" 
ON public.resto_zones FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        UNION
        SELECT organization_id FROM public.organization_staff WHERE id = auth.uid()
    )
);

-- Tables Policies
CREATE POLICY "Users can manage tables of their organization" 
ON public.resto_tables FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        UNION
        SELECT organization_id FROM public.organization_staff WHERE id = auth.uid()
    )
);

-- Sessions Policies
CREATE POLICY "Users can manage sessions of their organization" 
ON public.resto_table_sessions FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        UNION
        SELECT organization_id FROM public.organization_staff WHERE id = auth.uid()
    )
);

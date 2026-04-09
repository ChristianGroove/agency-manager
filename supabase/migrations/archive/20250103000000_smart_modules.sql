-- ============================================
-- FASE 2: SISTEMA DE MÓDULOS INTELIGENTE (AJUSTADO)
-- Date: 2025-01-02
-- Versión: Compatible con módulos existentes
-- ============================================

-- 1. EXTEND SYSTEM_MODULES with Smart Features

-- First, drop existing category constraint if it exists
ALTER TABLE public.system_modules
DROP CONSTRAINT IF EXISTS system_modules_category_check;

-- Now add columns without constraint
ALTER TABLE public.system_modules
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'vertical_specific',
ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS conflicts_with TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS compatible_verticals TEXT[] DEFAULT ARRAY['*'],
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'Box',
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1',
ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS is_core BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requires_configuration BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS price_monthly DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Fix any existing invalid category values
UPDATE public.system_modules
SET category = 'vertical_specific'
WHERE category IS NULL 
   OR category NOT IN ('core', 'vertical_specific', 'add_on', 'premium');

-- Now add the check constraint safely
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'system_modules_category_check' 
        AND conrelid = 'public.system_modules'::regclass
    ) THEN
        ALTER TABLE public.system_modules
        ADD CONSTRAINT system_modules_category_check 
        CHECK (category IN ('core', 'vertical_specific', 'add_on', 'premium'));
    END IF;
END $$;

COMMENT ON COLUMN public.system_modules.category IS 'Module category: core, vertical_specific, add_on, premium';
COMMENT ON COLUMN public.system_modules.dependencies IS 'Array of dependency objects with module_key, type (required/recommended), and reason';
COMMENT ON COLUMN public.system_modules.conflicts_with IS 'Array of module keys that conflict with this module';
COMMENT ON COLUMN public.system_modules.compatible_verticals IS 'Array of vertical slugs, or [*] for all';
COMMENT ON COLUMN public.system_modules.is_core IS 'Core modules are always active and cannot be disabled';

-- 2. UPDATE EXISTING MODULES with Smart Metadata (only existing ones)

-- CORE MODULES (always active) - Update based on actual keys
UPDATE public.system_modules
SET 
    category = 'core',
    is_core = TRUE,
    dependencies = '[]'::jsonb,
    compatible_verticals = ARRAY['*'],
    icon = 'Users',
    color = '#3b82f6',
    display_order = 1
WHERE key = 'core_clients';

UPDATE public.system_modules
SET 
    category = 'core',
    is_core = TRUE,
    dependencies = '[]'::jsonb,
    compatible_verticals = ARRAY['*'],
    icon = 'Settings',
    color = '#6366f1',
    display_order = 2
WHERE key = 'core_settings';

UPDATE public.system_modules
SET 
    category = 'core',
    is_core = TRUE,
    dependencies = '[]'::jsonb,
    compatible_verticals = ARRAY['*'],
    icon = 'Package',
    color = '#8b5cf6',
    display_order = 3
WHERE key = 'core_services';

UPDATE public.system_modules
SET 
    category = 'core',
    is_core = TRUE,
    dependencies = '[]'::jsonb,
    compatible_verticals = ARRAY['*'],
    icon = 'Server',
    color = '#10b981',
    display_order = 4
WHERE key = 'core_hosting';

-- VERTICAL MODULES - Update existing ones
UPDATE public.system_modules
SET 
    category = 'vertical_specific',
    dependencies = '[
        {"module_key": "core_clients", "type": "required", "reason": "Quotes must be assigned to a client"}
    ]'::jsonb,
    compatible_verticals = ARRAY['agency', 'consulting'],
    icon = 'FileText',
    color = '#10b981',
    display_order = 10
WHERE key = 'module_quotes';

UPDATE public.system_modules
SET 
    category = 'vertical_specific',
    dependencies = '[
        {"module_key": "core_clients", "type": "required", "reason": "Briefings are for client projects"}
    ]'::jsonb,
    compatible_verticals = ARRAY['agency', 'creative'],
    icon = 'FileEdit',
    color = '#14b8a6',
    display_order = 11
WHERE key = 'module_briefings';

UPDATE public.system_modules
SET 
    category = 'vertical_specific',
    dependencies = '[
        {"module_key": "core_clients", "type": "recommended", "reason": "Appointments can be scheduled for clients"}
    ]'::jsonb,
    compatible_verticals = ARRAY['*'],
    icon = 'Calendar',
    color = '#f59e0b',
    display_order = 12
WHERE key = 'module_appointments';

UPDATE public.system_modules
SET 
    category = 'vertical_specific',
    dependencies = '[]'::jsonb,
    compatible_verticals = ARRAY['*'],
    icon = 'Package',
    color = '#ec4899',
    display_order = 13
WHERE key = 'module_catalog';

UPDATE public.system_modules
SET 
    category = 'vertical_specific',
    dependencies = '[
        {"module_key": "core_clients", "type": "required", "reason": "Invoices are for clients"}
    ]'::jsonb,
    compatible_verticals = ARRAY['*'],
    icon = 'FileText',
    color = '#3b82f6',
    display_order = 14
WHERE key = 'module_invoicing';

UPDATE public.system_modules
SET 
    category = 'vertical_specific',
    dependencies = '[
        {"module_key": "module_invoicing", "type": "recommended", "reason": "Payments are recorded for invoices"}
    ]'::jsonb,
    compatible_verticals = ARRAY['*'],
    icon = 'DollarSign',
    color = '#10b981',
    display_order = 15
WHERE key = 'module_payments';

UPDATE public.system_modules
SET 
    category = 'add_on',
    dependencies = '[]'::jsonb,
    compatible_verticals = ARRAY['*'],
    icon = 'TrendingUp',
    color = '#8b5cf6',
    display_order = 20
WHERE key = 'meta_insights';

-- 3. CREATE VALIDATION FUNCTION
CREATE OR REPLACE FUNCTION public.validate_module_activation(
    p_module_key TEXT,
    p_organization_id UUID,
    p_current_active_modules TEXT[]
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_module RECORD;
    v_org RECORD;
    v_missing_deps TEXT[] := ARRAY[]::TEXT[];
    v_conflicts TEXT[] := ARRAY[]::TEXT[];
    v_dep JSONB;
BEGIN
    -- Get module metadata
    SELECT * INTO v_module
    FROM public.system_modules
    WHERE key = p_module_key;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Module not found',
            'type', 'not_found'
        );
    END IF;
    
    -- Get organization vertical (if column exists)
    BEGIN
        SELECT vertical INTO v_org
        FROM public.organizations
        WHERE id = p_organization_id;
    EXCEPTION WHEN undefined_column THEN
        -- Vertical column doesn't exist, skip this check
        v_org.vertical := NULL;
    END;
    
    -- Check compatibility with vertical (if both exist)
    IF v_org.vertical IS NOT NULL AND 
       v_module.compatible_verticals IS NOT NULL AND
       v_module.compatible_verticals != ARRAY['*'] AND 
       NOT (v_org.vertical = ANY(v_module.compatible_verticals)) THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Module not compatible with ' || v_org.vertical || ' vertical',
            'type', 'incompatible_vertical'
        );
    END IF;
    
    -- Check conflicts
    IF v_module.conflicts_with IS NOT NULL THEN
        SELECT ARRAY_AGG(conflict)
        INTO v_conflicts
        FROM unnest(v_module.conflicts_with) AS conflict
        WHERE conflict = ANY(p_current_active_modules);
        
        IF array_length(v_conflicts, 1) > 0 THEN
            RETURN jsonb_build_object(
                'valid', false,
                'error', 'Conflicts with: ' || array_to_string(v_conflicts, ', '),
                'conflicts', v_conflicts,
                'type', 'module_conflict'
            );
        END IF;
    END IF;
    
    -- Check required dependencies
    IF v_module.dependencies IS NOT NULL AND v_module.dependencies != '[]'::jsonb THEN
        FOR v_dep IN SELECT * FROM jsonb_array_elements(v_module.dependencies)
        LOOP
            IF (v_dep->>'type') = 'required' AND 
               NOT ((v_dep->>'module_key') = ANY(p_current_active_modules)) THEN
                v_missing_deps := array_append(v_missing_deps, v_dep->>'module_key');
            END IF;
        END LOOP;
        
        IF array_length(v_missing_deps, 1) > 0 THEN
            RETURN jsonb_build_object(
                'valid', true,
                'warnings', ARRAY['Missing required dependencies'],
                'auto_enable_suggestions', v_missing_deps,
                'type', 'missing_dependencies'
            );
        END IF;
    END IF;
    
    RETURN jsonb_build_object('valid', true);
END;
$$;

COMMENT ON FUNCTION public.validate_module_activation IS 'Validates if a module can be activated for an organization';

-- 4. CREATE FUNCTION TO GET ORPHANED MODULES
CREATE OR REPLACE FUNCTION public.get_orphaned_modules(
    p_module_to_disable TEXT,
    p_current_active_modules TEXT[]
) RETURNS TEXT[]
LANGUAGE plpgsql
AS $$
DECLARE
    v_orphans TEXT[] := ARRAY[]::TEXT[];
    v_module RECORD;
    v_dep JSONB;
BEGIN
    -- Loop through currently active modules
    FOR v_module IN 
        SELECT * FROM public.system_modules 
        WHERE key = ANY(p_current_active_modules)
        AND key != p_module_to_disable
    LOOP
        -- Check if this module depends on the one being disabled
        IF v_module.dependencies IS NOT NULL AND v_module.dependencies != '[]'::jsonb THEN
            FOR v_dep IN SELECT * FROM jsonb_array_elements(v_module.dependencies)
            LOOP
                IF (v_dep->>'module_key') = p_module_to_disable AND
                   (v_dep->>'type') = 'required' THEN
                    v_orphans := array_append(v_orphans, v_module.key);
                END IF;
            END LOOP;
        END IF;
    END LOOP;
    
    RETURN v_orphans;
END;
$$;

COMMENT ON FUNCTION public.get_orphaned_modules IS 'Returns modules that will be orphaned if specified module is disabled';

-- 5. CREATE FUNCTION TO AUTO-RESOLVE DEPENDENCIES
CREATE OR REPLACE FUNCTION public.auto_resolve_dependencies(
    p_module_key TEXT,
    p_current_active_modules TEXT[]
) RETURNS TEXT[]
LANGUAGE plpgsql
AS $$
DECLARE
    v_to_activate TEXT[] := ARRAY[]::TEXT[];
    v_module RECORD;
    v_dep JSONB;
    v_nested_deps TEXT[];
BEGIN
    -- Get module
    SELECT * INTO v_module
    FROM public.system_modules
    WHERE key = p_module_key;
    
    IF NOT FOUND THEN
        RETURN v_to_activate;
    END IF;
    
    -- Check each dependency
    IF v_module.dependencies IS NOT NULL AND v_module.dependencies != '[]'::jsonb THEN
        FOR v_dep IN SELECT * FROM jsonb_array_elements(v_module.dependencies)
        LOOP
            -- If required and not active, add to list
            IF (v_dep->>'type') = 'required' AND 
               NOT ((v_dep->>'module_key') = ANY(p_current_active_modules)) AND
               NOT ((v_dep->>'module_key') = ANY(v_to_activate)) THEN
                
                v_to_activate := array_append(v_to_activate, v_dep->>'module_key');
                
                -- Recursively check dependencies of dependencies
                v_nested_deps := public.auto_resolve_dependencies(
                    v_dep->>'module_key',
                    p_current_active_modules || v_to_activate
                );
                
                -- Add nested dependencies
                v_to_activate := v_to_activate || v_nested_deps;
            END IF;
        END LOOP;
    END IF;
    
    -- Remove duplicates
    SELECT ARRAY_AGG(DISTINCT module)
    INTO v_to_activate
    FROM unnest(v_to_activate) AS module;
    
    RETURN COALESCE(v_to_activate, ARRAY[]::TEXT[]);
END;
$$;

COMMENT ON FUNCTION public.auto_resolve_dependencies IS 'Returns array of modules that need to be activated to satisfy dependencies';

-- 6. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_system_modules_category ON public.system_modules(category);
CREATE INDEX IF NOT EXISTS idx_system_modules_is_core ON public.system_modules(is_core);
CREATE INDEX IF NOT EXISTS idx_system_modules_compatible_verticals ON public.system_modules USING GIN(compatible_verticals);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Smart Module System installed successfully';
    RAISE NOTICE 'Updated % existing modules with smart metadata', (SELECT COUNT(*) FROM public.system_modules WHERE dependencies IS NOT NULL);
    RAISE NOTICE 'Created validation and auto-resolution functions';
END $$;

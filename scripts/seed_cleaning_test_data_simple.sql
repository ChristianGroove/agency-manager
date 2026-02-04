-- ============================================================================
-- CLEANING MODULE TEST DATA SEED (SIMPLIFIED)
-- ============================================================================
-- This is a simplified version that uses ONLY confirmed table columns
-- Run this in Supabase Studio SQL Editor
-- ============================================================================

DO $$
DECLARE
    v_org_id UUID;
    v_user_id UUID;
    v_client1_id UUID;
    v_client2_id UUID;
    v_service1_id UUID;
    v_service2_id UUID;
    v_job1_id UUID;
    v_job2_id UUID;
BEGIN
    -- Find or create organization for testing
    SELECT id INTO v_org_id 
    FROM organizations 
    WHERE name ILIKE '%cleaning%' OR name ILIKE '%limpieza%'
    LIMIT 1;

    IF v_org_id IS NULL THEN
        INSERT INTO organizations (name, slug)
        VALUES ('CleanPro Testing', 'cleanpro-test')
        RETURNING id INTO v_org_id;
    END IF;

    RAISE NOTICE 'Using organization: %', v_org_id;

    -- Get a user_id from organization members (required for clients table)
    SELECT user_id INTO v_user_id
    FROM organization_members
    WHERE organization_id = v_org_id
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found in organization. Please add a member to the organization first.';
    END IF;

    RAISE NOTICE 'Using user_id: %', v_user_id;

    -- ========================================================================
    -- CLIENTS (with required user_id)
    -- ========================================================================
    
    INSERT INTO clients (
        organization_id,
        user_id,
        name,
        email,
        phone,
        company_name
    ) VALUES (
        v_org_id,
        v_user_id,
        'María González',
        'maria.gonzalez@email.com',
        '+1-555-0101',
        NULL
    ) RETURNING id INTO v_client1_id;
    
    RAISE NOTICE 'Created client: María González (ID: %)', v_client1_id;

    INSERT INTO clients (
        organization_id,
        user_id,
        name,
        email,
        phone,
        company_name
    ) VALUES (
        v_org_id,
        v_user_id,
        'Carlos Ramírez',
        'carlos.ramirez@techcorp.com',
        '+1-555-0202',
        'TechCorp Solutions'
    ) RETURNING id INTO v_client2_id;
    
    RAISE NOTICE 'Created client: Carlos Ramírez / TechCorp (ID: %)', v_client2_id;

    -- ========================================================================
    -- SERVICES (cleaning catalog with new category system)
    -- ========================================================================
    
    INSERT INTO service_catalog (
        organization_id,
        name,
        description,
        base_price,
        category,
        type,
        is_visible_in_portal,
        metadata
    ) VALUES (
        v_org_id,
        'Limpieza Profunda Residencial',
        'Limpieza exhaustiva de todas las áreas: cocina, baños, pisos, ventanas. Incluye desinfección completa.',
        150.00,
        'cleaning',
        'one_off',
        true,
        jsonb_build_object(
            'category', 'profunda',
            'duration_minutes', 240,
            'price_unit', 'per_service',
            'is_active', true
        )
    ) RETURNING id INTO v_service1_id;
    
    RAISE NOTICE 'Created service: Limpieza Profunda (ID: %)', v_service1_id;

    INSERT INTO service_catalog (
        organization_id,
        name,
        description,
        base_price,
        category,
        type,
        is_visible_in_portal,
        metadata
    ) VALUES (
        v_org_id,
        'Limpieza Express Oficina',
        'Limpieza rápida de oficina: escritorios, baños, áreas comunes. Ideal para mantenimiento diario.',
        80.00,
        'cleaning',
        'recurring',
        true,
        jsonb_build_object(
            'category', 'express',
            'duration_minutes', 120,
            'price_unit', 'per_service',
            'is_active', true
        )
    ) RETURNING id INTO v_service2_id;
    
    RAISE NOTICE 'Created service: Express Oficina (ID: %)', v_service2_id;

    -- ========================================================================
    -- WORK ORDERS / JOBS
    -- ========================================================================
    
    -- Job 1: Completed job
    INSERT INTO work_orders (
        organization_id,
        title,
        description,
        status,
        priority,
        start_time,
        end_time,
        client_id,
        service_id
    ) VALUES (
        v_org_id,
        'Servicio: Limpieza Profunda Residencial',
        'Limpieza completa de casa (3 habitaciones, 2 baños).',
        'completed',
        'normal',
        CURRENT_DATE - INTERVAL '3 days' + TIME '09:00',
        CURRENT_DATE - INTERVAL '3 days' + TIME '13:00',
        v_client1_id,
        v_service1_id
    ) RETURNING id INTO v_job1_id;
    
    RAISE NOTICE 'Created job: Completed (ID: %)', v_job1_id;

    -- Job 2: Scheduled job
    INSERT INTO work_orders (
        organization_id,
        title,
        description,
        status,
        priority,
        start_time,
        end_time,
        client_id,
        service_id
    ) VALUES (
        v_org_id,
        'Servicio: Limpieza Express Oficina',
        'Limpieza de mantenimiento semanal. Piso 5, Torre Empresarial.',
        'scheduled',
        'normal',
        CURRENT_DATE + INTERVAL '2 days' + TIME '18:00',
        CURRENT_DATE + INTERVAL '2 days' + TIME '20:00',
        v_client2_id,
        v_service2_id
    ) RETURNING id INTO v_job2_id;
    
    RAISE NOTICE 'Created job: Scheduled (ID: %)', v_job2_id;

    -- ========================================================================
    -- Summary
    -- ========================================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TEST DATA SEEDING COMPLETED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Organization: %', v_org_id;
    RAISE NOTICE '';
    RAISE NOTICE 'CLIENTS:';
    RAISE NOTICE '  - María González: %', v_client1_id;
    RAISE NOTICE '  - Carlos Ramírez (TechCorp): %', v_client2_id;
    RAISE NOTICE '';
    RAISE NOTICE 'SERVICES:';
    RAISE NOTICE '  - Limpieza Profunda: %', v_service1_id;
    RAISE NOTICE '  - Express Oficina: %', v_service2_id;
    RAISE NOTICE '';
    RAISE NOTICE 'JOBS:';
    RAISE NOTICE '  - Completed Job: %', v_job1_id;
    RAISE NOTICE '  - Scheduled Job: %', v_job2_id;
    RAISE NOTICE '========================================';

END $$;

-- Verification queries
SELECT 'CLIENTS:' as entity;
SELECT id, name, email, company_name FROM clients ORDER BY created_at DESC LIMIT 10;

SELECT 'SERVICES:' as entity;
SELECT id, name, metadata->>'category' as category, base_price FROM service_catalog 
WHERE category = 'cleaning' ORDER BY created_at DESC;

SELECT 'JOBS:' as entity;
SELECT 
    wo.title,
    wo.status,
    c.name as client,
    sc.name as service
FROM work_orders wo
LEFT JOIN clients c ON c.id = wo.client_id
LEFT JOIN service_catalog sc ON sc.id = wo.service_id
ORDER BY wo.start_time DESC
LIMIT 10;

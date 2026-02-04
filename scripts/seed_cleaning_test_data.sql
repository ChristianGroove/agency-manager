-- ============================================================================
-- CLEANING MODULE TEST DATA SEED
-- ============================================================================
-- This script populates test data for the Cleaning vertical testing account
-- Run this AFTER the catalog migration (20260204000000_migrate_cleaning_to_catalog.sql)
-- ============================================================================

-- Step 1: Find the Cleaning test organization
-- IMPORTANT: You need to replace 'CLEANING_ORG_ID' with the actual ID

DO $$
DECLARE
    v_org_id UUID;
    v_client1_id UUID;
    v_client2_id UUID;
    v_worker1_id UUID;
    v_worker2_id UUID;
    v_service1_id UUID;
    v_service2_id UUID;
    v_service3_id UUID;
    v_job1_id UUID;
    v_job2_id UUID;
    v_job3_id UUID;
BEGIN
    -- Find the organization (you may need to adjust this query)
    -- Option 1: By name
    SELECT id INTO v_org_id 
    FROM organizations 
    WHERE name ILIKE '%cleaning%' OR name ILIKE '%limpieza%'
    LIMIT 1;

    -- If not found, create a test organization
    IF v_org_id IS NULL THEN
        INSERT INTO organizations (
            name,
            slug,
            metadata
        ) VALUES (
            'CleanPro Testing',
            'cleanpro-test',
            jsonb_build_object(
                'industry', 'cleaning',
                'is_test', true
            )
        ) RETURNING id INTO v_org_id;
        
        RAISE NOTICE 'Created test organization: %', v_org_id;
    ELSE
        RAISE NOTICE 'Using existing organization: %', v_org_id;
    END IF;

    -- ========================================================================
    -- CLIENTS / CONTACTS
    -- ========================================================================
    
    -- Client 1: María González (Residencial)
    INSERT INTO clients (
        organization_id,
        name,
        email,
        phone,
        company_name,
        status,
        tags,
        notes,
        metadata
    ) VALUES (
        v_org_id,
        'María González',
        'maria.gonzalez@email.com',
        '+1-555-0101',
        NULL,
        'active',
        ARRAY['residencial', 'recurrente', 'premium'],
        'Cliente desde hace 2 años. Prefiere servicio los lunes.',
        jsonb_build_object(
            'preferred_day', 'monday',
            'has_pets', true,
            'access_code', '1234'
        )
    ) RETURNING id INTO v_client1_id;
    
    RAISE NOTICE 'Created client 1: María González (ID: %)', v_client1_id;

    -- Client 2: Oficinas TechCorp (Comercial)
    INSERT INTO clients (
        organization_id,
        name,
        email,
        phone,
        company_name,
        status,
        tags,
        notes,
        metadata
    ) VALUES (
        v_org_id,
        'Carlos Ramírez',
        'carlos.ramirez@techcorp.com',
        '+1-555-0202',
        'TechCorp Solutions',
        'active',
        ARRAY['comercial', 'oficina', 'contrato-mensual'],
        'Oficina de 500m². Limpieza 3 veces por semana.',
        jsonb_build_object(
            'office_size_sqm', 500,
            'floor_number', 5,
            'building', 'Torre Empresarial'
        )
    ) RETURNING id INTO v_client2_id;
    
    RAISE NOTICE 'Created client 2: TechCorp (ID: %)', v_client2_id;

    -- ========================================================================
    -- WORKERS / STAFF
    -- ========================================================================
    
    -- Worker 1: Ana Martínez (Senior)
    INSERT INTO team_members (
        organization_id,
        first_name,
        last_name,
        email,
        phone,
        role,
        status,
        hire_date,
        metadata
    ) VALUES (
        v_org_id,
        'Ana',
        'Martínez',
        'ana.martinez@cleanpro.com',
        '+1-555-1001',
        'cleaner',
        'active',
        CURRENT_DATE - INTERVAL '18 months',
        jsonb_build_object(
            'specialties', ARRAY['deep_cleaning', 'disinfection'],
            'certifications', ARRAY['OSHA', 'Green Clean'],
            'hourly_rate', 25,
            'availability', jsonb_build_object(
                'monday', true,
                'tuesday', true,
                'wednesday', true,
                'thursday', true,
                'friday', true,
                'saturday', false,
                'sunday', false
            )
        )
    ) RETURNING id INTO v_worker1_id;
    
    RAISE NOTICE 'Created worker 1: Ana Martínez (ID: %)', v_worker1_id;

    -- Worker 2: Roberto Silva (Junior)
    INSERT INTO team_members (
        organization_id,
        first_name,
        last_name,
        email,
        phone,
        role,
        status,
        hire_date,
        metadata
    ) VALUES (
        v_org_id,
        'Roberto',
        'Silva',
        'roberto.silva@cleanpro.com',
        '+1-555-1002',
        'cleaner',
        'active',
        CURRENT_DATE - INTERVAL '3 months',
        jsonb_build_object(
            'specialties', ARRAY['maintenance', 'express'],
            'hourly_rate', 18,
            'is_trainee', true,
            'availability', jsonb_build_object(
                'monday', true,
                'tuesday', true,
                'wednesday', false,
                'thursday', true,
                'friday', true,
                'saturday', true,
                'sunday', false
            )
        )
    ) RETURNING id INTO v_worker2_id;
    
    RAISE NOTICE 'Created worker 2: Roberto Silva (ID: %)', v_worker2_id;

    -- ========================================================================
    -- SERVICES (Using new category system)
    -- ========================================================================
    
    -- Service 1: Limpieza Profunda Residencial
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
            'is_active', true,
            'includes', ARRAY['Cocina completa', 'Baños', 'Pisos', 'Ventanas', 'Desinfección']
        )
    ) RETURNING id INTO v_service1_id;
    
    RAISE NOTICE 'Created service 1: Limpieza Profunda (ID: %)', v_service1_id;

    -- Service 2: Express Office Cleaning
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
            'is_active', true,
            'includes', ARRAY['Escritorios', 'Baños', 'Áreas comunes', 'Vaciado de basura']
        )
    ) RETURNING id INTO v_service2_id;
    
    RAISE NOTICE 'Created service 2: Express Oficina (ID: %)', v_service2_id;

    -- Service 3: Desinfección COVID-19
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
        'Desinfección Profesional',
        'Sanitización completa con productos EPA-aprobados. Protocolo anti-COVID.',
        200.00,
        'cleaning',
        'one_off',
        true,
        jsonb_build_object(
            'category', 'desinfeccion',
            'duration_minutes', 180,
            'price_unit', 'per_service',
            'is_active', true,
            'requires_certification', true,
            'includes', ARRAY['Sanitización completa', 'Productos EPA', 'Certificado de desinfección']
        )
    ) RETURNING id INTO v_service3_id;
    
    RAISE NOTICE 'Created service 3: Desinfección (ID: %)', v_service3_id;

    -- ========================================================================
    -- WORK ORDERS / JOBS
    -- ========================================================================
    
    -- Job 1: Completed job for María González
    INSERT INTO work_orders (
        organization_id,
        title,
        description,
        status,
        priority,
        start_time,
        end_time,
        assigned_staff_id,
        client_id,
        service_id,
        metadata
    ) VALUES (
        v_org_id,
        'Servicio: Limpieza Profunda Residencial',
        'Limpieza completa de casa (3 habitaciones, 2 baños). Cliente solicita especial atención en cocina.',
        'completed',
        'normal',
        CURRENT_DATE - INTERVAL '3 days' + TIME '09:00',
        CURRENT_DATE - INTERVAL '3 days' + TIME '13:00',
        v_worker1_id,
        v_client1_id,
        v_service1_id,
        jsonb_build_object(
            'completion_notes', 'Servicio completado satisfactoriamente. Cliente muy satisfecho.',
            'actual_duration_minutes', 240,
            'materials_used', jsonb_build_object(
                'detergent', '500ml',
                'disinfectant', '1L'
            )
        )
    ) RETURNING id INTO v_job1_id;
    
    RAISE NOTICE 'Created job 1: Completed job (ID: %)', v_job1_id;

    -- Job 2: Scheduled job for TechCorp
    INSERT INTO work_orders (
        organization_id,
        title,
        description,
        status,
        priority,
        start_time,
        end_time,
        assigned_staff_id,
        client_id,
        service_id,
        metadata
    ) VALUES (
        v_org_id,
        'Servicio: Limpieza Express Oficina',
        'Limpieza de mantenimiento semanal. Piso 5, Torre Empresarial.',
        'scheduled',
        'normal',
        CURRENT_DATE + INTERVAL '2 days' + TIME '18:00',
        CURRENT_DATE + INTERVAL '2 days' + TIME '20:00',
        v_worker2_id,
        v_client2_id,
        v_service2_id,
        jsonb_build_object(
            'special_requirements', 'Después de horario laboral',
            'access_instructions', 'Usar entrada de servicio, piso 5'
        )
    ) RETURNING id INTO v_job2_id;
    
    RAISE NOTICE 'Created job 2: Scheduled job (ID: %)', v_job2_id;

    -- Job 3: Pending job for María (recurring)
    INSERT INTO work_orders (
        organization_id,
        title,
        description,
        status,
        priority,
        start_time,
        end_time,
        client_id,
        service_id,
        metadata
    ) VALUES (
        v_org_id,
        'Mantenimiento Semanal - María González',
        'Limpieza de mantenimiento regular. Cliente prefiere lunes por la mañana.',
        'pending',
        'normal',
        CURRENT_DATE + INTERVAL '7 days' + TIME '09:00',
        CURRENT_DATE + INTERVAL '7 days' + TIME '11:00',
        v_client1_id,
        v_service2_id,
        jsonb_build_object(
            'is_recurring', true,
            'recurrence_pattern', 'weekly',
            'needs_assignment', true
        )
    ) RETURNING id INTO v_job3_id;
    
    RAISE NOTICE 'Created job 3: Pending assignment (ID: %)', v_job3_id;

    -- ========================================================================
    -- Summary Output
    -- ========================================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST DATA SEEDING COMPLETED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Organization ID: %', v_org_id;
    RAISE NOTICE '';
    RAISE NOTICE 'CLIENTS:';
    RAISE NOTICE '  - María González: %', v_client1_id;
    RAISE NOTICE '  - Carlos Ramírez (TechCorp): %', v_client2_id;
    RAISE NOTICE '';
    RAISE NOTICE 'WORKERS:';
    RAISE NOTICE '  - Ana Martínez (Senior): %', v_worker1_id;
    RAISE NOTICE '  - Roberto Silva (Junior): %', v_worker2_id;
    RAISE NOTICE '';
    RAISE NOTICE 'SERVICES:';
    RAISE NOTICE '  - Limpieza Profunda: %', v_service1_id;
    RAISE NOTICE '  - Express Oficina: %', v_service2_id;
    RAISE NOTICE '  - Desinfección: %', v_service3_id;
    RAISE NOTICE '';
    RAISE NOTICE 'JOBS:';
    RAISE NOTICE '  - Completed Job: %', v_job1_id;
    RAISE NOTICE '  - Scheduled Job: %', v_job2_id;
    RAISE NOTICE '  - Pending Job: %', v_job3_id;
    RAISE NOTICE '========================================';

END $$;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Uncomment these to verify the data was created:

/*
-- View all clients
SELECT 
    c.name,
    c.email,
    c.company_name,
    c.tags,
    c.status
FROM clients c
ORDER BY c.created_at DESC;

-- View all workers
SELECT 
    tm.first_name || ' ' || tm.last_name as name,
    tm.email,
    tm.role,
    tm.metadata->>'hourly_rate' as hourly_rate,
    tm.status
FROM team_members tm
ORDER BY tm.hire_date DESC;

-- View all services with categories
SELECT 
    sc.name,
    sc.metadata->>'category' as category,
    sc.base_price,
    sc.metadata->>'duration_minutes' as duration_minutes,
    sc.type,
    sc.is_visible_in_portal
FROM service_catalog sc
WHERE sc.category = 'cleaning'
ORDER BY sc.created_at DESC;

-- View all jobs with details
SELECT 
    wo.title,
    wo.status,
    wo.priority,
    wo.start_time,
    c.first_name || ' ' || c.last_name as client,
    tm.first_name || ' ' || tm.last_name as assigned_to,
    sc.name as service,
    sc.metadata->>'category' as service_category
FROM work_orders wo
LEFT JOIN contacts c ON c.id = wo.client_id
LEFT JOIN team_members tm ON tm.id = wo.assigned_staff_id
LEFT JOIN service_catalog sc ON sc.id = wo.service_id
ORDER BY wo.start_time DESC;
*/

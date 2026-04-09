-- Fix broken workflows: Delete old ones and create 3 new test workflows
-- Run this in Supabase SQL Editor or via supabase db push

DO $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Get the first agency organization
    SELECT id INTO v_org_id FROM organizations WHERE vertical_key = 'agency' LIMIT 1;
    
    IF v_org_id IS NULL THEN
        -- Fallback: get any organization
        SELECT id INTO v_org_id FROM organizations LIMIT 1;
    END IF;
    
    IF v_org_id IS NULL THEN
        RAISE NOTICE 'No organization found. Cannot create workflows.';
        RETURN;
    END IF;

    -- Delete existing broken workflows
    DELETE FROM workflows WHERE organization_id = v_org_id;

    -- Workflow 1: Simple Auto-Reply Bot
    INSERT INTO workflows (
        id, organization_id, name, description, is_active, trigger_type, trigger_config, definition, created_at, updated_at
    ) VALUES (
        uuid_generate_v4(),
        v_org_id,
        'Bot de Bienvenida',
        'Responde automáticamente a nuevos mensajes con un saludo.',
        true,
        'keyword',
        '{"keyword": "hola", "matchType": "contains"}'::jsonb,
        '{
            "nodes": [
                {"id": "trigger-1", "type": "trigger", "data": {"label": "Keyword: hola"}, "position": {"x": 100, "y": 100}},
                {"id": "action-1", "type": "action", "data": {"label": "Enviar Saludo", "actionType": "send_message", "message": "👋 ¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte?"}, "position": {"x": 100, "y": 250}}
            ],
            "edges": [
                {"id": "e1", "source": "trigger-1", "target": "action-1"}
            ]
        }'::jsonb,
        NOW(),
        NOW()
    );

    -- Workflow 2: Lead Capture
    INSERT INTO workflows (
        id, organization_id, name, description, is_active, trigger_type, trigger_config, definition, created_at, updated_at
    ) VALUES (
        uuid_generate_v4(),
        v_org_id,
        'Captura de Leads',
        'Registra leads cuando alguien pregunta por precios o servicios.',
        true,
        'keyword',
        '{"keyword": "precio", "matchType": "contains"}'::jsonb,
        '{
            "nodes": [
                {"id": "trigger-1", "type": "trigger", "data": {"label": "Keyword: precio"}, "position": {"x": 100, "y": 100}},
                {"id": "action-1", "type": "action", "data": {"label": "Crear Lead", "actionType": "create_lead"}, "position": {"x": 100, "y": 250}},
                {"id": "action-2", "type": "action", "data": {"label": "Responder", "actionType": "send_message", "message": "📋 ¡Perfecto! He registrado tu interés. Te enviaré información de precios en un momento."}, "position": {"x": 100, "y": 400}}
            ],
            "edges": [
                {"id": "e1", "source": "trigger-1", "target": "action-1"},
                {"id": "e2", "source": "action-1", "target": "action-2"}
            ]
        }'::jsonb,
        NOW(),
        NOW()
    );

    -- Workflow 3: Out of Hours Response
    INSERT INTO workflows (
        id, organization_id, name, description, is_active, trigger_type, trigger_config, definition, created_at, updated_at
    ) VALUES (
        uuid_generate_v4(),
        v_org_id,
        'Respuesta Fuera de Horario',
        'Informa que el equipo responderá pronto cuando hay mensajes fuera de horario.',
        false,
        'schedule',
        '{"schedule": "0 22 * * *", "timezone": "America/Bogota"}'::jsonb,
        '{
            "nodes": [
                {"id": "trigger-1", "type": "trigger", "data": {"label": "Horario: 10pm"}, "position": {"x": 100, "y": 100}},
                {"id": "action-1", "type": "action", "data": {"label": "Mensaje Fuera de Horario", "actionType": "send_message", "message": "🌙 Gracias por escribirnos. Nuestro equipo te responderá mañana a primera hora. ¡Buenas noches!"}, "position": {"x": 100, "y": 250}}
            ],
            "edges": [
                {"id": "e1", "source": "trigger-1", "target": "action-1"}
            ]
        }'::jsonb,
        NOW(),
        NOW()
    );

    RAISE NOTICE 'Created 3 new test workflows for organization %', v_org_id;
END $$;

-- SEED AGENCY LEAD QUALIFICATION WORKFLOW (FIXED)

DO $$
DECLARE
    v_org_id UUID;
    v_workflow_id UUID := uuid_generate_v4();
    v_exists BOOLEAN;
BEGIN
    -- 1. Get First Organization (Agency Vertical)
    SELECT id INTO v_org_id FROM organizations WHERE vertical_key = 'agency' LIMIT 1;

    IF v_org_id IS NULL THEN
        RAISE NOTICE 'No Agency Organization found. Skipping seed.';
        RETURN;
    END IF;

    -- 2. Check if already exists
    SELECT EXISTS(SELECT 1 FROM workflows WHERE name = 'Auto-Qualify Agency Lead' AND organization_id = v_org_id) INTO v_exists;

    IF v_exists THEN
        RAISE NOTICE 'Workflow "Auto-Qualify Agency Lead" already exists. Skipping.';
        RETURN;
    END IF;

    -- 3. Insert Workflow
    INSERT INTO workflows (
        id,
        organization_id,
        name,
        description,
        is_active,
        trigger_type,
        trigger_config,
        definition
    ) VALUES (
        v_workflow_id,
        v_org_id,
        'Auto-Qualify Agency Lead',
        'Creates a lead in CRM when someone says "interesado" and sends a welcome packet.',
        TRUE,
        'keyword',
        '{"keyword": "interesado", "matchType": "contains"}'::jsonb,
        jsonb_build_object(
            'nodes', jsonb_build_array(
                -- Trigger Node
                jsonb_build_object(
                    'id', 'trigger_1',
                    'type', 'trigger',
                    'data', jsonb_build_object('label', 'Keyword: interesado')
                ),
                -- Action: Create Lead
                jsonb_build_object(
                    'id', 'action_create_lead',
                    'type', 'crm',
                    'data', jsonb_build_object(
                        'actionType', 'create_lead',
                        'leadName', 'Lead WhatsApp {{message.sender}}',
                        'leadPhone', '{{message.sender}}',
                        'leadNotes', 'Auto-created from message: {{message.content}}'
                    )
                ),
                -- Action: Delay (Humanize)
                jsonb_build_object(
                    'id', 'action_delay',
                    'type', 'delay',
                    'data', jsonb_build_object('duration', '2s')
                ),
                -- Action: Reply
                jsonb_build_object(
                    'id', 'action_reply',
                    'type', 'action',
                    'data', jsonb_build_object(
                        'actionType', 'send_message',
                        'message', '¡Hola! 👋 Gracias por tu interés en nuestros servicios de agencia. Hemos registrado tus datos y un especialista te contactará en los próximos minutos.'
                    )
                )
            ),
            'edges', jsonb_build_array(
                jsonb_build_object('id', 'e1', 'source', 'trigger_1', 'target', 'action_create_lead'),
                jsonb_build_object('id', 'e2', 'source', 'action_create_lead', 'target', 'action_delay'),
                jsonb_build_object('id', 'e3', 'source', 'action_delay', 'target', 'action_reply')
            )
        )
    );

    RAISE NOTICE 'Seeded Agency Workflow: Auto-Qualify Agency Lead';
END $$;

-- Seed a Test Workflow for End-to-End Testing
INSERT INTO workflows (
    id,
    organization_id,
    name,
    description,
    is_active,
    trigger_type,
    trigger_config,
    definition,
    created_at,
    updated_at
) VALUES (
    'test-bot-workflow-v1',
    'db9d1288-80ab-48df-b130-a0739881c6f2', -- Pixy Agency
    'Bot de Prueba (WhatsApp)',
    'Workflow de prueba generado automáticamente para validar la integración.',
    true,
    'webhook',
    '{"channel": "whatsapp", "keyword": "bot"}',
    '{
        "nodes": [
            {
                "id": "trigger-1",
                "type": "trigger",
                "data": { "label": "Start", "triggerType": "webhook", "channel": "whatsapp", "keyword": "bot" },
                "position": { "x": 100, "y": 100 }
            },
            {
                "id": "action-1",
                "type": "action",
                "data": { "label": "Auto-Reply", "actionType": "send_message", "message": "🤖 *Auto-Response:* ¡Hola! Soy el bot de prueba. He recibido tu mensaje correctamente." },
                "position": { "x": 100, "y": 250 }
            }
        ],
        "edges": [
            { "id": "e1", "source": "trigger-1", "target": "action-1" }
        ]
    }'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    trigger_config = EXCLUDED.trigger_config,
    definition = EXCLUDED.definition,
    is_active = true;

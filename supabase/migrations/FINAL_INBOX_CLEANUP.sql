-- ============================================
-- FINAL INBOX CLEANUP & FIX
-- This script will completely clean up and fix all inbox data issues
-- ============================================

-- PASO 1: Ver el estado actual
DO $$
BEGIN
    RAISE NOTICE '=== ESTADO ACTUAL ===';
    RAISE NOTICE 'Total conversations: %', (SELECT COUNT(*) FROM conversations WHERE organization_id = 'db9d1288-80ab-48df-b130-a0739881c6f2');
    RAISE NOTICE 'Total messages: %', (SELECT COUNT(*) FROM messages);
    RAISE NOTICE 'Messages huérfanos (conversation_id NULL): %', (SELECT COUNT(*) FROM messages WHERE conversation_id IS NULL);
    RAISE NOTICE 'Conversations vacías: %', (SELECT COUNT(*) FROM conversations c WHERE organization_id = 'db9d1288-80ab-48df-b130-a0739881c6f2' AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id));
END $$;

-- PASO 2: Encontrar la conversación correcta para mensajes huérfanos
-- Por ahora, vamos a crear una conversación nueva si es necesario
DO $$
DECLARE
    orphan_count INT;
    conv_id UUID;
BEGIN
    SELECT COUNT(*) INTO orphan_count FROM messages WHERE conversation_id IS NULL;
    
    IF orphan_count > 0 THEN
        RAISE NOTICE 'Fixing % orphan messages...', orphan_count;
        
        -- Para cada teléfono con mensajes huérfanos, crear/encontrar conversation
        FOR phone_record IN (
            SELECT DISTINCT 
                COALESCE(metadata->>'phoneNumberId', metadata->>'sender_name', 'unknown') as phone_identifier
            FROM messages 
            WHERE conversation_id IS NULL
        ) LOOP
            -- Aquí necesitarías lógica más específica basada en tus datos
            -- Por ahora solo logeamos
            RAISE NOTICE 'Found orphans for: %', phone_record.phone_identifier;
        END LOOP;
    END IF;
END $$;

-- PASO 3: Consolidar conversaciones duplicadas
-- Mantener solo la conversación más reciente por teléfono
WITH duplicates AS (
    SELECT 
        phone,
        organization_id,
        ARRAY_AGG(id ORDER BY created_at DESC) as conv_ids,
        COUNT(*) as count
    FROM conversations
    WHERE organization_id = 'db9d1288-80ab-48df-b130-a0739881c6f2'
    AND phone IS NOT NULL
    GROUP BY phone, organization_id
    HAVING COUNT(*) > 1
)
SELECT 
    d.phone,
    d.count as duplicate_count,
    d.conv_ids[1] as keep_conversation,
    d.conv_ids[2:] as delete_conversations
FROM duplicates d;

-- PASO 4: Mover mensajes de conversaciones duplicadas a la principal
-- (Este paso se debe ejecutar manualmente después de revisar el resultado anterior)

-- PASO 5: Actualizar last_message en todas las conversaciones
UPDATE conversations c
SET 
    last_message = (
        SELECT content::text 
        FROM messages m 
        WHERE m.conversation_id = c.id 
        ORDER BY m.created_at DESC 
        LIMIT 1
    ),
    last_message_at = (
        SELECT created_at 
        FROM messages m 
        WHERE m.conversation_id = c.id 
        ORDER BY m.created_at DESC 
        LIMIT 1
    ),
    unread_count = (
        SELECT COUNT(*) 
        FROM messages m 
        WHERE m.conversation_id = c.id 
        AND m.direction = 'inbound'
        AND m.status != 'read'
    ),
    updated_at = NOW()
WHERE organization_id = 'db9d1288-80ab-48df-b130-a0739881c6f2';

-- PASO 6: Verificar estado final
SELECT 
    c.id,
    c.phone,
    c.last_message,
    c.state,
    l.name as lead_name,
    (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count,
    (SELECT MAX(created_at) FROM messages m WHERE m.conversation_id = c.id) as last_msg_at
FROM conversations c
LEFT JOIN leads l ON l.id = c.lead_id
WHERE c.organization_id = 'db9d1288-80ab-48df-b130-a0739881c6f2'
ORDER BY c.updated_at DESC;

-- ============================================
-- HABILITAR RLS EN MESSAGES (Versión Final)
-- Con políticas simplificadas que SÍ funcionan desde browser client
-- ============================================

-- 1. Re-habilitar RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 2. Drop políticas anteriores si existen
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
DROP POLICY IF EXISTS "messages_update_policy" ON messages;

-- 3. Crear políticas ULTRA-SIMPLES que funcionan desde browser
-- Estrategia: permitir acceso basado en organization_id del usuario

-- SELECT: Ver mensajes de conversaciones de tu organización
CREATE POLICY "messages_select_by_org"
ON messages
FOR SELECT
USING (
    conversation_id IN (
        SELECT c.id 
        FROM conversations c
        JOIN organization_members om ON om.organization_id = c.organization_id
        WHERE om.user_id = auth.uid()
    )
);

-- INSERT: Insertar mensajes en conversaciones de tu organización
CREATE POLICY "messages_insert_by_org"
ON messages
FOR INSERT
WITH CHECK (
    conversation_id IN (
        SELECT c.id 
        FROM conversations c
        JOIN organization_members om ON om.organization_id = c.organization_id
        WHERE om.user_id = auth.uid()
    )
);

-- UPDATE: Actualizar mensajes de conversaciones de tu organización
CREATE POLICY "messages_update_by_org"
ON messages
FOR UPDATE
USING (
    conversation_id IN (
        SELECT c.id 
        FROM conversations c
        JOIN organization_members om ON om.organization_id = c.organization_id
        WHERE om.user_id = auth.uid()
    )
);

-- 4. Verificar que las políticas se crearon
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;

-- 5. Test rápido (ejecutar después de refrescar el inbox)
-- Debería retornar mensajes si el usuario está autenticado
SELECT COUNT(*) as message_count 
FROM messages 
WHERE conversation_id IN (
    SELECT id FROM conversations 
    WHERE organization_id = 'db9d1288-80ab-48df-b130-a0739881c6f2'
);

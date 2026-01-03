-- ============================================
-- RESET COMPLETO DEL INBOX
-- Borra TODA la data corrupta y empieza limpio
-- ============================================

-- 1. Borrar todos los mensajes de Pixy Agency
DELETE FROM messages 
WHERE conversation_id IN (
    SELECT id FROM conversations 
    WHERE organization_id = 'db9d1288-80ab-48df-b130-a0739881c6f2'
);

-- 2. Borrar mensajes huérfanos
DELETE FROM messages WHERE conversation_id IS NULL;

-- 3. Borrar todas las conversaciones de Pixy Agency
DELETE FROM conversations 
WHERE organization_id = 'db9d1288-80ab-48df-b130-a0739881c6f2';

-- 4. Borrar todos los leads de Pixy Agency (opcional, descomentar si quieres empezar completamente limpio)
-- DELETE FROM leads WHERE organization_id = 'db9d1288-80ab-48df-b130-a0739881c6f2';

-- 5. Verificar que todo está limpio
SELECT 'Conversations restantes' as tabla, COUNT(*) as count FROM conversations WHERE organization_id = 'db9d1288-80ab-48df-b130-a0739881c6f2'
UNION ALL
SELECT 'Messages restantes', COUNT(*) FROM messages
UNION ALL
SELECT 'Messages huérfanos', COUNT(*) FROM messages WHERE conversation_id IS NULL;

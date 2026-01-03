-- DIAGNÓSTICO COMPLETO: Por qué no aparecen conversaciones nuevas

-- 1. Ver la conversación recién creada
SELECT 
    'CONVERSACIÓN NUEVA' as check_type,
    c.id,
    c.organization_id,
    c.phone,
    c.last_message,
    c.created_at
FROM conversations c
WHERE c.id = 'b0948d1a-8ff0-4fde-b965-46a568facad8';

-- 2. Ver el usuario actual y su organización
SELECT 
    'USUARIO ACTUAL' as check_type,
    auth.uid() as current_user_id,
    u.email,
    om.organization_id,
    o.name as org_name
FROM auth.users u
LEFT JOIN organization_members om ON om.user_id = u.id
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE u.id = auth.uid();

-- 3. Ver todas las conversaciones de la organización del usuario
SELECT 
    'CONVERSACIONES EN LA ORG' as check_type,
    c.id,
    c.phone,
    c.last_message,
    c.created_at,
    c.organization_id
FROM conversations c
WHERE c.organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
)
ORDER BY c.created_at DESC
LIMIT 10;

-- 4. Verificar si la política funciona (esto es lo que ve el usuario)
SELECT 
    'LO QUE VE EL USUARIO' as check_type,
    c.id,
    c.phone,
    c.last_message,
    c.created_at
FROM conversations c
ORDER BY c.created_at DESC
LIMIT 10;

-- 5. Ver todas las conversaciones (como admin, sin RLS)
SELECT 
    'TODAS LAS CONVERSACIONES (ADMIN)' as check_type,
    c.id,
    c.organization_id,
    c.phone,
    c.last_message,
    c.created_at
FROM conversations c
ORDER BY c.created_at DESC
LIMIT 10;

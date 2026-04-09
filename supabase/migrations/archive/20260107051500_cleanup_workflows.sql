-- Migration: Clean workflows and fix inconsistencies
-- Automated by Phase 12 audit

-- 1. Delete test/debug workflows to clean slate
DELETE FROM workflow_executions WHERE workflow_id IN (
    SELECT id FROM workflows WHERE name LIKE '%test%' OR name LIKE '%Test%' OR name LIKE '%prueba%'
);

DELETE FROM workflows WHERE name LIKE '%test%' OR name LIKE '%Test%' OR name LIKE '%prueba%';

-- 2. Fix workflows with 'keyword' trigger_type but no keyword in config
UPDATE workflows
SET 
    trigger_type = 'message_received',
    trigger_config = jsonb_set(
        trigger_config::jsonb - 'keyword', 
        '{}', 
        '{}'::jsonb
    )::json,
    updated_at = NOW()
WHERE 
    trigger_type = 'keyword' 
    AND (
        trigger_config->>'keyword' IS NULL 
        OR trigger_config->>'keyword' = ''
        OR trigger_config->>'keyword' = 'undefined'
    );

-- 3. Ensure all workflows have valid trigger_type
UPDATE workflows
SET trigger_type = 'message_received'
WHERE trigger_type IS NULL OR trigger_type = '';

-- 4. Log cleanup results
SELECT 
    id,
    name,
    trigger_type,
    trigger_config
FROM workflows
ORDER BY updated_at DESC
LIMIT 10;

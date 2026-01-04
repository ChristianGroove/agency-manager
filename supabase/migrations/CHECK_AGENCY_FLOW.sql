
-- CHECK EXECUTION
SELECT id, status, started_at, completed_at, error_message FROM workflow_executions ORDER BY started_at DESC LIMIT 1;

-- CHECK LEAD CREATED
SELECT id, name, organization_id, source FROM leads WHERE name LIKE 'Lead WhatsApp 555%' ORDER BY created_at DESC LIMIT 1;

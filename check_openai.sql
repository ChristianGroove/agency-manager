
SELECT id, provider_id, status, created_at 
FROM ai_credentials 
WHERE provider_id = 'openai' AND status = 'active';

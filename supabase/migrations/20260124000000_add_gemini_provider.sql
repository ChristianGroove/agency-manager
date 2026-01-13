-- Insert Google Gemini Provider
INSERT INTO public.ai_providers (id, name, type, capabilities, base_url, models, logo_url)
VALUES (
    'google', 
    'Google Gemini', 
    'llm',
    '{"stream": true, "tools": true, "json_mode": true, "vision": true}'::jsonb,
    'https://generativelanguage.googleapis.com/v1beta',
    '["gemini-pro", "gemini-pro-vision", "gemini-1.5-pro", "gemini-1.5-flash"]'::jsonb,
    'https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg'
)
ON CONFLICT (id) DO UPDATE SET
    models = EXCLUDED.models,
    capabilities = EXCLUDED.capabilities,
    base_url = EXCLUDED.base_url,
    logo_url = EXCLUDED.logo_url;

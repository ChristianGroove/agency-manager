
-- Insert Groq Provider (Corrected Schema)
INSERT INTO public.ai_providers (id, name, type, capabilities, base_url, models, logo_url)
VALUES (
    'groq', 
    'Groq', 
    'llm',
    '{"stream": true, "tools": true, "json_mode": true}'::jsonb,
    'https://api.groq.com/openai/v1',
    '["llama-3.1-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768", "gemma2-9b-it"]'::jsonb,
    'https://groq.com/wp-content/uploads/2024/03/PBG-mark1-color.svg'
)
ON CONFLICT (id) DO UPDATE SET
    models = EXCLUDED.models,
    capabilities = EXCLUDED.capabilities,
    base_url = EXCLUDED.base_url,
    logo_url = EXCLUDED.logo_url;

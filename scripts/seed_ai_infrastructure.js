const { Client } = require('pg');

async function seedAIInfrastructure() {
    const pid = 'uqnsdylhyenfmfkxmkrn';
    const pass = 'Valentinfer1987*';
    const r = 'us-west-2';

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require',
    });

    try {
        await client.connect();
        console.log('--- CREATING AI INFRASTRUCTURE ---');

        // 1. Create AI Providers Table
        console.log('Creating table public.ai_providers...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.ai_providers (
                id TEXT PRIMARY KEY, -- 'openai', 'anthropic'
                name TEXT NOT NULL,
                logo_url TEXT,
                capabilities JSONB DEFAULT '{}'::jsonb,
                base_url TEXT,
                models TEXT[] -- Array of model IDs
            );
        `);
        await client.query('ALTER TABLE public.ai_providers DISABLE ROW LEVEL SECURITY');

        // 2. Create AI Credentials Table
        console.log('Creating table public.ai_credentials...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.ai_credentials (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                organization_id UUID NOT NULL, -- Logical link, no foreign key enforce to avoid seeding issues
                provider_id TEXT NOT NULL REFERENCES public.ai_providers(id),
                api_key_encrypted TEXT NOT NULL,
                priority INTEGER DEFAULT 999,
                status TEXT DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'disabled')),
                last_used TIMESTAMPTZ
            );
        `);
        await client.query('ALTER TABLE public.ai_credentials DISABLE ROW LEVEL SECURITY');

        // 3. Seed Providers
        console.log('Seeding Providers...');
        const providers = [
            {
                id: 'openai',
                name: 'OpenAI',
                logo_url: '/integrations/openai.svg',
                capabilities: { stream: true, tools: true, json_mode: true, vision: true },
                base_url: 'https://api.openai.com/v1',
                models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']
            },
            {
                id: 'anthropic',
                name: 'Anthropic',
                logo_url: '/integrations/anthropic.svg',
                capabilities: { stream: true, tools: true, json_mode: true, vision: true },
                base_url: 'https://api.anthropic.com/v1',
                models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
            },
            {
                id: 'groq',
                name: 'Groq',
                logo_url: '/integrations/groq.svg',
                capabilities: { stream: true, tools: true, json_mode: true, vision: false },
                base_url: 'https://api.groq.com/openai/v1',
                models: ['llama3-70b-8192', 'mixtral-8x7b-32768']
            },
            {
                id: 'google',
                name: 'Google Gemini',
                logo_url: '/integrations/google.svg',
                capabilities: { stream: true, tools: false, json_mode: true, vision: true },
                base_url: 'https://generativelanguage.googleapis.com/v1beta',
                models: ['gemini-1.5-pro']
            }
        ];

        for (const p of providers) {
            await client.query(`
                INSERT INTO public.ai_providers (id, name, logo_url, capabilities, base_url, models)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO UPDATE 
                SET 
                    name = EXCLUDED.name,
                    capabilities = EXCLUDED.capabilities,
                    models = EXCLUDED.models;
            `, [p.id, p.name, p.logo_url, p.capabilities, p.base_url, p.models]);
        }
        console.log('✅ AI Providers Seeded.');

    } catch (err) {
        console.error('❌ Error seeding AI:', err.message);
    } finally {
        await client.end();
    }
}

seedAIInfrastructure();

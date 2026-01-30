const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function seedIntegrations() {
    // const pid = removed;
    // const pass = removed;
    // const r = removed;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require',
    });

    try {
        await client.connect();
        console.log('--- SEEDING INTEGRATIONS ---');

        // 1. Create Table
        console.log('Creating table public.integrations...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.integrations (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                key TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                icon_url TEXT,
                category TEXT,
                is_active BOOLEAN DEFAULT true,
                metadata JSONB DEFAULT '{}'::jsonb
            );
        `);

        // 2. Disable RLS (Nuclear Option for Sandbox)
        console.log('Disabling RLS on integrations...');
        await client.query('ALTER TABLE public.integrations DISABLE ROW LEVEL SECURITY');

        // 3. Seed Data (Matching Production)
        const integrations = [
            {
                key: 'meta_business', // Standardized: Matches UI
                name: 'Meta Business Suite',
                description: 'Conexión Omnicanal Unificada: Instagram, Facebook Messenger y WhatsApp Business API en una sola integración.',
                category: 'messaging',
                icon_url: '/integrations/meta.svg'
            },
            {
                key: 'whatsapp_cloud_api',
                name: 'WhatsApp Cloud API',
                description: 'Envía y recibe mensajes de WhatsApp Business API. Requiere configurar un número de teléfono en Meta.',
                category: 'messaging',
                icon_url: '/integrations/whatsapp.svg'
            },
            {
                key: 'telegram_bot',
                name: 'Telegram',
                description: 'Conecta un bot de telegram para atención automatizada y en vivo.',
                category: 'messaging',
                icon_url: '/integrations/telegram.svg'
            },
            {
                key: 'twilio_sms',
                name: 'Twilio SMS',
                description: 'Envía y recibe SMS tradicionales mediante Twilio.',
                category: 'messaging',
                icon_url: '/integrations/twilio.svg'
            },
            {
                key: 'stripe', // Standardized
                name: 'Stripe',
                description: 'Procesa pagos y suscripciones con Stripe.',
                category: 'payments',
                icon_url: '/integrations/stripe.svg'
            },
            {
                key: 'google_calendar',
                name: 'Google Calendar',
                description: 'Sincroniza tus citas y agendamientos con tu calendario.',
                category: 'productivity',
                icon_url: '/integrations/google_calendar.svg'
            },
            {
                key: 'wompi_payments',
                name: 'Wompi',
                description: 'Pasarela de pagos para recaudo automático de facturas en Colombia.',
                category: 'payments',
                icon_url: '/integrations/wompi.svg'
            },
            {
                key: 'openai', // Standardized: Matches UI
                name: 'OpenAI',
                description: 'Modelos GPT-3.5 y GPT-4 para generación de texto y análisis.',
                category: 'ai',
                icon_url: '/integrations/openai.svg'
            },
            {
                key: 'anthropic', // Added Missing
                name: 'Anthropic',
                description: 'Modelos Claude 3 para razonamiento avanzado y contexto largo.',
                category: 'ai',
                icon_url: '/integrations/anthropic.svg'
            },
            {
                key: 'groq', // Added Missing
                name: 'Groq',
                description: 'Inferencia LPU ultra-rápida para modelos open source.',
                category: 'ai',
                icon_url: '/integrations/groq.svg'
            },
            {
                key: 'woocommerce',
                name: 'WooCommerce',
                description: 'Sincroniza tu catálogo de productos y pedidos.',
                category: 'ecommerce',
                icon_url: '/integrations/woocommerce.svg'
            }
        ];

        console.log('Inserting data...');
        for (const integ of integrations) {
            await client.query(`
                INSERT INTO public.integrations (key, name, description, category, icon_url)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (key) DO UPDATE 
                SET 
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    category = EXCLUDED.category,
                    icon_url = EXCLUDED.icon_url;
            `, [integ.key, integ.name, integ.description, integ.category, integ.icon_url]);
        }

        console.log(`✅ Seeded ${integrations.length} integrations.`);

    } catch (err) {
        console.error('❌ Error seeding:', err.message);
    } finally {
        await client.end();
    }
}

seedIntegrations();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://amwlwmkejdjskukdfwut.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd2x3bWtlamRqc2t1a2Rmd3V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTg0ODY5NSwiZXhwIjoyMDgxNDI0Njk1fQ.r6qkZ37-B82CcKEZlIPi8ZRAaHQa8_aOoMAoCTiKCPQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedMockTransactions() {
    console.log('Iniciando seed de transacciones mock...');

    const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .ilike('name', '%retail%');

    if (orgError) {
        console.error('Error buscando organización:', orgError);
        return;
    }

    if (!orgs || orgs.length === 0) {
        console.error('No se encontró la organización Retail Space');
        return;
    }

    const org = orgs[0];
    console.log(`Usando organización: ${org.name} (${org.id})`);

    const mockData = [
        {
            organization_id: org.id,
            reference: `MOCK-RETAIL-JAN-${Math.random().toString(36).substring(7)}`,
            amount_in_cents: 2900,
            currency: 'USD',
            status: 'APPROVED',
            invoice_ids: [],
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            metadata: {
                type: 'subscription_payment',
                concept: `Renovación Mensual: ${org.name} (Enero 2026)`,
                gateway: 'wompi'
            }
        },
        {
            organization_id: org.id,
            reference: `MOCK-RETAIL-DEC-${Math.random().toString(36).substring(7)}`,
            amount_in_cents: 2900,
            currency: 'USD',
            status: 'APPROVED',
            invoice_ids: [],
            created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            metadata: {
                type: 'subscription_payment',
                concept: `Renovación Mensual: ${org.name} (Diciembre 2025)`,
                gateway: 'wompi'
            }
        }
    ];

    const { data, error } = await supabase.from('payment_transactions').insert(mockData).select();

    if (error) {
        console.error('Error insertando mocks:', JSON.stringify(error, null, 2));
    } else {
        console.log('Mocks de facturación insertados con éxito:', data);
    }
}

seedMockTransactions();

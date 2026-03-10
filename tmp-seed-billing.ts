import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { supabaseAdmin } from './src/lib/supabase-admin';

async function seedMockTransactions() {
    const { data: orgs } = await supabaseAdmin
        .from('organizations')
        .select('id, name')
        .ilike('name', '%retail%');

    if (!orgs || orgs.length === 0) {
        console.error('No se encontró la organización Retail Space');
        return;
    }

    const org = orgs[0];
    console.log(`Usando organización: ${org.name} (${org.id})`);

    const mockData = [
        {
            organization_id: org.id,
            reference: `MOCK-PAY-RETAIL-01-${Date.now()}`,
            amount_in_cents: 2900,
            currency: 'USD',
            status: 'APPROVED',
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Hace 30 días
            metadata: {
                type: 'subscription_payment',
                concept: 'Renovación Mensual: Retail Space (Enero)',
                gateway: 'wompi'
            }
        },
        {
            organization_id: org.id,
            reference: `MOCK-PAY-RETAIL-02-${Date.now()}`,
            amount_in_cents: 2900,
            currency: 'USD',
            status: 'APPROVED',
            created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // Hace 60 días
            metadata: {
                type: 'subscription_payment',
                concept: 'Renovación Mensual: Retail Space (Diciembre)',
                gateway: 'wompi'
            }
        }
    ];

    const { error } = await supabaseAdmin.from('payment_transactions').insert(mockData);

    if (error) {
        console.error('Error insertando mocks:', error);
    } else {
        console.log('Mocks de facturación insertados con éxito para Retail Space.');
    }
}

seedMockTransactions();

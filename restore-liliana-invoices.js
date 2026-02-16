const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreLilianaInvoices() {
    console.log('--- RESTORE LILIANA INVOICES ---');
    const clientId = '95e7f87f-d209-44d6-8b33-497b06c72a51';
    const orgId = 'db9d1288-80ab-48df-b130-a0739881c6f2'; // From previous logs

    const invoicesToRestore = [
        {
            number: 'INV-1771180277021-VCD',
            total: 1086000,
            status: 'pending',
            date: '2026-02-15T18:31:17.021Z', // Approx based on ID
            items: [{ description: "Consolidado (Restaurado)", price: 1086000, quantity: 1 }]
        },
        {
            number: 'INV-1771129680504-SX6',
            total: 388000,
            status: 'pending',
            date: '2026-02-15T04:28:00.504Z',
            items: [{ description: "CRM Empresarial (Restaurado)", price: 388000, quantity: 1 }]
        },
        {
            number: 'INV-1768494210446-JJ1',
            total: 310000,
            status: 'pending',
            date: '2026-01-15T16:23:30.446Z',
            items: [{ description: "Item desconocido Restored", price: 310000, quantity: 1 }]
        },
        {
            number: 'INV-1768494167219-160',
            total: 388000,
            status: 'pending',
            date: '2026-01-15T16:22:47.219Z',
            items: [{ description: "Chatender Restored", price: 388000, quantity: 1 }]
        }
    ];

    for (const inv of invoicesToRestore) {
        console.log(`Restoring ${inv.number}...`);

        // Check if exists first to avoid duplicates if I ran this twice
        const { data: existing } = await supabase.from('invoices').select('id').eq('number', inv.number).maybeSingle();

        if (!existing) {
            const { error } = await supabase.from('invoices').insert({
                client_id: clientId,
                organization_id: orgId,
                number: inv.number,
                total: inv.total,
                status: inv.status,
                items: inv.items,
                date: new Date().toISOString(), // Use now or try to backdate if crucial
                due_date: new Date(Date.now() + 5 * 86400000).toISOString(),
                document_type: 'CUENTA_DE_COBRO'
            });

            if (error) console.error(`Error restoring ${inv.number}:`, error);
            else console.log(`SUCCESS: Restored ${inv.number}`);
        } else {
            console.log(`Skipped ${inv.number} (Already exists)`);
        }
    }
}

restoreLilianaInvoices();

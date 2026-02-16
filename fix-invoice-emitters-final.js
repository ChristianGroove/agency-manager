const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixInvoiceEmittersFinal() {
    console.log('--- FIX FINAL: Invoice Emitters ---');

    // Target: Cristian Camilo Gomez Penagos
    const targetEmitterId = '714ac2a0-82c8-4410-b3f7-a38efb3a0c3b';

    // Scan window: Since Feb 13
    const recent = new Date('2026-02-13T00:00:00Z');

    // 1. Get Invoices needing fix (NULL or Karla or Wrong Cristian)
    // User said "todas las facturas generadas hoy".
    // We found 34 NULLs in the usage script.

    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, emitter_id')
        .gte('created_at', recent.toISOString());

    console.log(`Checking ${invoices.length} recent invoices...`);

    let updatedCount = 0;

    for (const inv of invoices) {
        if (inv.emitter_id !== targetEmitterId) {
            console.log(`Updating ${inv.number} (Was: ${inv.emitter_id}) -> Cristian (${targetEmitterId})`);

            const { error } = await supabase
                .from('invoices')
                .update({ emitter_id: targetEmitterId })
                .eq('id', inv.id);

            if (!error) updatedCount++;
            else console.log(`Error: ${error.message}`);
        }
    }

    console.log(`\nSuccessfully updated ${updatedCount} invoices to Cristian Camilo Gomez Penagos.`);
}

fixInvoiceEmittersFinal();

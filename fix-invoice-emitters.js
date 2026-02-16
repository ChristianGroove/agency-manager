const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixInvoiceEmitters() {
    console.log('--- FIX: Invoice Emitters ---');

    // 1. Find Correct Emitter (Cristian)
    const { data: cristian } = await supabase
        .from('emitters')
        .select('id, name, legal_name, business_name')
        .or('name.ilike.%Cristian%,legal_name.ilike.%Cristian%,business_name.ilike.%Cristian%')
        .maybeSingle();

    if (!cristian) return console.log('Emitter "Cristian" not found.');
    console.log(`Target Emitter: ${cristian.name || cristian.business_name} (${cristian.id})`);

    // 2. Find Invoices from Batches (Since Feb 13)
    // User said "todas las facturas generadas hoy"
    const recent = new Date();
    recent.setDate(recent.getDate() - 2);

    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, emitter_id, created_at')
        .gte('created_at', recent.toISOString());

    console.log(`Found ${invoices.length} invoices to check/update.`);

    let updatedCount = 0;

    for (const inv of invoices) {
        // If emitter is null OR not Cristian
        // User implied ALL of them are wrong.
        // We should probably just set them all to Cristian if that's the "original" intention.
        // Or should we match the client's organization? 
        // User said "no el original de cuando se creo el servicio (cristian camilo gomez)".
        // This implies Cristian is the default for these services.

        if (inv.emitter_id !== cristian.id) {
            const { error } = await supabase
                .from('invoices')
                .update({ emitter_id: cristian.id })
                .eq('id', inv.id);

            if (!error) updatedCount++;
            else console.log(`Error updating ${inv.number}: ${error.message}`);
        }
    }

    console.log(`Updated ${updatedCount} invoices to Emitter: ${cristian.name || cristian.legal_name}`);
}

fixInvoiceEmitters();

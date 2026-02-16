const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOliverEmitterTargeted() {
    console.log('--- FIX: Oliver Emitter Targeted ---');
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';
    // Penagos
    const targetEmitterId = '714ac2a0-82c8-4410-b3f7-a38efb3a0c3b';

    // Find invoices for Oliver created since Feb 1 (to catch the backdated ones)
    const recent = new Date('2026-02-01T00:00:00Z');

    // We specifically want to fix the ones that are NOT Penagos
    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, emitter_id, date, created_at')
        .eq('client_id', clientId)
        .gte('created_at', recent.toISOString());

    console.log(`Found ${invoices?.length || 0} invoices for Oliver with incorrect emitter.`);

    if (invoices) {
        for (const inv of invoices) {
            console.log(`Updating ${inv.number} (Date: ${inv.date}) -> To Cristian Penagos`);
            await supabase
                .from('invoices')
                .update({ emitter_id: targetEmitterId })
                .eq('id', inv.id);
        }
    }
}

fixOliverEmitterTargeted();

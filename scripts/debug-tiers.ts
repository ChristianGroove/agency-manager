
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env tables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('--- Branding Tiers ---');
    const { data: tiers, error } = await supabase
        .from('branding_tiers')
        .select('name, capabilities');

    if (tiers) {
        tiers.forEach(t => {
            console.log(`Tier: ${t.name}`);
            console.log('Capabilities:', JSON.stringify(t.capabilities, null, 2));
        });
    } else {
        console.error('Error fetching tiers:', error);
    }

    console.log('\n--- Carnaval Org Capabilities ---');
    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('name, capabilities, branding_tier_id')
        .ilike('name', '%Carnaval%')
        .single();

    if (org) {
        console.log(`Org: ${org.name}`);
        console.log(`Tier ID: ${org.branding_tier_id}`);
        console.log('Capabilities:', JSON.stringify(org.capabilities, null, 2));
    } else {
        console.error('Error fetching org:', orgError);
    }
}

main();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env tables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const orgName = process.argv[2] || 'Carnaval';
    console.log(`Searching for org: ${orgName}`);

    const { data: orgs, error } = await supabase
        .from('organizations')
        .select('id, name, organization_type, parent_organization_id')
        .ilike('name', `%${orgName}%`);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!orgs || orgs.length === 0) {
        console.log('No orgs found');
        return;
    }

    orgs.forEach(async (org) => {
        console.log('---');
        console.log(`ID: ${org.id}`);
        console.log(`Name: ${org.name}`);
        console.log(`Type: ${org.organization_type}`);
        console.log(`Parent: ${org.parent_organization_id}`);

        // Fetch manual overrides
        const { data: orgData } = await supabase
            .from('organizations')
            .select('manual_module_overrides, vertical_key')
            .eq('id', org.id)
            .single();

        console.log('Manual Overrides:', orgData?.manual_module_overrides);
        console.log('Vertical Key:', orgData?.vertical_key);
        console.log('---');
    });

    // Check user platform role as well if needed, but sidebar uses org    // Check specific user for platform role (Owner of Carnaval: 27a2a607-b7c5-4e6e-97e5-7f2441cbcadd)
    const userId = '27a2a607-b7c5-4e6e-97e5-7f2441cbcadd';
    const { data: profile } = await supabase.from('profiles').select('platform_role').eq('id', userId).single();
    console.log(`User ${userId} Platform Role: ${profile?.platform_role}`);
}

main();

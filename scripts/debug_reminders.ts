
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    console.log("⚡ TESTING REMINDERS...");

    // 1. Setup Context
    console.log("   Introspecting Invoices...");
    const { data: samples, error: sampleErr } = await supabase
        .from('invoices')
        .select('*')
        .limit(1);

    if (sampleErr) {
        console.log("   ❌ Select Error:", sampleErr.message);
    } else if (samples && samples.length > 0) {
        console.log("   ✅ Invoice Sample Keys:", Object.keys(samples[0]));
    } else {
        console.log("   ⚠️ No invoices found to inspect. Table exists but empty/RLS?");
    }

    // Proceed to create if needed
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single();
    if (!org) { console.error("No Org"); return; }

    const { data: member } = await supabase.from('organization_members').select('user_id').eq('organization_id', org.id).limit(1).single();

    let clientId;
    const { data: client } = await supabase.from('clients').select('id').eq('organization_id', org.id).limit(1).single();
    if (client) clientId = client.id;
    else {
        const { data: newClient } = await supabase.from('clients').insert({ name: 'Reminder Test Client', organization_id: org.id }).select('id').single();
        if (!newClient) throw new Error("Failed to create test client");
        clientId = newClient.id;
    }

    // 2. Create Invoice
    const { data: invoice, error: invError } = await supabase.from('invoices').insert({
        organization_id: org.id,
        client_id: clientId,
        status: 'pending',
        total_amount: 1000,
        due_date: new Date().toISOString()
    }).select('id').single();

    if (invError) {
        console.error("❌ Invoice Creation Failed:", invError.message);
        return;
    }

    console.log("✅ Created Invoice:", invoice.id);

    // 3. Invoke Action
    try {
        const { sendPaymentReminderAction } = await import('../src/modules/assistant/actions/sendPaymentReminder.action');

        if (!member) throw new Error("No organization member found");
        const context = {
            tenant_id: org.id,
            user_id: member.user_id,
            space_id: org.id
        };

        const result = await sendPaymentReminderAction(
            { invoice_id: invoice.id },
            context as any,
            supabase
        );

        console.log("✅ ACTION SUCCESS:", result);

    } catch (e: any) {
        console.error("❌ ACTION FAILED:", e.message);
        if (e.stack) console.error(e.stack);
    }
}

run();

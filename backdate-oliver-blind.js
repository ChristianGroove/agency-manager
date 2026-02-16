const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function backdateOliverBlind() {
    console.log('--- Backdate Oliver Blind ---');
    const clientId = 'f9989878-a960-4e49-9b10-ecd0998317e5';
    const recent = new Date();
    recent.setDate(recent.getDate() - 2);

    // 1. Update Growth Sprint -> Feb 12
    // We need to fetch ID first to update safely matching description
    const { data: invGrowth } = await supabase
        .from('invoices')
        .select('id, number, items')
        .eq('client_id', clientId)
        .gte('created_at', recent.toISOString());

    let growthCount = 0;
    let designCount = 0;

    if (invGrowth) {
        for (const invoice of invGrowth) {
            const desc = invoice.items[0]?.description || '';

            if (desc.includes('Growth') || desc.includes('Sprint')) {
                console.log(`Updating Growth Invoice: ${invoice.number} -> 2026-02-12`);
                await supabase.from('invoices').update({
                    date: '2026-02-12T05:00:00.000Z',
                    created_at: '2026-02-12T05:00:00.000Z',
                    due_date: '2026-02-12T05:00:00.000Z'
                }).eq('id', invoice.id);
                // Cycle
                const startDate = '2026-01-12T05:00:00.000Z';
                const endDate = '2026-02-12T05:00:00.000Z';
                // Find cycle
                const { data: cycle } = await supabase.from('billing_cycles').select('id').eq('invoice_id', invoice.id).maybeSingle();
                if (cycle) {
                    await supabase.from('billing_cycles').update({ start_date: startDate, end_date: endDate }).eq('id', cycle.id);
                }
                growthCount++;
            }

            if (desc.includes('Diseño') || desc.includes('Design')) {
                console.log(`Updating Design Invoice: ${invoice.number} -> 2026-02-05`);
                await supabase.from('invoices').update({
                    date: '2026-02-05T05:00:00.000Z',
                    created_at: '2026-02-05T05:00:00.000Z',
                    due_date: '2026-02-05T05:00:00.000Z'
                }).eq('id', invoice.id);
                // Cycle
                const startDate = '2026-01-05T05:00:00.000Z';
                const endDate = '2026-02-05T05:00:00.000Z';
                const { data: cycle } = await supabase.from('billing_cycles').select('id').eq('invoice_id', invoice.id).maybeSingle();
                if (cycle) {
                    await supabase.from('billing_cycles').update({ start_date: startDate, end_date: endDate }).eq('id', cycle.id);
                }
                designCount++;
            }
        }
    }

    console.log(`Results: Growth=${growthCount}, Design=${designCount}`);
}

backdateOliverBlind();

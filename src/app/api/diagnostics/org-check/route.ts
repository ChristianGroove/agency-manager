
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Get all conversations with their org IDs
        const { data: convs } = await supabaseAdmin
            .from('conversations')
            .select('id, organization_id, channel, phone, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

        // Get all workflows with their org IDs
        const { data: workflows } = await supabaseAdmin
            .from('workflows')
            .select('id, name, organization_id, is_active, trigger_type')
            .eq('is_active', true);

        return NextResponse.json({
            conversations: convs,
            workflows: workflows
        });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

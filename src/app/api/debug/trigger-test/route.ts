
import { NextRequest, NextResponse } from "next/server";
import { automationTrigger } from "@/modules/core/automation/automation-trigger.service";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { message, conversationId, sender, channel, leadId } = body;

        console.log(`[DebugAPI] Triggering Automation for: ${message}`);

        // Call the service directly
        await automationTrigger.evaluateInput(message, conversationId, channel, sender, leadId || 'lead_debug_123');

        // Wait a bit to let async fire-and-forget start (not complete)
        await new Promise(resolve => setTimeout(resolve, 500));

        return NextResponse.json({ success: true, message: "Trigger initiated" });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

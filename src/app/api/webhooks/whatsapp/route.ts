import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// Security: Verify Secret?
// Evolution sends `apikey` in headers if configured? Or we should check payload.
// For now, we trust the obscure URL and maybe valid payload structure.
// Better: Check valid instance in DB.

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { type, instance, data } = body

        // Log Incoming Webhook (Debug)
        // console.log('[Webhook:WhatsApp] Received:', { type, instance })

        if (!instance) {
            return NextResponse.json({ status: 'ignored' })
        }

        // 1. Connection Update
        if (type === 'connection.update') {
            const { state, statusReason } = data
            // State: "open", "close", "connecting"

            // Map Evolution State to Channel Status
            let channelStatus = 'unknown'
            if (state === 'open') channelStatus = 'active'
            if (state === 'close') channelStatus = 'disconnected'
            if (state === 'connecting') channelStatus = 'connecting'

            // Update DB
            // We need to find the channel with this instanceName
            // We store instanceName in credentials->instanceName

            // SECURITY: Use Admin Client to bypass RLS (Webhook is system actor)
            const { data: channel, error } = await supabaseAdmin
                .from('integration_connections')
                .select('id, organization_id')
                .contains('credentials', { instanceName: instance })
                .single()

            if (channel) {
                await supabaseAdmin
                    .from('integration_connections')
                    .update({
                        status: channelStatus,
                        last_synced_at: new Date().toISOString()
                    })
                    .eq('id', channel.id)

                console.log(`[Webhook:WhatsApp] Updated Channel ${channel.id} to ${channelStatus}`)
            } else {
                console.warn(`[Webhook:WhatsApp] Channel not found for instance: ${instance}`)
            }
        }

        // 2. Messages (Upsert)
        // Delegate to InboxService (Future/Existing Phase)
        // Implementation note: "Encolar mensajes" - for now just acknowledge.

        return NextResponse.json({ status: 'ok' })

    } catch (error: any) {
        console.error('[Webhook:WhatsApp] Error:', error)
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
    }
}

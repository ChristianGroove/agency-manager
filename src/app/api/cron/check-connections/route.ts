import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { checkConnectionHealth } from "@/modules/core/channels/connection-health"

/**
 * Cron endpoint to check health of all active WhatsApp connections.
 * Recommended: Run every 5-15 minutes via Vercel Cron or external scheduler.
 */
export async function GET(request: Request) {
    // Verify cron secret (optional security)
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron:CheckConnections] Starting health check cycle...')

    try {
        // Get all active connections across all organizations
        const { data: connections, error } = await supabaseAdmin
            .from('integration_connections')
            .select('id, organization_id, connection_name, provider_key')
            .neq('status', 'deleted')
            .order('last_synced_at', { ascending: true, nullsFirst: true }) // Oldest first

        if (error) {
            console.error('[Cron:CheckConnections] Error fetching connections:', error)
            return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
        }

        if (!connections || connections.length === 0) {
            return NextResponse.json({
                message: 'No connections to check',
                checked: 0
            })
        }

        // Check each connection
        const results: { id: string; status: string; message?: string }[] = []
        let healthy = 0
        let issues = 0

        for (const conn of connections) {
            try {
                const health = await checkConnectionHealth(conn.id)
                results.push({
                    id: conn.id,
                    status: health.status,
                    message: health.message
                })

                if (health.status === 'active') {
                    healthy++
                } else {
                    issues++
                    console.log(`[Cron:CheckConnections] Issue detected: ${conn.connection_name} (${conn.id}) - ${health.status}`)
                }
            } catch (err: any) {
                console.error(`[Cron:CheckConnections] Error checking ${conn.id}:`, err)
                results.push({
                    id: conn.id,
                    status: 'error',
                    message: err.message
                })
                issues++
            }
        }

        console.log(`[Cron:CheckConnections] Completed. Checked: ${connections.length}, Healthy: ${healthy}, Issues: ${issues}`)

        return NextResponse.json({
            success: true,
            checked: connections.length,
            healthy,
            issues,
            timestamp: new Date().toISOString()
        })

    } catch (error: any) {
        console.error('[Cron:CheckConnections] Unexpected error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

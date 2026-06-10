import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { checkConnectionHealth } from "@/modules/features/channels/connection-health"
import { isProductionRuntime, requireCronSecret } from "@/app/api/_guards/request-guards"

const PUBLIC_CHECK_CONNECTIONS_ERROR = 'Connection health cron failed'

function logCheckConnectionsError(label: string, error: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error })
}

function checkConnectionsErrorMessage(error: unknown) {
    if (isProductionRuntime()) {
        return PUBLIC_CHECK_CONNECTIONS_ERROR
    }

    if (error instanceof Error && error.message) {
        return error.message
    }

    if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        return (error as any).message
    }

    return PUBLIC_CHECK_CONNECTIONS_ERROR
}

/**
 * Cron endpoint to check health of all active WhatsApp connections.
 * Recommended: Run every 5-15 minutes via Vercel Cron or external scheduler.
 */
export async function GET(request: Request) {
    const unauthorized = requireCronSecret(request)
    if (unauthorized) return unauthorized

    console.log('[Cron:CheckConnections] Starting health check cycle...')

    try {
        // Get all active connections across all organizations
        const { data: connections, error } = await supabaseAdmin
            .from('integration_connections')
            .select('id, organization_id, connection_name, provider_key')
            .neq('status', 'deleted')
            .order('last_synced_at', { ascending: true, nullsFirst: true }) // Oldest first

        if (error) {
            logCheckConnectionsError('[Cron:CheckConnections] Error fetching connections:', error)
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
                logCheckConnectionsError(`[Cron:CheckConnections] Error checking ${conn.id}:`, err)
                results.push({
                    id: conn.id,
                    status: 'error',
                    message: checkConnectionsErrorMessage(err)
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
        logCheckConnectionsError('[Cron:CheckConnections] Unexpected error:', error)
        return NextResponse.json({ error: checkConnectionsErrorMessage(error) }, { status: 500 })
    }
}

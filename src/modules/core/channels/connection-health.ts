"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { integrationRegistry } from "@/modules/core/integrations/registry"
import { decryptObject } from "@/modules/core/integrations/encryption"

/**
 * Check health of a single connection
 */
export async function checkConnectionHealth(connectionId: string): Promise<{
    status: 'active' | 'disconnected' | 'error' | 'unknown'
    message?: string
}> {
    const { data: connection, error } = await supabaseAdmin
        .from('integration_connections')
        .select('id, provider_key, credentials, status')
        .eq('id', connectionId)
        .single()

    if (error || !connection) {
        return { status: 'error', message: 'Connection not found' }
    }

    const adapter = integrationRegistry.getAdapter(connection.provider_key)
    if (!adapter || !adapter.checkConnectionStatus) {
        return { status: 'unknown', message: 'No health check available for this provider' }
    }

    try {
        const credentials = decryptObject(connection.credentials)
        const result = await adapter.checkConnectionStatus(credentials)

        const newStatus = result.status === 'active' ? 'active' : 'disconnected'

        // Update status in DB
        await supabaseAdmin
            .from('integration_connections')
            .update({
                status: newStatus,
                last_synced_at: new Date().toISOString()
            })
            .eq('id', connectionId)

        return {
            status: newStatus as any,
            message: result.message || (newStatus === 'active' ? 'Connection healthy' : 'Connection issues detected')
        }
    } catch (error: any) {
        console.error(`[HealthCheck] Error checking connection ${connectionId}:`, error)

        // Mark as error
        await supabaseAdmin
            .from('integration_connections')
            .update({ status: 'error' })
            .eq('id', connectionId)

        return { status: 'error', message: error.message }
    }
}

/**
 * Check health of all active connections for an organization
 */
export async function checkAllConnectionsHealth(organizationId: string): Promise<{
    checked: number
    healthy: number
    issues: number
    results: { id: string; name: string; status: string; message?: string }[]
}> {
    const { data: connections } = await supabaseAdmin
        .from('integration_connections')
        .select('id, connection_name, provider_key')
        .eq('organization_id', organizationId)
        .neq('status', 'deleted')

    if (!connections || connections.length === 0) {
        return { checked: 0, healthy: 0, issues: 0, results: [] }
    }

    const results: { id: string; name: string; status: string; message?: string }[] = []
    let healthy = 0
    let issues = 0

    for (const conn of connections) {
        const health = await checkConnectionHealth(conn.id)
        results.push({
            id: conn.id,
            name: conn.connection_name,
            status: health.status,
            message: health.message
        })

        if (health.status === 'active') {
            healthy++
        } else {
            issues++
        }
    }

    return {
        checked: connections.length,
        healthy,
        issues,
        results
    }
}

/**
 * Get unhealthy connections (for dashboard alerts)
 */
export async function getUnhealthyConnections(organizationId: string): Promise<{
    id: string
    connection_name: string
    status: string
    provider_key: string
}[]> {
    const { data } = await supabaseAdmin
        .from('integration_connections')
        .select('id, connection_name, status, provider_key')
        .eq('organization_id', organizationId)
        .in('status', ['disconnected', 'error', 'expired'])

    return data || []
}

"use server"

import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { integrationRegistry } from "@/modules/infrastructure/integrations/registry"
import { decryptObject } from "@/modules/infrastructure/integrations/encryption"

const PUBLIC_CONNECTION_HEALTH_ERROR = 'Connection health check failed'

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV
}

function logConnectionHealthError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error })
}

function connectionHealthMessage(
    status: 'active' | 'disconnected' | 'error' | 'unknown',
    message?: string
) {
    if (isDeployedRuntime()) {
        if (status === 'active') return 'Connection healthy'
        if (status === 'disconnected') return 'Connection issues detected'
        if (status === 'unknown') return 'No health check available for this provider'
        return PUBLIC_CONNECTION_HEALTH_ERROR
    }

    return message || (
        status === 'active'
            ? 'Connection healthy'
            : status === 'disconnected'
                ? 'Connection issues detected'
                : status === 'unknown'
                    ? 'No health check available for this provider'
                    : PUBLIC_CONNECTION_HEALTH_ERROR
    )
}

/**
 * Check health of a single connection
 */
export async function checkConnectionHealth(connectionId: string, organizationId?: string): Promise<{
    status: 'active' | 'disconnected' | 'error' | 'unknown'
    message?: string
}> {
    let connectionQuery = supabaseAdmin
        .from('integration_connections')
        .select('id, provider_key, credentials, status')
        .eq('id', connectionId)

    if (organizationId) {
        connectionQuery = connectionQuery.eq('organization_id', organizationId)
    }

    const { data: connection, error } = await connectionQuery.single()

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
        let updateQuery = supabaseAdmin
            .from('integration_connections')
            .update({
                status: newStatus,
                last_synced_at: new Date().toISOString()
            })
            .eq('id', connectionId)

        if (organizationId) {
            updateQuery = updateQuery.eq('organization_id', organizationId)
        }

        await updateQuery

        return {
            status: newStatus as any,
            message: connectionHealthMessage(newStatus as any, result.message)
        }
    } catch (error: any) {
        logConnectionHealthError(`[HealthCheck] Error checking connection ${connectionId}:`, error)

        // Mark as error
        let updateQuery = supabaseAdmin
            .from('integration_connections')
            .update({ status: 'error' })
            .eq('id', connectionId)

        if (organizationId) {
            updateQuery = updateQuery.eq('organization_id', organizationId)
        }

        await updateQuery

        return { status: 'error', message: connectionHealthMessage('error', error.message) }
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
        const health = await checkConnectionHealth(conn.id, organizationId)
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

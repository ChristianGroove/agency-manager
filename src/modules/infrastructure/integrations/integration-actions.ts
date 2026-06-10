'use server'

import { createClient } from "@/modules/core/database/supabase-server"
import { revalidatePath } from "next/cache"
import { integrationRegistry } from "./registry"

// --- TYPES ---
export interface CreateConnectionParams {
    provider_key: string
    connection_name: string
    credentials: Record<string, any>
    config?: Record<string, any>
    metadata?: Record<string, any>
}

export interface Connection {
    id: string
    organization_id: string
    provider_key: string
    connection_name: string
    status: string
    created_at: string
    last_synced_at: string | null
    metadata: any
    // We purposefully exclude credentials from the return type for security
}

// --- ACTIONS ---
import { encryptObject } from "./encryption"

// --- HELPERS ---

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function sanitizeIntegrationActionLogDetails(details: Record<string, unknown> = {}) {
    const sensitiveKeys = new Set([
        'connectionId',
        'organizationId',
        'userId',
    ])

    return Object.fromEntries(
        Object.entries(details).map(([key, value]) => {
            if (sensitiveKeys.has(key)) {
                return [`${key}Present`, Boolean(value)]
            }

            return [key, value]
        })
    )
}

function summarizeIntegrationActionError(error: unknown) {
    if (error instanceof Error) {
        return { name: error.name }
    }

    if (error && typeof error === 'object') {
        return {
            type: 'object',
            code: (error as { code?: unknown }).code,
            hasMessage: typeof (error as { message?: unknown }).message === 'string',
        }
    }

    return { type: typeof error }
}

function logIntegrationActionInfo(label: string, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        console.log(label, details)
        return
    }

    console.log(label, sanitizeIntegrationActionLogDetails(details))
}

function logIntegrationActionWarning(label: string, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        console.warn(label, details)
        return
    }

    console.warn(label, sanitizeIntegrationActionLogDetails(details))
}

function logIntegrationActionError(label: string, error: unknown, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        if (Object.keys(details).length > 0) console.error(label, error, details)
        else console.error(label, error)
        return
    }

    console.error(label, {
        ...sanitizeIntegrationActionLogDetails(details),
        detail: summarizeIntegrationActionError(error),
    })
}

// --- ACTIONS ---

export async function getConnections() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: "Unauthorized" }

    // Get current user's org (assuming single org context for now or using the session/cookie strategy)
    // We'll rely on RLS integration_connections_view_members to filter by orgs the user belongs to
    const { data, error } = await supabase
        .from('integration_connections')
        .select('id, organization_id, provider_key, connection_name, status, created_at, last_synced_at, metadata')
        .order('created_at', { ascending: false })

    if (error) {
        logIntegrationActionError("Error fetching connections full:", error, { userId: user.id })
        return { error: "Failed to fetch connections" }
    }

    return { data: data as Connection[] }
}

export async function createConnection(params: CreateConnectionParams) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: "Unauthorized" }

    // Get the first organization the user owns/admins to attach this connection to
    // In a real app, this should be passed from the client or context
    const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])
        .limit(1)
        .single()

    if (!orgMember) {
        return { error: "You must be an admin of an organization to connect integrations." }
    }

    // --- INTEGRATION MODULARITY CHECK ---
    const adapter = integrationRegistry.getAdapter(params.provider_key)

    if (adapter) {
        // Validate credentials before connecting
        const verification = await adapter.verifyCredentials(params.credentials)
        if (!verification.isValid) {
            return { error: verification.error || "Invalid credentials provided." }
        }

        // Merge any metadata returned from verification (e.g. account name)
        if (verification.metadata) {
            params.metadata = { ...params.metadata, ...verification.metadata }
        }
    } else {
        // Optional: Block unknown integrations? For now, we allow them but log warning.
        // Or we can enforce strictly that an adapter must exist.
        // Let's fallback to allowing it for flexibility unless strict mode is desired.
        logIntegrationActionWarning("No adapter found. Skipping verification.", { providerKey: params.provider_key })
    }

    // Check if connection with same provider_key already exists for this org
    const { data: existingConn } = await supabase
        .from('integration_connections')
        .select('id')
        .eq('organization_id', orgMember.organization_id)
        .eq('provider_key', params.provider_key)
        .limit(1)
        .single()

    let error: any = null

    if (existingConn) {
        // UPDATE existing connection (e.g. refreshing token)
        const result = await supabase.from('integration_connections').update({
            connection_name: params.connection_name,
            credentials: encryptObject(params.credentials),
            config: params.config || {},
            metadata: params.metadata || {},
            status: 'active',
            last_synced_at: new Date().toISOString()
        })
            .eq('id', existingConn.id)
            .eq('organization_id', orgMember.organization_id)

        error = result.error
        if (!error) {
            logIntegrationActionInfo("[Integrations] Updated existing connection", {
                connectionId: existingConn.id,
                organizationId: orgMember.organization_id,
                providerKey: params.provider_key,
            })
        }
    } else {
        // INSERT new connection
        const result = await supabase.from('integration_connections').insert({
            organization_id: orgMember.organization_id,
            provider_key: params.provider_key,
            connection_name: params.connection_name,
            credentials: encryptObject(params.credentials),
            config: params.config || {},
            metadata: params.metadata || {},
            status: 'active',
            last_synced_at: new Date().toISOString()
        })

        error = result.error
    }

    if (error) {
        logIntegrationActionError("Error creating/updating connection:", error, {
            organizationId: orgMember.organization_id,
            providerKey: params.provider_key,
        })
        return { error: "Failed to create/update connection" }
    }

    revalidatePath('/platform/integrations')
    return { success: true }
}

export async function deleteConnection(connectionId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: "Unauthorized" }

    const { data: orgMemberships, error: membershipError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])

    if (membershipError) {
        console.error("Error validating connection deletion permissions:", membershipError, { userId: user.id })
        return { error: "Failed to delete connection" }
    }

    const organizationIds = (orgMemberships || []).map(member => member.organization_id)

    if (organizationIds.length === 0) {
        return { error: "You must be an admin of an organization to delete integrations." }
    }

    const { data: deletedConn, error } = await supabase
        .from('integration_connections')
        .delete()
        .eq('id', connectionId)
        .in('organization_id', organizationIds)
        .select('organization_id, provider_key')
        .single()

    if (error) {
        return { error: "Failed to delete connection" }
    }

    // Security Log
    if (user && deletedConn) {
        const { SecurityLogger, SecurityAction } = await import('@/modules/core/security/security-logger')
        await SecurityLogger.log({
            organizationId: deletedConn.organization_id,
            actorId: user.id,
            action: SecurityAction.INTEGRATION_DISCONNECTED,
            resourceEntity: 'integration_connections',
            resourceId: connectionId,
            metadata: {
                provider_key: deletedConn.provider_key
            }
        })
    }

    revalidatePath('/platform/integrations')
    return { success: true }
}

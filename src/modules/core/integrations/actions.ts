'use server'

import { createClient } from "@/lib/supabase-server"
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
        console.error("Error fetching connections full:", JSON.stringify(error, null, 2))
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
        console.warn(`No adapter found for provider: ${params.provider_key}. Skipping verification.`)
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
        }).eq('id', existingConn.id)

        error = result.error
        if (!error) {
            console.log(`[Integrations] Updated existing connection: ${existingConn.id}`)
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
        console.error("Error creating/updating connection:", error)
        return { error: "Failed to create/update connection" }
    }

    revalidatePath('/platform/integrations')
    return { success: true }
}

export async function deleteConnection(connectionId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('integration_connections')
        .delete()
        .eq('id', connectionId)

    if (error) {
        return { error: "Failed to delete connection" }
    }

    revalidatePath('/platform/integrations')
    return { success: true }
}

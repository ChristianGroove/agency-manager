import { IntegrationAdapter, ConnectionCredentials, VerificationResult } from "./types"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"

const PUBLIC_BITBUCKET_VERIFICATION_ERROR = "No se pudieron verificar las credenciales de Bitbucket"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function publicBitbucketError(error: unknown, fallback = PUBLIC_BITBUCKET_VERIFICATION_ERROR): string {
    if (isDeployedRuntime()) return fallback
    if (error instanceof Error && error.message) return error.message
    if (typeof error === 'string' && error) return error
    return fallback
}

function getBitbucketAuthHeader(credentials: ConnectionCredentials): string | null {
    if (credentials.token) {
        return `Bearer ${credentials.token}`
    }
    if (credentials.username && (credentials.app_password || credentials.password)) {
        const pass = credentials.app_password || credentials.password
        const encoded = Buffer.from(`${credentials.username}:${pass}`).toString('base64')
        return `Basic ${encoded}`
    }
    return null
}

export class BitbucketAdapter implements IntegrationAdapter {
    key = "bitbucket"

    /**
     * Verifies connection by fetching workspace information from Bitbucket Cloud API
     */
    async verifyCredentials(credentials: ConnectionCredentials): Promise<VerificationResult> {
        const workspace = credentials.workspace?.trim()
        if (!workspace) {
            return { isValid: false, error: "El slug del Workspace de Bitbucket es requerido" }
        }

        const authHeader = getBitbucketAuthHeader(credentials)
        if (!authHeader) {
            return { isValid: false, error: "Se requiere un Access Token o Username + App Password" }
        }

        try {
            const { globalCircuitBreaker } = await import('@/modules/infrastructure/resilience/circuit-breaker')

            return await globalCircuitBreaker.execute('bitbucket_api', async () => {
                const response = await fetch(`https://api.bitbucket.org/2.0/workspaces/${encodeURIComponent(workspace)}`, {
                    headers: {
                        "Authorization": authHeader,
                        "Accept": "application/json"
                    }
                })

                if (response.ok) {
                    const data = await response.json()
                    return {
                        isValid: true,
                        metadata: {
                            workspace: data.slug || workspace,
                            name: data.name,
                            uuid: data.uuid,
                            is_private: data.is_private
                        }
                    }
                } else {
                    const errorData = await response.json().catch(() => ({}))
                    const msg = errorData?.error?.message || `Error en verificación con Bitbucket: ${response.statusText} (${response.status})`
                    return {
                        isValid: false,
                        error: publicBitbucketError(msg)
                    }
                }
            })
        } catch (err: unknown) {
            return { isValid: false, error: publicBitbucketError(err) }
        }
    }

    /**
     * Automatically registers a workspace-level webhook in Bitbucket upon connection.
     * Listens to repo:push, pullrequest events, and commit statuses.
     */
    async onConnect(connectionId: string, credentials: ConnectionCredentials): Promise<void> {
        const workspace = credentials.workspace?.trim()
        const authHeader = getBitbucketAuthHeader(credentials)
        if (!workspace || !authHeader) return

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://app.pixy.agency'
        const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/webhooks/vcs/bitbucket/${connectionId}`

        const webhookPayload: Record<string, any> = {
            description: "Pixy Tasks VCS Integration",
            url: webhookUrl,
            active: true,
            events: [
                "repo:push",
                "pullrequest:created",
                "pullrequest:updated",
                "pullrequest:fulfilled",
                "pullrequest:rejected",
                "repo:commit_status_created",
                "repo:commit_status_updated"
            ]
        }

        let secret = credentials.webhook_secret || credentials.secret
        if (!secret) {
            const cryptoMod = await import('crypto')
            secret = cryptoMod.randomBytes(24).toString('hex')
        }
        webhookPayload.secret = secret

        try {
            const { globalCircuitBreaker } = await import('@/modules/infrastructure/resilience/circuit-breaker')

            await globalCircuitBreaker.execute('bitbucket_webhook_register', async () => {
                const response = await fetch(`https://api.bitbucket.org/2.0/workspaces/${encodeURIComponent(workspace)}/hooks`, {
                    method: 'POST',
                    headers: {
                        "Authorization": authHeader,
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify(webhookPayload)
                })

                if (response.ok) {
                    const data = await response.json()
                    const webhookUuid = data.uuid

                    // Persist webhook UUID in metadata and webhook secret securely in encrypted credentials
                    if (webhookUuid && connectionId) {
                        const { data: conn } = await supabaseAdmin
                            .from('integration_connections')
                            .select('metadata, credentials')
                            .eq('id', connectionId)
                            .single()

                        const currentMetadata = { ...(conn?.metadata || {}) }
                        delete (currentMetadata as any).webhook_secret

                        let currentCreds: Record<string, any> = {}
                        if (conn?.credentials) {
                            try {
                                const { decryptObject } = await import('@/modules/infrastructure/integrations/encryption')
                                currentCreds = decryptObject(conn.credentials) || {}
                            } catch {
                                currentCreds = {}
                            }
                        }

                        let secureCredentials: any = {
                            ...currentCreds,
                            ...credentials,
                            webhook_secret: secret
                        }

                        try {
                            const { encryptObject } = await import('@/modules/infrastructure/integrations/encryption')
                            secureCredentials = encryptObject(secureCredentials)
                        } catch {
                            // In test or environments without encryption key, fallback
                        }

                        await supabaseAdmin
                            .from('integration_connections')
                            .update({
                                metadata: {
                                    ...currentMetadata,
                                    webhook_uuid: webhookUuid,
                                    webhook_url: webhookUrl,
                                    webhook_configured: true
                                },
                                credentials: secureCredentials
                            })
                            .eq('id', connectionId)
                    }
                } else {
                    const errBody = await response.text().catch(() => '')
                    console.warn(`[BitbucketAdapter] No se pudo registrar webhook automático en workspace ${workspace} (${response.status}): ${errBody}. La integración continuará con configuración manual si es necesaria.`)
                }
            })
        } catch (error) {
            console.warn('[BitbucketAdapter] Error en registro de webhook:', error)
        }
    }

    /**
     * Deregisters the workspace webhook in Bitbucket when connection is removed
     */
    async onDisconnect(connectionId: string, credentials: ConnectionCredentials): Promise<void> {
        const workspace = credentials.workspace?.trim()
        const authHeader = getBitbucketAuthHeader(credentials)
        if (!workspace || !authHeader) return

        let webhookUuid = credentials.metadata?.webhook_uuid

        if (!webhookUuid && connectionId) {
            const { data: conn } = await supabaseAdmin
                .from('integration_connections')
                .select('metadata')
                .eq('id', connectionId)
                .single()
            webhookUuid = conn?.metadata?.webhook_uuid
        }

        if (!webhookUuid) return

        try {
            await fetch(`https://api.bitbucket.org/2.0/workspaces/${encodeURIComponent(workspace)}/hooks/${encodeURIComponent(webhookUuid)}`, {
                method: 'DELETE',
                headers: {
                    "Authorization": authHeader
                }
            })
        } catch (error) {
            console.warn('[BitbucketAdapter] Error eliminando webhook de Bitbucket:', error)
        }
    }

    /**
     * Check current connection health
     */
    async checkConnectionStatus(credentials: ConnectionCredentials): Promise<{ status: 'active' | 'inactive' | 'error', message?: string }> {
        const result = await this.verifyCredentials(credentials)
        if (result.isValid) {
            return { status: 'active' }
        }
        return { status: 'error', message: result.error }
    }

    /**
     * List all repositories in workspace for project configuration dropdown
     */
    async getRepositories(credentials: ConnectionCredentials): Promise<Array<{
        full_name: string
        name: string
        slug: string
        is_private: boolean
        html_url: string
        default_branch?: string
    }>> {
        const workspace = credentials.workspace?.trim()
        const authHeader = getBitbucketAuthHeader(credentials)
        if (!workspace || !authHeader) return []

        try {
            const response = await fetch(`https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}?pagelen=100&sort=-updated_on`, {
                headers: {
                    "Authorization": authHeader,
                    "Accept": "application/json"
                }
            })

            if (!response.ok) return []

            const data = await response.json()
            const values = Array.isArray(data.values) ? data.values : []

            return values.map((repo: any) => ({
                full_name: repo.full_name,
                name: repo.name,
                slug: repo.slug,
                is_private: repo.is_private,
                html_url: repo.links?.html?.href || `https://bitbucket.org/${repo.full_name}`,
                default_branch: repo.mainbranch?.name || 'master'
            }))
        } catch (err) {
            console.error('[BitbucketAdapter] Error fetching repositories:', err)
            return []
        }
    }
}

import { IntegrationAdapter, ConnectionCredentials, VerificationResult } from "./types"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"

const PUBLIC_GITHUB_VERIFICATION_ERROR = "No se pudieron verificar las credenciales de GitHub"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function publicGithubError(error: unknown, fallback = PUBLIC_GITHUB_VERIFICATION_ERROR): string {
    if (isDeployedRuntime()) return fallback
    if (error instanceof Error && error.message) return error.message
    if (typeof error === 'string' && error) return error
    return fallback
}

function getGithubHeaders(token: string): Record<string, string> {
    return {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "Pixy-Agency-Manager",
        "X-GitHub-Api-Version": "2022-11-28"
    }
}

export class GithubAdapter implements IntegrationAdapter {
    key = "github"

    /**
     * Verifies connection by checking token against GitHub User and Owner APIs
     */
    async verifyCredentials(credentials: ConnectionCredentials): Promise<VerificationResult> {
        const token = credentials.token?.trim()
        if (!token) {
            return { isValid: false, error: "El token de acceso de GitHub es requerido" }
        }

        const owner = credentials.owner?.trim()

        try {
            const { globalCircuitBreaker } = await import('@/modules/infrastructure/resilience/circuit-breaker')

            return await globalCircuitBreaker.execute('github_api', async () => {
                const headers = getGithubHeaders(token)

                // 1. Verify token with authenticated user endpoint
                const userRes = await fetch("https://api.github.com/user", { headers })

                if (!userRes.ok) {
                    const errData = await userRes.json().catch(() => ({}))
                    const msg = errData?.message || `Error en verificación con GitHub: ${userRes.statusText} (${userRes.status})`
                    return {
                        isValid: false,
                        error: publicGithubError(msg)
                    }
                }

                const userData = await userRes.json()
                let targetOwner = owner || userData.login
                let avatarUrl = userData.avatar_url
                let isOrg = false

                // 2. If owner is provided and differs from authenticated user, verify owner as org or user
                if (owner) {
                    const orgRes = await fetch(`https://api.github.com/orgs/${encodeURIComponent(owner)}`, { headers })
                    if (orgRes.ok) {
                        const orgData = await orgRes.json()
                        targetOwner = orgData.login || owner
                        avatarUrl = orgData.avatar_url || avatarUrl
                        isOrg = true
                    } else {
                        const ownerUserRes = await fetch(`https://api.github.com/users/${encodeURIComponent(owner)}`, { headers })
                        if (ownerUserRes.ok) {
                            const ownerUserData = await ownerUserRes.json()
                            targetOwner = ownerUserData.login || owner
                            avatarUrl = ownerUserData.avatar_url || avatarUrl
                            isOrg = false
                        } else {
                            return {
                                isValid: false,
                                error: publicGithubError(`No se encontró la organización o cuenta de usuario "${owner}" en GitHub`)
                            }
                        }
                    }
                }

                return {
                    isValid: true,
                    metadata: {
                        owner: targetOwner,
                        login: userData.login,
                        name: userData.name || targetOwner,
                        avatar_url: avatarUrl,
                        html_url: userData.html_url,
                        is_org: isOrg
                    }
                }
            })
        } catch (err: unknown) {
            return { isValid: false, error: publicGithubError(err) }
        }
    }

    /**
     * Lists up to 100 repositories for project configuration dropdown
     */
    async getRepositories(credentials: ConnectionCredentials): Promise<Array<{
        full_name: string
        name: string
        slug: string
        is_private: boolean
        html_url: string
        default_branch?: string
    }>> {
        const token = credentials.token?.trim()
        if (!token) return []

        const owner = credentials.owner?.trim()
        const headers = getGithubHeaders(token)

        try {
            let reposUrl: string
            if (owner) {
                // Try orgs first, fallback to users if 404
                reposUrl = `https://api.github.com/orgs/${encodeURIComponent(owner)}/repos?per_page=100&sort=updated`
            } else {
                reposUrl = `https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&per_page=100&sort=updated`
            }

            let response = await fetch(reposUrl, { headers })

            if (!response.ok && owner && response.status === 404) {
                // If org returned 404, query as personal user repos
                reposUrl = `https://api.github.com/users/${encodeURIComponent(owner)}/repos?per_page=100&sort=updated`
                response = await fetch(reposUrl, { headers })
            }

            if (!response.ok) return []

            const data = await response.json()
            const values = Array.isArray(data) ? data : []

            return values.map((repo: any) => ({
                full_name: repo.full_name,
                name: repo.name,
                slug: repo.name,
                is_private: Boolean(repo.private),
                html_url: repo.html_url || `https://github.com/${repo.full_name}`,
                default_branch: repo.default_branch || 'main'
            }))
        } catch (err) {
            console.error('[GithubAdapter] Error fetching repositories:', err)
            return []
        }
    }

    /**
     * Unconditionally persists encrypted webhook credentials, and attempts to register org webhook in GitHub.
     * If org webhook registration fails (403/404 or missing permissions), gracefully sets webhook_configured: false
     * and keeps secret safely persisted for manual configuration without breaking the connection.
     */
    async onConnect(connectionId: string, credentials: ConnectionCredentials): Promise<void> {
        const token = credentials.token?.trim()
        if (!token || !connectionId) return

        const owner = credentials.owner?.trim()
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://app.pixy.agency'
        const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/webhooks/vcs/github/${connectionId}`

        let secret = credentials.webhook_secret || credentials.secret
        if (!secret) {
            const cryptoMod = await import('crypto')
            secret = cryptoMod.randomBytes(24).toString('hex')
        }

        // 1. Unconditionally persist webhook_url and encrypted webhook_secret in integration_connections
        try {
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
                        webhook_url: webhookUrl,
                        webhook_configured: false,
                        ...(owner ? { owner } : {})
                    },
                    credentials: secureCredentials
                })
                .eq('id', connectionId)
        } catch (persistErr) {
            console.error('[GithubAdapter] Error persisting webhook secret:', persistErr)
        }

        // 2. Attempt automatic webhook creation on GitHub if owner is provided
        if (!owner) return

        const headers = {
            ...getGithubHeaders(token),
            "Content-Type": "application/json"
        }

        const webhookPayload = {
            name: "web",
            active: true,
            events: ["push", "pull_request"],
            config: {
                url: webhookUrl,
                content_type: "json",
                secret,
                insecure_ssl: "0"
            }
        }

        try {
            const { globalCircuitBreaker } = await import('@/modules/infrastructure/resilience/circuit-breaker')

            await globalCircuitBreaker.execute('github_webhook_register', async () => {
                const response = await fetch(`https://api.github.com/orgs/${encodeURIComponent(owner)}/hooks`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(webhookPayload)
                })

                if (response.ok) {
                    const hookData = await response.json()
                    const webhookId = hookData.id

                    if (webhookId) {
                        const { data: currentConn } = await supabaseAdmin
                            .from('integration_connections')
                            .select('metadata')
                            .eq('id', connectionId)
                            .single()

                        await supabaseAdmin
                            .from('integration_connections')
                            .update({
                                metadata: {
                                    ...(currentConn?.metadata || {}),
                                    webhook_id: webhookId,
                                    webhook_url: webhookUrl,
                                    webhook_configured: true,
                                    owner
                                }
                            })
                            .eq('id', connectionId)
                    }
                } else {
                    const errBody = await response.text().catch(() => '')
                    console.warn(`[GithubAdapter] No se pudo registrar webhook automático en GitHub para org ${owner} (${response.status}): ${errBody}. La conexión continuará con configuración manual.`)
                }
            })
        } catch (error) {
            console.warn('[GithubAdapter] Error en intento de registro de webhook automático:', error)
        }
    }

    /**
     * Cleans up GitHub webhook if created automatically
     */
    async onDisconnect(connectionId: string, credentials: ConnectionCredentials): Promise<void> {
        const token = credentials.token?.trim()
        if (!token) return

        let owner = credentials.owner?.trim() || credentials.metadata?.owner
        let webhookId = credentials.metadata?.webhook_id

        if ((!webhookId || !owner) && connectionId) {
            const { data: conn } = await supabaseAdmin
                .from('integration_connections')
                .select('metadata')
                .eq('id', connectionId)
                .single()

            webhookId = webhookId || conn?.metadata?.webhook_id
            owner = owner || conn?.metadata?.owner
        }

        if (!webhookId || !owner) return

        try {
            const headers = getGithubHeaders(token)
            await fetch(`https://api.github.com/orgs/${encodeURIComponent(owner)}/hooks/${encodeURIComponent(webhookId)}`, {
                method: 'DELETE',
                headers
            })
        } catch (error) {
            console.warn('[GithubAdapter] Error eliminando webhook de GitHub:', error)
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
}

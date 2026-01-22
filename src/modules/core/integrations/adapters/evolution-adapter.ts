import { IntegrationAdapter, ConnectionCredentials, VerificationResult } from "./types"

export class EvolutionAdapter implements IntegrationAdapter {
    key = "evolution_api"

    async verifyCredentials(credentials: ConnectionCredentials): Promise<VerificationResult> {
        const { baseUrl, apiKey, instanceName } = credentials

        if (!baseUrl || !apiKey || !instanceName) {
            return { isValid: false, error: "Missing required fields (Base URL, API Key, Instance Name)" }
        }

        try {
            // Verify by fetching instance state
            const url = `${baseUrl.replace(/\/$/, '')}/instance/connectionState/${instanceName}`

            const response = await fetch(url, {
                headers: {
                    "apikey": apiKey
                }
            })

            if (response.ok) {
                const data = await response.json()
                // Evolution usually returns { instance: { state: "open" } } or connection status
                return {
                    isValid: true,
                    metadata: {
                        status: data.instance?.state || 'unknown',
                        phone: data.instance?.ownerJid // sometimes available
                    }
                }
            } else {
                return { isValid: false, error: `Evolution Verification Failed: ${response.status} ${response.statusText}` }
            }
        } catch (err: any) {
            return { isValid: false, error: `Network error connecting to Evolution: ${err.message}` }
        }
    }

    async onConnect(connectionId: string, credentials: ConnectionCredentials): Promise<void> {
        // Optional: Auto-configure webhook here
        console.log(`[EvolutionAdapter] Connected ${connectionId}. Webhook configuration logic would go here.`)
    }

    async getQrCode(credentials: ConnectionCredentials): Promise<{ qr: string, type: 'base64' | 'url' } | null> {
        const { baseUrl, apiKey, instanceName } = credentials
        if (!baseUrl || !apiKey || !instanceName) return null

        try {
            const url = `${baseUrl.replace(/\/$/, '')}/instance/connect/${instanceName}`
            const response = await fetch(url, {
                headers: { "apikey": apiKey }
            })

            if (response.ok) {
                const data = await response.json()
                // Evolution returns { base64: "...", code: "..." }
                if (data.base64) {
                    return { qr: data.base64, type: 'base64' }
                }
            }
            return null
        } catch (error) {
            console.error('[EvolutionAdapter] Failed to fetch QR:', error)
            return null
        }
    }

    async checkConnectionStatus(credentials: ConnectionCredentials): Promise<{ status: 'active' | 'inactive' | 'error', message?: string }> {
        const { baseUrl, apiKey, instanceName } = credentials
        if (!baseUrl || !apiKey || !instanceName) return { status: 'error', message: 'Missing credentials' }

        try {
            const url = `${baseUrl.replace(/\/$/, '')}/instance/connectionState/${instanceName}`
            const response = await fetch(url, {
                headers: { "apikey": apiKey }
            })

            if (response.ok) {
                const data = await response.json()
                // Evolution: { instance: { state: "open" } }
                if (data.instance?.state === 'open') {
                    return { status: 'active' }
                } else if (data.instance?.state === 'close' || data.instance?.state === 'connecting') {
                    return { status: 'inactive', message: data.instance?.state }
                }
                return { status: 'inactive', message: 'Unknown state' }
            }
            return { status: 'error', message: `API Error: ${response.status}` }
        } catch (error: any) {
            return { status: 'error', message: error.message }
        }
    }

    async sendMessage(credentials: ConnectionCredentials, recipient: string, content: any): Promise<{ messageId: string, metadata?: any }> {
        const { baseUrl, apiKey, instanceName } = credentials
        if (!baseUrl || !apiKey || !instanceName) throw new Error("Missing credentials")

        const url = `${baseUrl.replace(/\/$/, '')}/message/sendText/${instanceName}`

        // Handle text vs media (for now assuming text for auto-replies)
        const text = typeof content === 'string' ? content : content.text || JSON.stringify(content)

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                "apikey": apiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                number: recipient,
                text: text,
                delay: 1000
            })
        })

        if (!response.ok) {
            throw new Error(`Evolution Send Failed: ${response.statusText}`)
        }

        const data = await response.json()
        return {
            messageId: data.key?.id || Date.now().toString(),
            metadata: data
        }
    }

    // Instance Management (Specific to Evolution)
    async createInstance(params: { instanceName: string; token?: string; qrcode?: boolean; webhook?: string }): Promise<{
        id: string;
        token: string;
        qr?: string;
        status: string;
    }> {
        const globalUrl = process.env.EVOLUTION_API_URL
        const globalKey = process.env.EVOLUTION_API_KEY

        if (!globalUrl || !globalKey) {
            throw new Error("Evolution API Global Configuration missing (EVOLUTION_API_URL, EVOLUTION_API_KEY)")
        }

        const url = `${globalUrl.replace(/\/$/, '')}/instance/create`

        // Build request body according to Evolution API v2 format
        const requestBody: any = {
            instanceName: params.instanceName,
            qrcode: params.qrcode ?? true,
            integration: "WHATSAPP-BAILEYS"
        }

        // Only add token if provided
        if (params.token) {
            requestBody.token = params.token
        }

        // Webhook configuration for Evolution v2 - needs proper structure
        if (params.webhook) {
            requestBody.webhook = {
                url: params.webhook,
                webhookByEvents: false,
                webhookBase64: false,
                events: [
                    "MESSAGES_UPSERT",
                    "MESSAGES_UPDATE",
                    "CONNECTION_UPDATE",
                    "QRCODE_UPDATED"
                ]
            }
        }

        console.log(`[EvolutionAdapter] Creating instance: ${params.instanceName}`)

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                "apikey": globalKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error(`[EvolutionAdapter] Create failed: ${response.status}`, errorText)
            throw new Error(`Evolution Instance Creation Failed: ${response.status} ${errorText}`)
        }

        const data = await response.json()
        console.log(`[EvolutionAdapter] Instance created:`, data)

        // Evolution v2 returns { instance: { instanceName, token, ... }, qrcode: { base64: ... } }
        return {
            id: data.instance?.instanceName || params.instanceName,
            token: data.instance?.token || data.hash?.apikey || params.token || '',
            qr: data.qrcode?.base64,
            status: data.instance?.status || 'created'
        }
    }

    async deleteInstance(instanceName: string): Promise<boolean> {
        const globalUrl = process.env.EVOLUTION_API_URL
        const globalKey = process.env.EVOLUTION_API_KEY

        if (!globalUrl || !globalKey) return false

        const url = `${globalUrl.replace(/\/$/, '')}/instance/delete/${instanceName}`
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { "apikey": globalKey }
        })

        return response.ok
    }

    /**
     * Fetch a specific instance to check if it exists
     */
    async fetchInstance(instanceName: string): Promise<{
        exists: boolean;
        state?: 'open' | 'close' | 'connecting';
        ownerJid?: string;
        token?: string;
    }> {
        const globalUrl = process.env.EVOLUTION_API_URL
        const globalKey = process.env.EVOLUTION_API_KEY

        if (!globalUrl || !globalKey) {
            return { exists: false }
        }

        try {
            // First try to get connection state
            const stateUrl = `${globalUrl.replace(/\/$/, '')}/instance/connectionState/${instanceName}`
            const stateResponse = await fetch(stateUrl, {
                headers: { "apikey": globalKey }
            })

            if (stateResponse.ok) {
                const data = await stateResponse.json()
                return {
                    exists: true,
                    state: data.instance?.state || 'close',
                    ownerJid: data.instance?.ownerJid
                }
            }

            // If 404, instance doesn't exist
            if (stateResponse.status === 404) {
                return { exists: false }
            }

            // Try fetching from instances list as fallback
            const listUrl = `${globalUrl.replace(/\/$/, '')}/instance/fetchInstances`
            const listResponse = await fetch(listUrl, {
                headers: { "apikey": globalKey }
            })

            if (listResponse.ok) {
                const instances = await listResponse.json()
                const found = instances.find((i: any) =>
                    i.instance?.instanceName === instanceName ||
                    i.instanceName === instanceName
                )

                if (found) {
                    return {
                        exists: true,
                        state: found.instance?.status || found.status || 'close',
                        token: found.instance?.token || found.token
                    }
                }
            }

            return { exists: false }
        } catch (error) {
            console.error('[EvolutionAdapter] fetchInstance error:', error)
            return { exists: false }
        }
    }

    /**
     * List all instances (for admin purposes)
     */
    async fetchInstances(): Promise<Array<{
        instanceName: string;
        status: string;
        ownerJid?: string;
    }>> {
        const globalUrl = process.env.EVOLUTION_API_URL
        const globalKey = process.env.EVOLUTION_API_KEY

        if (!globalUrl || !globalKey) return []

        try {
            const url = `${globalUrl.replace(/\/$/, '')}/instance/fetchInstances`
            const response = await fetch(url, {
                headers: { "apikey": globalKey }
            })

            if (!response.ok) return []

            const data = await response.json()
            return data.map((i: any) => ({
                instanceName: i.instance?.instanceName || i.instanceName,
                status: i.instance?.status || i.status || 'unknown',
                ownerJid: i.instance?.ownerJid
            }))
        } catch (error) {
            console.error('[EvolutionAdapter] fetchInstances error:', error)
            return []
        }
    }
}

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
        // Use global config for creation if available, or throw
        const globalUrl = process.env.EVOLUTION_API_URL
        const globalKey = process.env.EVOLUTION_API_KEY

        if (!globalUrl || !globalKey) {
            throw new Error("Evolution API Global Configuration missing (EVOLUTION_API_URL, EVOLUTION_API_KEY)")
        }

        const url = `${globalUrl.replace(/\/$/, '')}/instance/create`

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                "apikey": globalKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                instanceName: params.instanceName,
                token: params.token, // Optional: Evolution generates one if empty, or we set it
                qrcode: params.qrcode ?? true,
                integration: "WHATSAPP-BAILEYS",
                webhook: params.webhook // Setup webhook immediately if possible
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Evolution Instance Creation Failed: ${response.status} ${errorText}`)
        }

        const data = await response.json()

        // Evolution v2 returns { instance: { instanceName, token, ... }, qrcode: { base64: ... } }
        // We need to normalize response
        return {
            id: data.instance?.instanceName || params.instanceName,
            token: data.instance?.token || data.hash?.apikey, // Verify evolution version response
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
}

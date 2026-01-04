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
}

import { IntegrationAdapter, ConnectionCredentials, VerificationResult } from "./types"

export class OpenAIAdapter implements IntegrationAdapter {
    key = "openai"

    async verifyCredentials(credentials: ConnectionCredentials): Promise<VerificationResult> {
        const apiKey = credentials.api_key

        if (!apiKey) {
            return { isValid: false, error: "API Key is required" }
        }

        try {
            const { globalCircuitBreaker } = await import('@/lib/integrations/circuit-breaker');

            return await globalCircuitBreaker.execute('openai_api', async () => {
                const response = await fetch("https://api.openai.com/v1/models", {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`
                    }
                })

                if (response.ok) {
                    return { isValid: true }
                } else {
                    const errorData = await response.json().catch(() => ({}))
                    return {
                        isValid: false,
                        error: errorData.error?.message || `OpenAI Verification Failed: ${response.statusText}`
                    }
                }
            });
        } catch (err: any) {
            return { isValid: false, error: err.message || "Circuit Breaker: Service unavailable" }
        }
    }
}

import { IntegrationAdapter, ConnectionCredentials, VerificationResult } from "./types"

const PUBLIC_OPENAI_VERIFICATION_ERROR = "OpenAI credentials could not be verified"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function publicOpenAIError(error: unknown, fallback = PUBLIC_OPENAI_VERIFICATION_ERROR) {
    if (isDeployedRuntime()) return fallback
    if (error instanceof Error && error.message) return error.message
    if (typeof error === 'string' && error) return error
    return fallback
}

export class OpenAIAdapter implements IntegrationAdapter {
    key = "openai"

    async verifyCredentials(credentials: ConnectionCredentials): Promise<VerificationResult> {
        const apiKey = credentials.api_key

        if (!apiKey) {
            return { isValid: false, error: "API Key is required" }
        }

        try {
            const { globalCircuitBreaker } = await import('@/modules/infrastructure/resilience/circuit-breaker');

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
                        error: publicOpenAIError(
                            errorData.error?.message || `OpenAI Verification Failed: ${response.statusText}`
                        )
                    }
                }
            });
        } catch (err: unknown) {
            return { isValid: false, error: publicOpenAIError(err) }
        }
    }
}

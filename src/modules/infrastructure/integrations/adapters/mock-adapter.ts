import { IntegrationAdapter, ConnectionCredentials, VerificationResult } from "./types"

/**
 * A generic adapter that accepts any key longer than 5 characters.
 * Useful for development or as a fallback.
 */
export class MockAdapter implements IntegrationAdapter {
    key: string

    constructor(key: string) {
        this.key = key
    }

    async verifyCredentials(credentials: ConnectionCredentials): Promise<VerificationResult> {
        const apiKey = credentials.api_key || credentials.token

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800))

        if (!apiKey) {
            return { isValid: false, error: "Missing credential (api_key or token)" }
        }

        if (String(apiKey).length < 5) {
            return { isValid: false, error: "Invalid Key: Must be at least 5 characters long (Mock Validation)" }
        }

        return { isValid: true }
    }
}

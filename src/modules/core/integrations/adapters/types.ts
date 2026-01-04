export interface ConnectionCredentials {
    [key: string]: any
}

export interface VerificationResult {
    isValid: boolean
    error?: string
    metadata?: Record<string, any> // Extra info fetched during verification (e.g. account name)
}

export interface IntegrationAdapter {
    key: string

    /**
     * Verifies if the provided credentials are valid for this service.
     * Should make an external API call to check.
     */
    verifyCredentials(credentials: ConnectionCredentials): Promise<VerificationResult>

    /**
     * Called immediately after a successful DB insertion.
     * Use this to register webhooks or perform initial sync.
     */
    onConnect?(connectionId: string, credentials: ConnectionCredentials): Promise<void>

    /**
     * Called before removing the connection from DB.
     * Use this to deregister webhooks.
     */
    onDisconnect?(connectionId: string, credentials: ConnectionCredentials): Promise<void>
}

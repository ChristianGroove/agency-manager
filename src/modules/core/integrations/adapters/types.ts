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
    /**
     * Called before removing the connection from DB.
     * Use this to deregister webhooks.
     */
    onDisconnect?(connectionId: string, credentials: ConnectionCredentials): Promise<void>

    /**
     * Get QR Code for validation (optional)
     * Returns base64 string or URL
     */
    getQrCode?(credentials: ConnectionCredentials): Promise<{ qr: string, type: 'base64' | 'url' } | null>

    /**
     * Check current connection health/status
     */
    checkConnectionStatus?(credentials: ConnectionCredentials): Promise<{ status: 'active' | 'inactive' | 'error', message?: string }>

    /**
     * Send a message via this provider
     */
    /**
     * Send a message via this provider
     */
    sendMessage?(credentials: ConnectionCredentials, recipient: string, content: any, metadata?: any): Promise<{ messageId: string, metadata?: any }>

    /**
     * Storage Capability (Optional)
     */
    storage?: StorageProvider
}

export interface StorageProvider {
    /**
     * Upload a file to the provider
     * @param path Remote path (e.g. "backups/2026-01-01.zip")
     * @param content File content (Buffer or string)
     * @param contentType MIME type
     */
    uploadFile(credentials: ConnectionCredentials, path: string, content: Buffer | string, contentType?: string): Promise<{ url: string, fileId?: string }>

    /**
     * Delete a file
     */
    deleteFile?(credentials: ConnectionCredentials, path: string): Promise<boolean>
}

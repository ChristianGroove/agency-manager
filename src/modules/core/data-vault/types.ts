
export interface DataSnapshot {
    id: string
    organization_id: string
    name: string
    description?: string
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'restoring' | 'archived'
    storage_path?: string
    checksum?: string
    file_size_bytes?: number
    included_modules: string[]
    metadata: Record<string, any>
    created_at: string
}

export interface DataModule {
    key: string
    name: string
    description: string
    dependencies: string[]

    /**
     * Export all data for this module belonging to the organization.
     * Should return a JSON-serializable object.
     */
    exportData: (organizationId: string) => Promise<Record<string, any>>

    /**
     * Import data for this module.
     * @param data The data previously exported by exportData
     * @param organizationId The target organization ID
     */
    importData: (organizationId: string, data: any) => Promise<void>

    /**
     * Delete all data for this module for the organization.
     * Used before import to ensure clean state (Time Travel).
     */
    clearData: (organizationId: string) => Promise<void>
}

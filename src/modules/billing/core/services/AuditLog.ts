// AuditLog Service - Immutable audit trail for billing operations
// PHASE 1: Core implementation

import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Audit Action Types
 */
export enum AuditAction {
    DOCUMENT_CREATED = 'DOCUMENT_CREATED',
    DOCUMENT_UPDATED = 'DOCUMENT_UPDATED',
    DOCUMENT_ISSUED = 'DOCUMENT_ISSUED',
    DOCUMENT_PAID = 'DOCUMENT_PAID',
    DOCUMENT_VOIDED = 'DOCUMENT_VOIDED',
    DOCUMENT_SENT = 'DOCUMENT_SENT',
    TAX_CALCULATED = 'TAX_CALCULATED',
    EXTERNAL_SUBMISSION = 'EXTERNAL_SUBMISSION',
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    // FASE 7: Fiscal Audit Events
    DIAN_XML_GENERATED = 'DIAN_XML_GENERATED',
    DIAN_XML_SIGNED = 'DIAN_XML_SIGNED',
    DIAN_SUBMISSION = 'DIAN_SUBMISSION',
    DIAN_RESPONSE = 'DIAN_RESPONSE'
}

/**
 * Audit Log Entry
 */
export interface AuditLogEntry {
    id: string
    timestamp: Date

    // Action
    action: AuditAction
    documentId?: string

    // Context
    userId: string
    organizationId: string

    // State changes
    before?: any
    after?: any
    changes?: string[]

    // Request context
    ipAddress?: string
    userAgent?: string
    source: 'WEB' | 'API' | 'CRON' | 'EXTERNAL'

    // Immutability chain
    hash: string
    previousHash?: string
}

/**
 * Input for creating audit log entry
 */
export interface CreateAuditLogInput {
    action: AuditAction
    documentId?: string
    userId: string
    organizationId: string
    before?: any
    after?: any
    changes?: string[]
    ipAddress?: string
    userAgent?: string
    source: 'WEB' | 'API' | 'CRON' | 'EXTERNAL'
}

/**
 * Audit Log Service
 * 
 * Provides immutable audit trail for all billing operations.
 * - Only allows INSERT (no UPDATE or DELETE)
 * - Implements blockchain-like hash chain
 * - Provides integrity verification
 */
export class AuditLogService {
    /**
     * Log an audit entry (immutable - only inserts allowed)
     */
    async log(input: CreateAuditLogInput): Promise<AuditLogEntry> {
        const { data, error } = await supabaseAdmin
            .from('billing_audit_log')
            .insert({
                action: input.action,
                document_id: input.documentId,
                user_id: input.userId,
                organization_id: input.organizationId,
                before: input.before,
                after: input.after,
                changes: input.changes,
                ip_address: input.ipAddress,
                user_agent: input.userAgent,
                source: input.source
                // hash and previous_hash are set by database trigger
            })
            .select()
            .single()

        if (error) {
            console.error('Failed to create audit log:', error)
            throw new Error(`Audit log failed: ${error.message}`)
        }

        return this.mapToEntry(data)
    }

    /**
     * Get audit history for a document
     */
    async getDocumentHistory(documentId: string): Promise<AuditLogEntry[]> {
        const { data, error } = await supabaseAdmin
            .from('billing_audit_log')
            .select('*')
            .eq('document_id', documentId)
            .order('timestamp', { ascending: true })

        if (error) {
            console.error('Failed to fetch document history:', error)
            return []
        }

        return data.map(this.mapToEntry)
    }

    /**
     * Get audit history for an organization
     */
    async getOrganizationHistory(
        organizationId: string,
        limit: number = 100
    ): Promise<AuditLogEntry[]> {
        const { data, error } = await supabaseAdmin
            .from('billing_audit_log')
            .select('*')
            .eq('organization_id', organizationId)
            .order('timestamp', { ascending: false })
            .limit(limit)

        if (error) {
            console.error('Failed to fetch organization history:', error)
            return []
        }

        return data.map(this.mapToEntry)
    }

    /**
     * Verify integrity of audit chain
     * 
     * Checks that hashes form a valid chain (blockchain-like verification)
     */
    async verifyIntegrity(entries: AuditLogEntry[]): Promise<{
        isValid: boolean
        brokenAt?: number
        error?: string
    }> {
        if (entries.length === 0) {
            return { isValid: true }
        }

        // Sort by timestamp
        const sorted = [...entries].sort((a, b) =>
            a.timestamp.getTime() - b.timestamp.getTime()
        )

        // Verify chain
        for (let i = 1; i < sorted.length; i++) {
            const current = sorted[i]
            const previous = sorted[i - 1]

            if (current.previousHash !== previous.hash) {
                return {
                    isValid: false,
                    brokenAt: i,
                    error: `Chain broken at index ${i}: expected previous_hash ${previous.hash}, got ${current.previousHash}`
                }
            }
        }

        return { isValid: true }
    }

    /**
     * Map database row to AuditLogEntry
     */
    private mapToEntry(data: any): AuditLogEntry {
        return {
            id: data.id,
            timestamp: new Date(data.timestamp),
            action: data.action as AuditAction,
            documentId: data.document_id,
            userId: data.user_id,
            organizationId: data.organization_id,
            before: data.before,
            after: data.after,
            changes: data.changes,
            ipAddress: data.ip_address,
            userAgent: data.user_agent,
            source: data.source,
            hash: data.hash,
            previousHash: data.previous_hash
        }
    }
}

// Singleton instance
export const auditLog = new AuditLogService()

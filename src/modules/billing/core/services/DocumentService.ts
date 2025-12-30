// Document Service - Core business logic for billing documents
// PHASE 1: Basic implementation with GenericAdapter

import type { CountryAdapter } from '../interfaces/CountryAdapter'
import type { Document } from '../entities/Document'
import type { ValidationResult } from '../types/CoreTypes'
import { GenericAdapter } from '../../adapters/generic/GenericAdapter'
import { auditLog, AuditAction } from './AuditLog'

/**
 * Document Service  
 * 
 * Central service for document operations.
 * Uses country adapter for validation and processing.
 */
export class DocumentService {
    private adapter: CountryAdapter

    constructor(adapter?: CountryAdapter) {
        this.adapter = adapter || new GenericAdapter()
    }

    /**
     * Create and validate a document
     * 
     * @param document - Document to create
     * @returns Validated document
     */
    async createDocument(
        document: Omit<Document, 'id' | 'createdAt' | 'auditLog'>
    ): Promise<Document> {
        // Create full document
        const fullDocument: Document = {
            ...document,
            id: crypto.randomUUID(),
            createdAt: new Date(),
            auditLog: []
        }

        // Validate with country adapter
        const validation = await this.adapter.validateDocument(fullDocument)

        if (!validation.isValid) {
            // Log validation failure
            await this.logAudit({
                action: AuditAction.VALIDATION_FAILED,
                documentId: fullDocument.id,
                userId: fullDocument.createdBy,
                organizationId: fullDocument.organizationId,
                after: { errors: validation.errors },
                source: 'WEB'
            })

            throw new Error(`Document validation failed: ${validation.errors?.join(', ')}`)
        }

        // Log creation
        await this.logAudit({
            action: AuditAction.DOCUMENT_CREATED,
            documentId: fullDocument.id,
            userId: fullDocument.createdBy,
            organizationId: fullDocument.organizationId,
            after: fullDocument,
            source: 'WEB'
        })

        return fullDocument
    }

    /**
     * Update document
     */
    async updateDocument(
        document: Document,
        changes: Partial<Document>,
        userId: string
    ): Promise<Document> {
        const updated: Document = {
            ...document,
            ...changes,
            updatedAt: new Date(),
            updatedBy: userId
        }

        // Validate
        const validation = await this.adapter.validateDocument(updated)
        if (!validation.isValid) {
            throw new Error(`Document validation failed: ${validation.errors?.join(', ')}`)
        }

        // Log update
        await this.logAudit({
            action: AuditAction.DOCUMENT_UPDATED,
            documentId: updated.id,
            userId,
            organizationId: updated.organizationId,
            before: document,
            after: updated,
            changes: Object.keys(changes),
            source: 'WEB'
        })

        return updated
    }

    /**
     * Validate document without creating
     */
    async validateDocument(document: Document): Promise<ValidationResult> {
        return this.adapter.validateDocument(document)
    }

    /**
     * Helper to log audit entries
     */
    private async logAudit(params: {
        action: AuditAction
        documentId: string
        userId: string
        organizationId: string
        before?: any
        after?: any
        changes?: string[]
        source: 'WEB' | 'API' | 'CRON' | 'EXTERNAL'
    }) {
        try {
            await auditLog.log(params)
        } catch (error) {
            // Log error but don't fail operation
            console.error('Failed to log audit entry:', error)
        }
    }
}

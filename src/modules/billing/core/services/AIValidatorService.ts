import { type Document, DocumentType } from '../entities/Document'
import type { AIValidationResult, DiagnosticFinding } from '../types/AIValidationResult'

/**
 * AI Validator Service
 * Acts as a Co-Pilot to detect issues before legal submission.
 * STRICTLY READ-ONLY: Never modifies the document.
 */
export class AIValidatorService {

    /**
     * Pre-validate a document using heuristics and (future) AI models
     */
    public async validate(document: Document): Promise<AIValidationResult> {
        const findings: DiagnosticFinding[] = []

        // 1. Run deterministic heuristics (Math, Formats, Dates)
        const heuristicFindings = this.runHeuristics(document)
        findings.push(...heuristicFindings)

        // 2. (Future) Run LLM Semantic Analysis
        // const semanticFindings = await this.runSemanticAnalysis(document)
        // findings.push(...semanticFindings)

        // 3. Synthesize Result
        const isValid = !findings.some(f => f.severity === 'CRITICAL')

        return {
            isValid,
            riskLevel: this.calculateRisk(findings),
            summary: this.generateSummary(findings, isValid),
            findings,
            timestamp: new Date()
        }
    }

    /**
     * Deterministic Rules Engine
     */
    private runHeuristics(doc: Document): DiagnosticFinding[] {
        const results: DiagnosticFinding[] = []

        // Example Rule 1: Receiver Tax ID presence
        if (!doc.receiver.taxId || doc.receiver.taxId === '000000000') {
            // 000000000 is often a placeholder
            results.push({
                code: 'VAL-001',
                severity: 'WARNING',
                technicalMessage: 'Receiver TaxID is missing or placeholder',
                humanExplanation: 'El cliente parece no tener un NIT válido registrado.',
                suggestion: 'Verifica los datos del cliente antes de emitir para evitar rechazo DIAN.',
                fieldReference: 'receiver.taxId'
            })
        }

        // Example Rule 2: Totals consistency
        // Simple check: do line items sum up mostly to subtotal?
        const calculatedSubtotal = doc.lineItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
        // Allow small floating point diff
        if (Math.abs(calculatedSubtotal - doc.totals.subtotal) > 0.1) {
            results.push({
                code: 'VAL-MAT-01',
                severity: 'CRITICAL',
                technicalMessage: `Subtotal mismatch. Lines: ${calculatedSubtotal}, Header: ${doc.totals.subtotal}`,
                humanExplanation: 'Hay una discrepancia matemática entre los ítems y el subtotal calculado.',
                suggestion: 'Recalcula los totales para asegurar precisión.',
                fieldReference: 'totals.subtotal'
            })
        }

        // Example Rule 3: Valid Email for E-invoicing
        if (!doc.receiver.email || !doc.receiver.email.includes('@')) {
            results.push({
                code: 'VAL-COM-01',
                severity: 'CRITICAL',
                technicalMessage: 'Receiver email is missing or invalid',
                humanExplanation: 'El cliente no tiene un email válido para recibir la factura electrónica.',
                suggestion: 'Agrega un email válido al cliente.',
                fieldReference: 'receiver.email'
            })
        }

        // === FASE 5: Cuentas de Cobro Coexistence Rules ===

        if (doc.type === DocumentType.RECEIPT) {
            // Rule 4: Blocking for IVA Responsibles (O-48) working as Receipts
            // 'O-48' is the DIAN code for "Impuesto sobre las ventas - IVA"
            if (doc.issuer.fiscalResponsibilities?.includes('O-48')) {
                results.push({
                    code: 'LEG-001',
                    severity: 'CRITICAL',
                    technicalMessage: 'Issuer is IVA Responsible (O-48) but attempting to create RECEIPT',
                    humanExplanation: 'Tu empresa es responsable de IVA (O-48). Legalmente estás OBLIGADO a emitir Factura Electrónica, no Cuenta de Cobro.',
                    suggestion: 'Cambia el tipo de documento a Factura Electrónica.',
                    fieldReference: 'type'
                })
            } else {
                // Rule 5: Warning for valid Receipts (User Education)
                results.push({
                    code: 'LEG-002',
                    severity: 'WARNING',
                    technicalMessage: 'Document is a RECEIPT (Non-Electronic)',
                    humanExplanation: 'Este documento es una Cuenta de Cobro (NO Electrónica). No sirve como título valor ni para deducir costos.',
                    suggestion: 'Solo usa esto si NO estás obligado a facturar.',
                    fieldReference: 'type'
                })
            }
        }

        return results
    }

    private calculateRisk(findings: DiagnosticFinding[]): 'LOW' | 'MEDIUM' | 'HIGH' {
        if (findings.some(f => f.severity === 'CRITICAL')) return 'HIGH'
        if (findings.some(f => f.severity === 'WARNING')) return 'MEDIUM'
        return 'LOW'
    }

    private generateSummary(findings: DiagnosticFinding[], isValid: boolean): string {
        if (isValid && findings.length === 0) {
            return "Documento saludable. Listo para emisión."
        }
        if (!isValid) {
            return `Atención: Encontramos ${findings.filter(f => f.severity === 'CRITICAL').length} errores críticos que impedirán la emisión.`
        }
        return `El documento es válido, pero tiene ${findings.length} sugerencias de mejora.`
    }
}

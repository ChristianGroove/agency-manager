/**
 * AI Validation Response Structure
 * Read-Only diagnostic report
 */

export type FindingSeverity = 'INFO' | 'WARNING' | 'CRITICAL'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface DiagnosticFinding {
    code: string              // e.g., "DIAN-RULE-001"
    severity: FindingSeverity
    technicalMessage: string  // Original error or heuristic detection
    humanExplanation: string  // User friendly explanation
    suggestion?: string       // Actionable improvement
    fieldReference?: string   // Dot notation path to field (e.g. "receiver.taxDetails.taxId")
}

export interface AIValidationResult {
    isValid: boolean          // Fails if any CRITICAL finding exists
    riskLevel: RiskLevel
    summary: string           // High level human summary
    findings: DiagnosticFinding[]
    timestamp: Date
}

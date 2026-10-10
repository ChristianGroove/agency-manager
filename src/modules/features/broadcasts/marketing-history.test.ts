import { describe, expect, it } from 'vitest'
import { historyFiltersSchema, stepCursorSchema } from './marketing-history'
import { csvCell, csvLine, recipientCsv } from './marketing-history-csv'

describe('Marketing report contracts and safe CSV', () => {
    it('bounds filters and rejects caller organization IDs and malformed cursors', () => {
        expect(historyFiltersSchema.parse({})).toEqual({ status: 'all', search: '', delivery: 'all' })
        expect(historyFiltersSchema.safeParse({ organizationId: 'another-tenant' }).success).toBe(false)
        expect(historyFiltersSchema.safeParse({ search: 'x'.repeat(81) }).success).toBe(false)
        expect(stepCursorSchema.safeParse({ enrollmentId: 'invalid', order: 0, stepId: 'invalid' }).success).toBe(false)
    })
    it.each(['=HYPERLINK("https://invalid")', '+SUM(1)', '-1+1', '@SUM(1)', '  =cmd', '\tformula', '\rformula', '\nformula'])('neutralizes formula cells %j', value => {
        expect(csvCell(value)).toMatch(/^"'/)
    })
    it('preserves multiline quoted content without creating CSV columns or stripping unicode', () => {
        expect(csvLine(['José, "Prueba"\nOtra línea', null, 3])).toBe('"José, ""Prueba""\nOtra línea","","3"\r\n')
    })
    it('exports fixed fields, preserves phone precision and never includes legacy logs', () => {
        const row: any = { id: 'row', name: '=formula', phone: '00123456789012345', status: 'completed', counts: {
            total: 1, queued: 0, sending: 0, accepted: 0, delivered: 0, read: 1, failed: 0, unknown: 0 }, execution_logs: 'SECRET', credentials: 'SECRET' }
        const csv = recipientCsv(row, '2026-10-10T00:00:00Z')
        expect(csv).toContain('"\'00123456789012345"'); expect(csv).toContain('"\'=formula"'); expect(csv).not.toContain('SECRET')
        expect(csv).toContain('Procesamiento terminado')
    })
})

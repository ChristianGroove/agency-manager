import { describe, expect, it } from 'vitest'
import { parseMarketingImport } from './marketing-import'

const header = 'nombre,telefono,email,origen_autorizacion,evidencia,fecha_autorizacion'
const valid = 'Synthetic,+573001234567,,form,reference,2026-01-01T10:00:00-05:00'
describe('Reviewed marketing CSV', () => {
    it('reads BOM, reordered columns, quoted commas, escaped quotes and multiline evidence', () => {
        const result = parseMarketingImport(`\uFEFF${header}\r\n"Test, User",+57 (300) 123-4567,,form,"Accepted \"\"promotions\"\"\nreference",2026-01-01T10:00:00-05:00`)
        expect(result.valid[0]).toMatchObject({ name: 'Test, User', phone: '573001234567', evidence: 'Accepted "promotions"\nreference' })
        expect(result.invalid).toEqual([])
    })
    it('rejects invalid rows individually without manufacturing consent or a country code', () => {
        const result = parseMarketingImport(`${header}\n${valid}\nLocal,3001234567,,form,reference,2026-01-01T10:00:00-05:00\nNoConsent,+573001234568,,,,2026-01-01T10:00:00-05:00\nFuture,+573001234569,,form,reference,2099-01-01T10:00:00-05:00`)
        expect(result.valid).toHaveLength(1); expect(result.invalid.map(row => row.row)).toEqual([3, 4, 5])
    })
    it.each(['nombre,telefono,email', `${header},evidencia`, `${header}\n"unterminated`])('rejects ambiguous headers or broken quoting: %s', input => {
        expect(() => parseMarketingImport(input)).toThrow()
    })
    it('bounds both byte size and row count', () => {
        expect(() => parseMarketingImport(`${header}\n${Array(101).fill(valid).join('\n')}`)).toThrow(/100/)
        expect(() => parseMarketingImport('x'.repeat(1024 * 1024 + 1))).toThrow(/1 MB/)
    })
})

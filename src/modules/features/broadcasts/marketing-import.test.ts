import { describe, expect, it } from 'vitest'
import { parseMarketingImport, parseMarketingListFile, parseContactListImport, CONTACT_LIST_BYTE_LIMIT } from './marketing-import'

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

describe('Simple contact lists without inferred permission', () => {
    it('accepts only international phone numbers and creates no authorization fields', () => {
        const result = parseMarketingListFile('telefono\n+57 (300) 123-4567')
        expect(result.mode).toBe('contacts')
        expect(result.valid).toEqual([{ row: 2, name: '573001234567', phone: '573001234567', email: '' }])
        expect(result.invalid).toEqual([])
    })
    it('supports optional reordered columns, BOM and quoted names', () => {
        const result = parseContactListImport('\uFEFFemail,nombre,telefono\r\nsynthetic@example.test,"Example, Person",+573001234567')
        expect(result.valid[0]).toEqual({ row: 2, name: 'Example, Person', phone: '573001234567', email: 'synthetic@example.test' })
    })
    it('rejects local numbers and malformed rows separately without guessing a country', () => {
        const result = parseContactListImport('telefono,email\n3001234567,\n+573001234567,\n+573001234568,invalid\n+573001234569,,extra')
        expect(result.valid.map(row => row.row)).toEqual([3])
        expect(result.invalid.map(row => row.row)).toEqual([2, 4, 5])
    })
    it.each(['telefono,telefono\n1,2', 'numero\n+573001234567', 'telefono\n"unterminated'])('rejects ambiguous input: %s', input => {
        expect(() => parseContactListImport(input)).toThrow()
    })
    it('accepts 1000 contacts and bounds rows and bytes', () => {
        expect(parseContactListImport(`telefono\n${Array(1000).fill('+573001234567').join('\n')}`).valid).toHaveLength(1000)
        expect(() => parseContactListImport(`telefono\n${Array(1001).fill('+573001234567').join('\n')}`)).toThrow(/1000/)
        expect(() => parseContactListImport('x'.repeat(CONTACT_LIST_BYTE_LIMIT + 1))).toThrow(/5 MB/)
    })
    it('preserves the existing evidence import and rejects incomplete evidence headers', () => {
        expect(parseMarketingListFile(`${header}\n${valid}`)).toMatchObject({ mode: 'consent', valid: [expect.objectContaining({ evidence: 'reference' })] })
        expect(() => parseMarketingListFile('telefono,evidencia\n+573001234567,reference')).toThrow(/columnas/)
    })
})

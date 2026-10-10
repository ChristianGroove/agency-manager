import { describe, expect, it } from 'vitest'
import { previewMarketingTemplate } from './marketing-template-preview'
import type { CampaignTemplate } from './marketing-template-contract'
const template = { components: [{ type: 'HEADER', format: 'TEXT', text: 'Hola {{1}}' }, { type: 'BODY', text: 'Oferta para {{empresa}}' }, { type: 'FOOTER', text: 'Condiciones' }] } as CampaignTemplate
describe('Presentation preview', () => {
    it('shows a fictional personalization without changing persisted bindings', () => {
        const selection = { template_id: 'id', template_name: 'promo', template_language: 'es', bindings: { 'header.1': '{{nombre}}', 'body.empresa': '{{empresa}}' } }
        expect(previewMarketingTemplate(template, selection).map(part => part.text)).toEqual(['Hola María Ejemplo', 'Oferta para Empresa de ejemplo', 'Condiciones'])
        expect(selection.bindings['header.1']).toBe('{{nombre}}')
    })
    it('keeps unfilled template variables visible instead of inventing binding values', () => {
        expect(previewMarketingTemplate(template, null)[0].text).toBe('Hola {{1}}')
    })
})

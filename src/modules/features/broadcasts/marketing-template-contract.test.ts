import { describe, expect, it } from 'vitest'
import { CampaignTemplate, describeCampaignTemplate, validateCampaignTemplate, buildCampaignTemplateMessage } from './marketing-template-contract'

const channel = '03000000-0000-4000-8000-000000000001'
const template: CampaignTemplate = { id: '08000000-0000-4000-8000-000000000001', channel_id: channel,
    name: 'promo', language: 'es', status: 'APPROVED', category: 'MARKETING', meta_id: 'fixture',
    components: [{ type: 'HEADER', format: 'TEXT', text: '{{1}}' }, { type: 'BODY', text: 'Hola {{1}}, {{2}}' },
        { type: 'BUTTONS', buttons: [{ type: 'URL', url: 'https://example.com/{{1}}' }, { type: 'QUICK_REPLY', text: 'Baja' }] }] }
const selection = { template_id: template.id, template_name: template.name, template_language: template.language,
    bindings: { 'header.1': 'Oferta', 'body.1': '{{nombre}}', 'body.2': '10%', 'button.0.url': 'promocion', 'button.1.payload': 'BAJA_PROMOCIONES' } }

describe('Marketing template design contract', () => {
    it('keeps header/body/button variables separate, including named variables', () => {
        expect(describeCampaignTemplate(template).fields.map(field => field.key)).toEqual(['header.1', 'body.1', 'body.2', 'button.0.url', 'button.1.payload'])
        expect(describeCampaignTemplate({ ...template, components: [{ type: 'BODY', text: '{{nombre_cliente}} / {{empresa_cliente}}' }] }).fields.map(field => field.key)).toEqual(['body.empresa_cliente', 'body.nombre_cliente'])
    })
    it('accepts a complete design but rejects missing or extra bindings', () => {
        expect(validateCampaignTemplate(template, selection, channel)).toEqual(selection)
        expect(() => validateCampaignTemplate(template, { ...selection, bindings: { 'body.1': 'Nombre' } }, channel)).toThrow('HEADER')
        expect(() => validateCampaignTemplate(template, { ...selection, bindings: { ...selection.bindings, 'body.3': 'extra' } }, channel)).toThrow('no pertenecen')
    })
    it('rejects a foreign channel, renamed template, paused template or utility promotion', () => {
        expect(() => validateCampaignTemplate(template, selection, 'other')).toThrow('número emisor')
        expect(() => validateCampaignTemplate(template, { ...selection, template_name: 'otro' }, channel)).toThrow('número emisor')
        expect(() => validateCampaignTemplate({ ...template, status: 'PAUSED' }, selection, channel)).toThrow('aprobada')
        expect(() => validateCampaignTemplate({ ...template, category: 'UTILITY' }, selection, channel)).toThrow('MARKETING')
    })
    it('checks per-recipient data rather than substituting empty macro values', () => {
        expect(() => validateCampaignTemplate(template, selection, channel, { name: '' })).toThrow('no tiene nombre')
        expect(() => validateCampaignTemplate(template, { ...selection, bindings: { ...selection.bindings, 'body.1': '{{desconocida}}' } }, channel)).toThrow('desconocida')
        expect(validateCampaignTemplate(template, selection, channel, { name: 'Ana' })).toEqual(selection)
    })
    it('requires media inputs instead of relying on a Meta example handle', () => {
        const media = { ...template, components: [{ type: 'HEADER', format: 'IMAGE' }, { type: 'BODY', text: 'Oferta' }] }
        const content = { ...selection, bindings: { 'header.media': 'http://example.com/photo.png' } }
        expect(() => validateCampaignTemplate(media, content, channel)).toThrow('HTTPS')
        expect(() => validateCampaignTemplate(media, { ...content, bindings: { 'header.media': 'https://user:secret@example.com/photo.png' } }, channel)).toThrow('credenciales')
        expect(validateCampaignTemplate(media, { ...content, bindings: { 'header.media': 'https://example.com/photo.png' } }, channel)).toBeTruthy()
    })
    it('flags unsupported components and non-contiguous variables explicitly', () => {
        expect(describeCampaignTemplate({ ...template, components: [{ type: 'BODY', text: '{{1}} {{10}}' }, { type: 'CAROUSEL' }] }).issues).toHaveLength(2)
        const many = { ...template, components: [{ type: 'BODY', text: Array.from({ length: 12 }, (_, index) => `{{${index + 1}}}`).reverse().join(' ') }] }
        expect(describeCampaignTemplate(many).fields[9].key).toBe('body.10')
    })
    it('builds header, ordered body and buttons through the adapter contract', () => {
        const message = buildCampaignTemplateMessage(template, selection, channel, { name: 'Ana', phone: '573001234567' })
        expect(message.templateComponents).toEqual([
            { type: 'header', parameters: [{ type: 'text', text: 'Oferta' }] },
            { type: 'body', parameters: [{ type: 'text', text: 'Ana' }, { type: 'text', text: '10%' }] },
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: 'promocion' }] },
            { type: 'button', sub_type: 'quick_reply', index: '1', parameters: [{ type: 'payload', payload: 'BAJA_PROMOCIONES' }] },
        ])
        const named = { ...template, components: [{ type: 'BODY', text: '{{cliente}}' }] }
        expect(buildCampaignTemplateMessage(named, { ...selection, bindings: { 'body.cliente': '{{nombre}}' } }, channel, { name: 'Ana' }).templateComponents)
            .toEqual([{ type: 'body', parameters: [{ type: 'text', parameter_name: 'cliente', text: 'Ana' }] }])
    })
})

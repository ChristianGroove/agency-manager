import { describe, expect, it, vi } from 'vitest'
const mock=vi.hoisted(()=>({from:vi.fn()}))
vi.mock('@/modules/core/database/supabase-admin',()=>({supabaseAdmin:{from:mock.from}}))
import { evaluateWhatsAppWindow, assertMetaSendAllowed } from './send-policy'
describe('send policy',()=>{
    const now=Date.parse('2026-09-21T12:00:00Z')
    it('requires a real inbound within 24 hours',()=>{
        expect(evaluateWhatsAppWindow(null,now)).toBe(false)
        expect(evaluateWhatsAppWindow('2026-09-20T12:00:00Z',now)).toBe(false)
        expect(evaluateWhatsAppWindow('2026-09-20T12:00:01Z',now)).toBe(true)
        expect(evaluateWhatsAppWindow('2026-09-22T00:00:00Z',now)).toBe(false)
    })
    it('rejects mismatched organizations and connections before reading any preferences',async()=>{
        await expect(assertMetaSendAllowed({id:'a',organization_id:'a',status:'active'},{connection_id:'a',organization_id:'b'},{type:'template'})).rejects.toThrow('same organization')
        expect(mock.from).not.toHaveBeenCalled()
    })
})

it('does not let a WhatsApp template bypass the Instagram window',async()=>{
 await expect(assertMetaSendAllowed({id:'a',organization_id:'o',status:'active',provider_key:'instagram_dm'},{id:'c',connection_id:'a',organization_id:'o',channel:'instagram'},{type:'template'})).rejects.toThrow('social channel')
})

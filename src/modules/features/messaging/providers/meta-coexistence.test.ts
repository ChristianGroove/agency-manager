import { describe, expect, it } from 'vitest'
import { MetaProvider } from './meta-provider'
const provider=new MetaProvider('','','')
function payload(field:string,value:any){return {object:'whatsapp_business_account',entry:[{id:'waba',changes:[{field,value:{metadata:{phone_number_id:'phone-id',display_phone_number:'+57 3001234567'},...value}}]}]}}
describe('official coexistence payloads',()=>{
    it('uses the inbound profile name, with username as a fallback', async () => {
        for (const profile of [{ name: 'Ana', username: 'ana.wa' }, { username: 'ana.wa' }]) {
            const result = await provider.parseWebhook(payload('messages', {
                contacts: [{ wa_id: '573009876543', profile }],
                messages: [{ id: 'inbound', from: '573009876543', timestamp: '1700000000', type: 'text', text: { body: 'Hola' } }],
            }))
            expect(result[0]).toMatchObject({ senderName: 'name' in profile ? 'Ana' : 'ana.wa' })
        }
    })
    it('resolves user_id contacts without inventing a generic name', async () => {
        const result = await provider.parseWebhook(payload('messages', {
            contacts: [{ user_id: 'customer-id', profile: { name: 'Ana' } }],
            messages: [{ id: 'inbound', from: 'customer-id', timestamp: '1700000000', type: 'text', text: { body: 'Hola' } }],
        }))
        expect(result[0]).toMatchObject({ senderName: 'Ana' })
        const phoneWithUserId = await provider.parseWebhook(payload('messages', {
            contacts: [{ user_id: 'customer-id', profile: { name: 'Ana' } }],
            messages: [{ id: 'with-user-id', from: '573009876543', from_user_id: 'customer-id', timestamp: '1700000000', type: 'text', text: { body: 'Hola' } }],
        }))
        expect(phoneWithUserId[0]).toMatchObject({ senderName: 'Ana', from: '573009876543' })
        const unnamed = await provider.parseWebhook(payload('messages', {
            messages: [{ id: 'unnamed', from: '573009876543', timestamp: '1700000000', type: 'text', text: { body: 'Hola' } }],
        }))
        expect('senderName' in unnamed[0] && unnamed[0].senderName).toBeUndefined()
    })
    it('names an app echo using the customer profile, never the business profile', async () => {
        const result = await provider.parseWebhook(payload('smb_message_echoes', {
            contacts: [{ wa_id: '573001234567', profile: { name: 'Business' } }, { wa_id: '573009876543', profile: { name: 'Ana' } }],
            message_echoes: [{ id: 'echo', from: '573001234567', to: '573009876543', timestamp: '1700000000', type: 'text', text: { body: 'Hola' } }],
        }))
        expect(result[0]).toMatchObject({ from: '573009876543', origin: 'outbound', senderName: 'Ana' })
    })
    it('mirrors app echoes as outbound to the customer',async()=>{
        const result=await provider.parseWebhook(payload('smb_message_echoes',{message_echoes:[{id:'wamid.echo',from:'573001234567',to:'573009876543',timestamp:'1700000000',type:'text',text:{body:'Hola'}}]}))
        expect(result).toHaveLength(1); expect(result[0]).toMatchObject({origin:'outbound',from:'573009876543',metadata:{source:'business_app'}})
    })
    it('marks history so it cannot open a service window or trigger automations',async()=>{
        const result=await provider.parseWebhook(payload('history',{history:[{threads:[{id:'573009876543',messages:[{id:'wamid.history',from:'573009876543',timestamp:'1700000000',type:'text',text:{body:'old'}}]}]}]}))
        expect(result).toHaveLength(1); expect(result[0]).toMatchObject({metadata:{historical:true,source:'history'}})
    })
    it('does not turn social read receipts into blank messages',async()=>{
        expect(await provider.parseWebhook({object:'page',entry:[{id:'page',messaging:[{sender:{id:'customer'},read:{watermark:1}}]}]})).toEqual([])
    })
})

it('routes historical outbound messages using their thread when Meta omits to',async()=>{
 const result=await provider.parseWebhook(payload('history',{history:[{threads:[{id:'573009876543',messages:[{id:'history-out',from:'573001234567',timestamp:'1700000000',type:'text',text:{body:'old sent'}}]}]}]}))
 expect(result[0]).toMatchObject({from:'573009876543',origin:'outbound',metadata:{historical:true}})
})
it('treats later history media events as historical too',async()=>{
 const result=await provider.parseWebhook(payload('history',{messages:[{id:'late-history',from:'573009876543',timestamp:'1700000000',type:'text',text:{body:'late'}}]}))
 expect(result[0].metadata?.historical).toBe(true)
})

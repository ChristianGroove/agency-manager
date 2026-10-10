import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({from:vi.fn(),rpc:vi.fn(),send:vi.fn()}))
vi.mock('@/modules/core/database/supabase-admin',()=>({supabaseAdmin:{from:mocks.from,rpc:mocks.rpc}}))
vi.mock('@/modules/features/messaging/outbound-service',()=>({outboundService:{sendSystemMessage:mocks.send}}))
import { runMarketingCycle } from './marketing-runner'

function query(result:any) {
    const q:any={};for(const method of ['select','eq','update','gt','order','limit'])q[method]=vi.fn(()=>q)
    q.single=vi.fn(async()=>result);q.maybeSingle=q.single;return q
}
const claim={id:'enrollment-a',organization_id:'tenant-a',claim_token:'claim-a'}
const enrollment={...claim,status:'active',recipient:'573006705958',
    campaign:{id:'campaign-a',organization_id:'tenant-a',status:'active',connection_id:'channel-a',execution_version:2},
    sequence:{id:'sequence-a',campaign_id:'campaign-a',organization_id:'tenant-a',is_active:true},
    step:{id:'step-a',sequence_id:'sequence-a',organization_id:'tenant-a',type:'whatsapp',order_index:0,content:{template_name:'welcome'}},
    lead:{id:'lead-a',organization_id:'tenant-a',phone:'573006705958',marketing_opted_out:false},
}
beforeEach(()=>{vi.resetAllMocks();mocks.rpc.mockResolvedValue({data:[claim],error:null})})
describe('Marketing worker safety',()=>{
    const selection = { template_id: '08000000-0000-4000-8000-000000000001', template_name: 'promo', template_language: 'es', bindings: { 'body.1': '{{nombre}}' } }
    const prepared = { ...enrollment, step: { ...enrollment.step, content: selection }, lead: { ...enrollment.lead, name: 'Ana' } }
    const template = { id: selection.template_id, channel_id: 'channel-a', name: 'promo', language: 'es', status: 'APPROVED', category: 'MARKETING', meta_id: 'fixture', components: [{ type: 'BODY', text: 'Hola {{1}}' }] }
    it('does not use a session client and does not hide claim failures as an empty successful cycle',async()=>{
        mocks.rpc.mockResolvedValueOnce({data:null,error:{message:'RLS failure'}})
        await expect(runMarketingCycle()).rejects.toThrow('adquirir')
        expect(mocks.from).not.toHaveBeenCalled()
        expect(mocks.send).not.toHaveBeenCalled()
    })
    it.each(['paused','draft','archived','completed'])('does not send a %s campaign',async(status)=>{
        const checkpoint=query({data:{id:claim.id},error:null})
        mocks.from.mockReturnValueOnce(query({data:{...enrollment,campaign:{...enrollment.campaign,status}},error:null})).mockReturnValueOnce(checkpoint)
        const result=await runMarketingCycle()
        expect(result).toMatchObject({processed:0,deferred:1})
        expect(checkpoint.eq).toHaveBeenCalledWith('claim_token','claim-a')
        expect(mocks.send).not.toHaveBeenCalled()
    })
    it('excludes a revoked lead before attempting an outbound operation',async()=>{
        const checkpoint=query({data:{id:claim.id},error:null})
        mocks.from.mockReturnValueOnce(query({data:{...enrollment,lead:{...enrollment.lead,marketing_opted_out:true}},error:null})).mockReturnValueOnce(checkpoint)
        await runMarketingCycle()
        expect(checkpoint.update).toHaveBeenCalledWith(expect.objectContaining({status:'cancelled'}))
        expect(mocks.send).not.toHaveBeenCalled()
    })
    it('rejects a foreign-tenant step even when campaign and lead are in the same tenant',async()=>{
        mocks.from.mockReturnValueOnce(query({data:{...enrollment,step:{...enrollment.step,organization_id:'tenant-b'}},error:null}))
            .mockReturnValueOnce(query({data:{id:claim.id},error:null}))
        expect(await runMarketingCycle()).toMatchObject({processed:0,failed:1})
        expect(mocks.send).not.toHaveBeenCalled()
    })
    it('persists legacy delay.duration as a valid future checkpoint',async()=>{
        const checkpoint=query({data:{id:claim.id},error:null})
        mocks.from.mockReturnValueOnce(query({data:{...enrollment,step:{...enrollment.step,type:'delay',delay_config:{duration:'3',unit:'days'}}},error:null}))
            .mockReturnValueOnce(query({data:{id:'step-next'},error:null})).mockReturnValueOnce(checkpoint)
        const before=Date.now()
        expect(await runMarketingCycle()).toMatchObject({processed:1})
        const saved=checkpoint.update.mock.calls[0][0]
        expect(Date.parse(saved.next_run_at)-before).toBeGreaterThan(2.9*86400_000)
        expect(mocks.send).not.toHaveBeenCalled()
    })
    it('does not count a refused checkpoint as processed work',async()=>{
        mocks.from.mockReturnValueOnce(query({data:{...enrollment,step:{...enrollment.step,type:'delay',delay_config:{value:1,unit:'hours'}}},error:null}))
            .mockReturnValueOnce(query({data:null,error:null}))
            .mockReturnValueOnce(query({data:null,error:{code:'42501'}}))
            .mockReturnValueOnce(query({data:{id:claim.id},error:null}))
        expect(await runMarketingCycle()).toMatchObject({processed:0,failed:1})
    })
    it('cancels a recipient without consent before creating a conversation or emitting', async () => {
        const saved = query({ data: { id: claim.id }, error: null })
        mocks.rpc.mockResolvedValueOnce({ data: [claim], error: null }).mockResolvedValueOnce({ data: false, error: null })
        mocks.from.mockReturnValueOnce(query({ data: prepared, error: null })).mockReturnValueOnce(query({ data: null, error: null })).mockReturnValueOnce(saved)
        expect(await runMarketingCycle()).toMatchObject({ processed: 1 })
        expect(saved.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }))
        expect(mocks.send).not.toHaveBeenCalled()
        expect(mocks.from).not.toHaveBeenCalledWith('conversations')
    })
    it('passes a complete validated template through the existing outbox service', async () => {
        const saved = query({ data: { id: claim.id }, error: null })
        mocks.rpc.mockResolvedValueOnce({ data: [claim], error: null }).mockResolvedValueOnce({ data: true, error: null })
        mocks.from.mockReturnValueOnce(query({ data: prepared, error: null })).mockReturnValueOnce(query({ data: null, error: null }))
            .mockReturnValueOnce(query({ data: template, error: null })).mockReturnValueOnce(query({ data: { id: 'conversation-a' }, error: null })).mockReturnValueOnce(saved)
        mocks.send.mockResolvedValue({ success: true, externalId: 'wamid.fixture' })
        expect(await runMarketingCycle()).toMatchObject({ processed: 1, failed: 0 })
        expect(mocks.send).toHaveBeenCalledWith('conversation-a', expect.objectContaining({ templateComponents: [{ type: 'body', parameters: [{ type: 'text', text: 'Ana' }] }] }), 'whatsapp', 'channel-a', 'System', 'campaign:enrollment-a:step-a')
        expect(saved.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }))
    })
    it('does not emit when Meta pauses the selected template', async () => {
        mocks.rpc.mockResolvedValueOnce({ data: [claim], error: null }).mockResolvedValueOnce({ data: true, error: null })
        mocks.from.mockReturnValueOnce(query({ data: prepared, error: null })).mockReturnValueOnce(query({ data: null, error: null }))
            .mockReturnValueOnce(query({ data: { ...template, status: 'PAUSED' }, error: null })).mockReturnValueOnce(query({ data: { id: claim.id }, error: null }))
        expect(await runMarketingCycle()).toMatchObject({ failed: 1 })
        expect(mocks.send).not.toHaveBeenCalled()
    })
    it('fails closed if the consent store is unavailable', async () => {
        mocks.rpc.mockResolvedValueOnce({ data: [claim], error: null }).mockResolvedValueOnce({ data: null, error: { message: 'unavailable' } })
        mocks.from.mockReturnValueOnce(query({ data: prepared, error: null })).mockReturnValueOnce(query({ data: null, error: null }))
            .mockReturnValueOnce(query({ data: { id: claim.id }, error: null }))
        expect(await runMarketingCycle()).toMatchObject({ failed: 1 })
        expect(mocks.send).not.toHaveBeenCalled()
        expect(mocks.from).not.toHaveBeenCalledWith('conversations')
    })
})

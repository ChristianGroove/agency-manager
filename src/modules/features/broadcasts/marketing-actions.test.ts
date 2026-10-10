import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(()=>({ access:vi.fn(), session:vi.fn(), admin:vi.fn(), revalidate:vi.fn() }))
vi.mock('./marketing-access',()=>({requireMarketingAccess:mocks.access}))
vi.mock('@/modules/core/database/supabase-server',()=>({createClient:mocks.session}))
vi.mock('@/modules/core/database/supabase-admin',()=>({supabaseAdmin:{from:mocks.admin}}))
vi.mock('next/cache',()=>({revalidatePath:mocks.revalidate}))
import * as actions from './marketing-actions'

beforeEach(()=>{ vi.resetAllMocks(); mocks.access.mockRejectedValue(new Error('No tienes acceso a esta organización.')) })
describe('Marketing server action boundaries',()=>{
    it.each([
        ['deleteAudience',['audience-b']], ['getCampaign',['campaign-b']], ['updateCampaign',['campaign-b',{status:'paused'}]],
        ['deleteCampaign',['campaign-b']], ['getSequences',['campaign-b']], ['deleteSequence',['sequence-b']],
        ['updateStep',['step-b',{}]], ['deleteStep',['step-b']], ['linkAudienceToCampaign',['campaign-b','audience-b']],
        ['createQuickCampaign',[{name:'test'}]], ['enrollAudienceInCampaign',['campaign-b']], ['optOutLead',['lead-b']],
        ['importLeads',[[{phone:'573006705958'}]]], ['previewAudienceCount',[{}]],
    ])('rejects %s before touching privileged data',async(name,args)=>{
        const result = await (actions as any)[name](...args)
        expect(result.success).toBe(false)
        expect(mocks.admin).not.toHaveBeenCalled()
        expect(mocks.session).not.toHaveBeenCalled()
    })
    it('scopes audience deletion and uses the session/RLS client',async()=>{
        const q:any={}; q.delete=vi.fn(()=>q); q.eq=vi.fn(()=>q); q.select=vi.fn(()=>q); q.single=vi.fn(async()=>({data:{id:'audience-b'},error:null}))
        const from=vi.fn(()=>q)
        mocks.access.mockResolvedValue({organizationId:'tenant-a'})
        mocks.session.mockResolvedValue({from})
        expect((await actions.deleteAudience('audience-b')).success).toBe(true)
        expect(q.eq).toHaveBeenCalledWith('organization_id','tenant-a')
        expect(q.eq).toHaveBeenCalledWith('id','audience-b')
        expect(mocks.admin).not.toHaveBeenCalled()
    })
    it('rejects an attempted organization change in an update payload',async()=>{
        mocks.access.mockResolvedValue({organizationId:'tenant-a'})
        const result=await actions.updateCampaign('campaign-a',{organization_id:'tenant-b'} as any)
        expect(result.success).toBe(false)
        expect(mocks.session).not.toHaveBeenCalled()
        expect(mocks.admin).not.toHaveBeenCalled()
    })
    it('cannot enable campaigns or import contacts through the unfinished legacy paths',async()=>{
        mocks.access.mockResolvedValue({organizationId:'tenant-a'})
        const from=vi.fn()
        mocks.session.mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:'user-a'}}})},from})
        expect((await actions.enrollAudienceInCampaign('campaign-a')).success).toBe(false)
        expect((await actions.importLeads([{phone:'573006705958'}])).success).toBe(false)
        expect(from).not.toHaveBeenCalled()
    })
})

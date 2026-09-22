import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { EmbeddedSignupHandler } from './embedded-signup-handler'
import { decryptObject } from '@/modules/infrastructure/integrations/encryption'
const mock = vi.hoisted(() => ({createClient:vi.fn()}))
vi.mock('@/modules/core/database/supabase-server',()=>({createClient:mock.createClient}))
function setup(options: {coexistence?: boolean; existing?: any; subscriptionFails?: boolean; claimed?: boolean; historyFails?: boolean} = {}) {
 const mutations: any[] = []
 const query: any = {select:()=>query,eq:()=>query,neq:()=>query,in:()=>query,
   maybeSingle:async()=>({data:options.existing || null,error:null}),
   insert:(p:any)=>{mutations.push(p);return query},update:(p:any)=>{mutations.push(p);return query},
   single:async()=>({data:{id:'connection'},error:null}),then:(r:any)=>Promise.resolve({error:null}).then(r)}
 const rpc=vi.fn(async (name:string)=>({data:name==='claim_meta_coexistence_sync' ? options.claimed!==false : null,error:null}))
 mock.createClient.mockResolvedValue({from:()=>query,rpc})
 const fetcher=vi.fn(async (url:any, init:any)=>{
   const path=new URL(String(url)).pathname
   let data:any={success:true};let status=200
   if(path.endsWith('/oauth/access_token')) data={access_token:'private-token'}
   else if(path.endsWith('/phone_numbers')) data={data:[{id:'222',display_phone_number:'573001234567',verified_name:'Business'}]}
   else if(path.endsWith('/222')) data={is_on_biz_app:!!options.coexistence,platform_type:options.coexistence?'CLOUD_API':'NOT_REGISTERED'}
   else if(path.endsWith('/subscribed_apps') && options.subscriptionFails) {data={error:{code:190,message:'secret-token rejected'}};status=400}
   else if(path.endsWith('/smb_app_data')) {
    const kind=JSON.parse(init.body).sync_type
    if(kind==='history' && options.historyFails) {data={error:{code:190}};status=400}
    else data={request_id:kind+'-request'}
   }
   return new Response(JSON.stringify(data),{status})
 })
 vi.stubGlobal('fetch',fetcher)
 return {mutations,fetcher,rpc}
}
beforeEach(()=>{vi.stubEnv('META_APP_ID','123');vi.stubEnv('META_APP_SECRET','secret');vi.spyOn(console,'error').mockImplementation(()=>{})})
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks()})
describe('Embedded Signup asset ownership and coexistence',()=>{
 it('registers a new Cloud number and stores only ciphertext',async()=>{
  const {mutations,fetcher}=setup()
  expect(await new EmbeddedSignupHandler().completeOnboarding('org','code','111','222')).toMatchObject({success:true})
  expect(fetcher.mock.calls.some(([url])=>String(url).endsWith('/register'))).toBe(true)
  expect(mutations[0].credentials).toHaveProperty('_encrypted')
  expect(decryptObject(mutations[0].credentials).access_token).toBe('private-token')
  expect(mutations.at(-1).status).toBe('active')
 })
 it('never registers a coexistence number and captures sync request IDs',async()=>{
  const {fetcher,rpc}=setup({coexistence:true})
  expect(await new EmbeddedSignupHandler().completeOnboarding('org','code','111','222','coexistence')).toMatchObject({success:true,syncStatus:'requested'})
  expect(fetcher.mock.calls.some(([url])=>String(url).endsWith('/register'))).toBe(false)
  expect(rpc).toHaveBeenCalledWith('set_meta_connection_metadata',expect.objectContaining({p_patch:expect.objectContaining({history_sync_request_id:'history-request'})}))
 })
 it('does not repeat history requests on reconnection or concurrent claim loss',async()=>{
  const {fetcher}=setup({coexistence:true,claimed:false,existing:{id:'connection',metadata:{contacts_sync_request_id:'contacts',history_sync_request_id:'history'}}})
  expect(await new EmbeddedSignupHandler().completeOnboarding('org','code','111','222','coexistence')).toMatchObject({success:true})
  expect(fetcher.mock.calls.some(([url])=>String(url).endsWith('/smb_app_data'))).toBe(false)
 })
 it('keeps the contacts request ID when the history request fails and pauses sends',async()=>{
  const {rpc,mutations}=setup({coexistence:true,historyFails:true})
  expect(await new EmbeddedSignupHandler().completeOnboarding('org','code','111','222','coexistence'))
   .toMatchObject({success:true,syncStatus:'action_required'})
  expect(rpc).toHaveBeenCalledWith('set_meta_connection_metadata',expect.objectContaining({
   p_patch:expect.objectContaining({contacts_sync_request_id:'smb_app_state_sync-request'})
  }))
  expect(mutations.at(-1).status).toBe('action_required')
 })
 it('requires app offboarding before retrying an expired coexistence signup',async()=>{
  const {mutations}=setup({coexistence:true,existing:{id:'connection',status:'action_required',metadata:{onboarding_status:'offboard_required'}}})
  expect(await new EmbeddedSignupHandler().completeOnboarding('org','code','111','222','coexistence')).toMatchObject({success:false})
  expect(mutations).toHaveLength(0)
 })
 it('rejects a phone that is outside the granted WABA before saving',async()=>{
  const {mutations}=setup()
  expect(await new EmbeddedSignupHandler().completeOnboarding('org','code','111','999')).toMatchObject({success:false})
  expect(mutations).toHaveLength(0)
 })
 it('does not mark an unsubscribed channel active or disclose Graph details',async()=>{
  const {mutations}=setup({subscriptionFails:true})
  const result=await new EmbeddedSignupHandler().completeOnboarding('org','code','111','222')
  expect(result.success).toBe(false);expect(JSON.stringify(result)).not.toContain('secret-token')
  expect(mutations.some(m=>m.status==='active')).toBe(false)
  expect(mutations.at(-1).status).toBe('error')
 })
})

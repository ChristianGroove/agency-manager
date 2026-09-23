import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'crypto'
const mocks=vi.hoisted(()=>({cookies:vi.fn(),user:vi.fn(),role:vi.fn(),from:vi.fn()}))
vi.mock('next/headers',()=>({cookies:mocks.cookies}))
vi.mock('@/modules/core/database/supabase-server',()=>({createClient:async()=>({auth:{getUser:mocks.user}})}))
vi.mock('@/modules/core/database/supabase-admin',()=>({supabaseAdmin:{from:mocks.from}}))
vi.mock('@/modules/core/iam/services/org-roles',()=>({getCurrentOrgRole:mocks.role}))
import { createMetaOAuthState } from './oauth-state'
import { consumeMetaOAuthSession, issueMetaOAuthSession } from './oauth-session'
let cookie:string|undefined
let consumed=false
let query:any
beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv('META_OAUTH_STATE_SECRET','session-test-secret');cookie=undefined;consumed=false
 mocks.cookies.mockResolvedValue({get:()=>cookie?{value:cookie}:undefined,set:(_k:string,v:string)=>{cookie=v},delete:()=>{cookie=undefined}})
 mocks.user.mockResolvedValue({data:{user:{id:'user1'}}});mocks.role.mockResolvedValue('admin')
 query={insert:vi.fn(async()=>({error:null})),update:vi.fn(()=>query),eq:vi.fn(()=>query),is:vi.fn(()=>query),gt:vi.fn(()=>query),select:vi.fn(()=>query),maybeSingle:vi.fn(async()=>{const data=consumed?null:{state_hash:cookie};consumed=true;return {data,error:null}})}
 mocks.from.mockReturnValue(query)
})
describe('OAuth browser, identity and one-use binding',()=>{
 it('allows one issued session and rejects a replay even with a copied cookie',async()=>{
  const state=await issueMetaOAuthSession('org1',{flow:'embedded'});const savedCookie=cookie
  expect(await consumeMetaOAuthSession(state)).toMatchObject({orgId:'org1',userId:'user1',flow:'embedded'})
  cookie=savedCookie
  await expect(consumeMetaOAuthSession(state)).rejects.toThrow('already used')
  expect(query.is).toHaveBeenCalledWith('consumed_at',null)
  expect(query.eq).toHaveBeenCalledWith('organization_id','org1')
  expect(query.gt).toHaveBeenCalledWith('expires_at',expect.any(String))
 })
 it('rejects a valid signature without the initiating browser cookie',async()=>{
  const state=createMetaOAuthState({orgId:'org1',userId:'user1'})
  await expect(consumeMetaOAuthSession(state)).rejects.toThrow('session mismatch')
  expect(mocks.from).not.toHaveBeenCalled()
 })
 it('rejects an authenticated different user before consuming the nonce',async()=>{
  const state=createMetaOAuthState({orgId:'org1',userId:'user2'})
  cookie=createHash('sha256').update(state).digest('hex')
  await expect(consumeMetaOAuthSession(state)).rejects.toThrow('Unauthorized')
  expect(mocks.from).not.toHaveBeenCalled()
 })
 it('rechecks administrator rights at callback time',async()=>{
  const state=await issueMetaOAuthSession('org1');mocks.role.mockResolvedValue('member')
  await expect(consumeMetaOAuthSession(state)).rejects.toThrow('Forbidden')
  expect(query.update).not.toHaveBeenCalled()
 })
 it('does not issue sessions for ordinary members',async()=>{
  mocks.role.mockResolvedValue('member')
  await expect(issueMetaOAuthSession('org1')).rejects.toThrow('Forbidden')
  expect(mocks.from).not.toHaveBeenCalled()
 })
})

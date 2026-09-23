import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'
const mocks=vi.hoisted(() => ({ upsert: vi.fn(), process: vi.fn() }))
vi.mock('@/modules/core/database/supabase-admin',() => ({ supabaseAdmin:{ from:() => ({upsert:mocks.upsert}) } }))
vi.mock('@/modules/infrastructure/meta/services/process-persisted-webhook',() => ({ processPersistedMetaWebhook:mocks.process }))
import { POST } from './route'
const body=JSON.stringify({object:'whatsapp_business_account',entry:[]})
function request(raw=body, signed=true) { return new NextRequest('https://pixy.test/api/webhooks/messaging',{ method:'POST',body:raw,headers:signed?{'x-hub-signature-256':'sha256='+createHmac('sha256','secret').update(raw).digest('hex')}:{} }) }
beforeEach(() => { vi.stubEnv('META_APP_SECRET','secret'); mocks.upsert.mockResolvedValue({error:null}); mocks.process.mockResolvedValue(undefined); vi.spyOn(console,'log').mockImplementation(()=>{}); vi.spyOn(console,'error').mockImplementation(()=>{}) })
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks() })
describe('signed durable Meta webhook',() => {
    it('rejects unsigned events before any effects even in development',async()=>{vi.stubEnv('NODE_ENV','development');expect((await POST(request(body,false))).status).toBe(401);expect(mocks.upsert).not.toHaveBeenCalled();expect(mocks.process).not.toHaveBeenCalled()})
    it('rejects tampered signatures',async()=>{const req=request();req.headers.set('x-hub-signature-256','sha256='+'0'.repeat(64));expect((await POST(req)).status).toBe(401)})
    it('fails closed without the app secret',async()=>{vi.stubEnv('META_APP_SECRET','');expect((await POST(request())).status).toBe(503)})
    it('persists before processing and returns success without Inngest',async()=>{expect((await POST(request())).status).toBe(200);expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({channel:'whatsapp'}),expect.objectContaining({ignoreDuplicates:true}));expect(mocks.process).toHaveBeenCalledWith(expect.any(String));expect(mocks.upsert.mock.invocationCallOrder[0]).toBeLessThan(mocks.process.mock.invocationCallOrder[0])})
    it('asks Meta to retry when processing fails',async()=>{mocks.process.mockRejectedValue(new Error('offline'));expect((await POST(request())).status).toBe(500)})
    it('rejects the loopback channel on the public endpoint',async()=>{expect((await POST(request(JSON.stringify({object:'email',entry:[]})))).status).toBe(400);expect(mocks.process).not.toHaveBeenCalled()})
})

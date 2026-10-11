import { NextRequest } from 'next/server'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), create: vi.fn(), send: vi.fn(), close: vi.fn(), decrypt: vi.fn(), rpc: vi.fn() }))
vi.mock('node:dns/promises', () => ({ lookup: mocks.lookup, default: { lookup: mocks.lookup } }))
vi.mock('nodemailer', () => ({ default: { createTransport: mocks.create } }))
vi.mock('@/modules/core/security/encryption', () => ({ decrypt: mocks.decrypt }))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { rpc: mocks.rpc } }))
import { emailContentSchema, normalizeMarketingEmail, parseEmailListImport, personalizeEmail, renderCampaignEmail } from './marketing-email-contracts'
import { openCampaignSmtp, publicSmtpAddress, smtpFailure } from './marketing-email-transport'
import { processEmailClaim } from './marketing-email-worker'
import { GET, POST } from '@/app/api/marketing/email/unsubscribe/route'

const config = { host: 'smtp.example.com', port: 587, from_email: 'sender@example.com', from_name: 'Company', user_email: 'sender@example.com', password_encrypted: 'encrypted', iv: 'iv' }
beforeEach(() => { vi.resetAllMocks(); mocks.lookup.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]); mocks.create.mockReturnValue({ sendMail: mocks.send, close: mocks.close }); mocks.decrypt.mockReturnValue('synthetic password'); vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://pixy.example.com') })
afterEach(() => vi.unstubAllEnvs())
describe('Campaign email contracts and transport', () => {
    it('imports emails without requiring a phone and preserves rejected rows', () => {
        const parsed = parseEmailListImport('email,nombre\nUSER@example.com,Ana\ninvalid,Invalid')
        expect(parsed.valid).toEqual([{ row: 2, email: 'user@example.com', name: 'Ana' }]); expect(parsed.invalid).toHaveLength(1)
        expect(normalizeMarketingEmail('victim@example.com\r\nBcc:attack@example.com')).toBeNull()
    })
    it('rejects subject injection and unsupported variables before dispatch', () => {
        expect(emailContentSchema.safeParse({ subject: 'Hi\r\nBcc:attack@example.com', body: 'Hi' }).success).toBe(false)
        expect(emailContentSchema.safeParse({ subject: 'Hi', body: '{{secret}}' }).success).toBe(false)
        expect(() => personalizeEmail({ subject: '{{empresa}}', body: 'Hi' }, { email: 'a@example.com' })).toThrow('empresa')
    })
    it('escapes contact data and keeps the unsubscribe footer in HTML and text', () => {
        const rendered = renderCampaignEmail(personalizeEmail({ subject: '{{nombre}}', body: '{{nombre}}' }, { name: '<img onerror=alert(1)>', email: 'a@example.com' }), 'Company', 'https://pixy.example.com/unsubscribe')
        expect(rendered.html).not.toContain('<img'); expect(rendered.html).toContain('&lt;img'); expect(rendered.text).toContain('https://pixy.example.com/unsubscribe')
    })
    it.each(['127.0.0.1', '10.0.0.1', '169.254.169.254', '172.16.0.1', '192.168.0.1', '100.64.0.1', '::1', 'fe80::1', '::ffff:127.0.0.1'])('blocks internal SMTP destination %s', address => { expect(publicSmtpAddress(address)).toBe(false) })
    it('blocks a DNS answer containing a private address before reading credentials', async () => {
        mocks.lookup.mockResolvedValue([{ address: '8.8.8.8' }, { address: '127.0.0.1' }])
        await expect(openCampaignSmtp(config)).rejects.toThrow('pública'); expect(mocks.decrypt).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled()
    })
    it('bounds an unresponsive DNS lookup before any SMTP connection', async () => {
        vi.useFakeTimers()
        try {
            mocks.lookup.mockReturnValue(new Promise(() => {}))
            const rejection = expect(openCampaignSmtp(config)).rejects.toThrow('DNS')
            await vi.advanceTimersByTimeAsync(5000)
            await rejection
            expect(mocks.create).not.toHaveBeenCalled()
        } finally { vi.useRealTimers() }
    })
    it('pins public DNS, enforces TLS, sends individually and reports only acceptance', async () => {
        mocks.send.mockResolvedValue({ accepted: ['recipient@example.com'], messageId: '<synthetic>' })
        const transport = await openCampaignSmtp(config)
        expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ host: '8.8.8.8', requireTLS: true, tls: { servername: 'smtp.example.com', rejectUnauthorized: true }, disableUrlAccess: true, disableFileAccess: true }))
        expect(await transport.send({ recipient: 'recipient@example.com', content: { subject: 'Hello', body: 'Body' }, unsubscribeUrl: 'https://pixy.example.com/unsubscribe', messageId: '<stable-id>' })).toEqual({ status: 'accepted', messageId: '<synthetic>' })
        expect(mocks.send.mock.calls[0][0]).toMatchObject({ to: 'recipient@example.com', messageId: '<stable-id>', headers: { 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
        expect(mocks.send.mock.calls[0][0]).not.toHaveProperty('bcc'); transport.close(); expect(mocks.close).toHaveBeenCalledOnce()
    })
    it('preserves ambiguous SMTP failure instead of pretending failure is safe to retry', () => {
        expect(smtpFailure({ command: 'DATA', code: 'ETIMEDOUT' }).status).toBe('unknown')
        expect(smtpFailure({ responseCode: 550 }).status).toBe('failed')
        expect(smtpFailure({ code: 'EAUTH' }).status).toBe('failed')
    })
})
function query(data: unknown) { const q: any = {}; for (const name of ['update','select','eq','gt','order','limit']) q[name] = vi.fn(() => q); q.single = q.maybeSingle = vi.fn(async () => ({ data, error: null })); return q }
function workerFixture(state: string) {
    const db = { from: vi.fn((table: string) => query(table === 'marketing_enrollments' ? { id: 'enrollment' } : table === 'organization_smtp_configs' ? config : null)), rpc: vi.fn(async (name: string) => ({ data: name === 'marketing_email_allowed' ? true : name === 'finish_marketing_email' ? true : { state, id: 'operation', unsubscribeToken: 'a'.repeat(64) }, error: null })) }
    const row = { id: 'enrollment', organization_id: 'tenant', status: 'active', recipient: 'recipient@example.com', recipient_snapshot: { name: 'Ana' }, lead: { email: 'recipient@example.com' }, campaign: { status: 'active', execution_version: 3, smtp_config_id: 'smtp', delivery_config: { mode: 'growth', humanize: false, timezone: 'America/Bogota' } }, sequence: { id: 'sequence', is_active: true }, step: { id: 'step', type: 'email', order_index: 0, content: { subject: 'Hello {{nombre}}', body: 'Body' } } }
    return { db, row, claim: { claim_token: 'claim' } }
}
describe('Email worker recovery and unsubscribe', () => {
    it('recovers an accepted reservation without connecting SMTP or sending again', async () => {
        const f = workerFixture('accepted'); expect(await processEmailClaim(f.db, f.claim, f.row)).toBe('processed'); expect(mocks.lookup).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled()
    })
    it('retains an unknown reservation for review without a duplicate submission', async () => {
        const f = workerFixture('unknown'); await expect(processEmailClaim(f.db, f.claim, f.row)).rejects.toThrow('No se reenvía'); expect(mocks.send).not.toHaveBeenCalled()
    })
    it('records uncertain submission after DATA and closes the transport', async () => {
        const f = workerFixture('reserved'); mocks.send.mockRejectedValue({ command: 'DATA', code: 'ETIMEDOUT' })
        await expect(processEmailClaim(f.db, f.claim, f.row)).rejects.toThrow('no confirmó')
        expect(f.db.rpc).toHaveBeenCalledWith('finish_marketing_email', expect.objectContaining({ p_status: 'unknown', p_org: 'tenant', p_outbox: 'operation' })); expect(mocks.close).toHaveBeenCalledOnce()
    })
    it('cancels a changed email without reaching the transport', async () => {
        const f = workerFixture('reserved'); f.row.lead.email = 'changed@example.com'; expect(await processEmailClaim(f.db, f.claim, f.row)).toBe('processed'); expect(f.db.rpc).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled()
    })
    it('does not unsubscribe from a scanner GET and revokes only by a hashed token on POST', async () => {
        const url = 'https://pixy.example.com/api/marketing/email/unsubscribe?token=' + 'a'.repeat(64)
        expect((await GET(new NextRequest(url))).status).toBe(200); expect(mocks.rpc).not.toHaveBeenCalled()
        mocks.rpc.mockResolvedValue({ data: true, error: null }); expect((await POST(new NextRequest(url, { method: 'POST' }))).status).toBe(200)
        expect(mocks.rpc).toHaveBeenCalledWith('unsubscribe_marketing_email', { p_hash: expect.stringMatching(/^[a-f0-9]{64}$/) }); expect(mocks.rpc.mock.calls[0][1].p_hash).not.toBe('a'.repeat(64))
    })
    it('rejects invalid tokens without any database mutation', async () => { expect((await POST(new NextRequest('https://pixy.example.com/?token=bad', { method: 'POST' }))).status).toBe(400); expect(mocks.rpc).not.toHaveBeenCalled() })
})

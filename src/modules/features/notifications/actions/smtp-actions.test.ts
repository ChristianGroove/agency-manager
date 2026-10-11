import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ client: vi.fn(), verify: vi.fn(), create: vi.fn(), upsert: vi.fn(), encrypt: vi.fn() }))
vi.mock('@/modules/core/database/supabase-server', () => ({ createClient: mocks.client }))
vi.mock('@/modules/core/security/encryption', () => ({ encrypt: mocks.encrypt, decrypt: vi.fn() }))
vi.mock('nodemailer', () => ({ default: { createTransport: mocks.create } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { saveSmtpConfig } from './smtp-actions'
const config = { organization_id: '51000000-0000-4000-8000-000000000001', provider: 'custom' as const, host: 'smtp.example.com', port: 587, user_email: 'sender@example.com', from_email: 'sender@example.com', from_name: 'Company' }
function client(status = 'active', existing: any = { ...config, is_verified: true }) {
    return { auth: { getUser: async () => ({ data: { user: { id: 'actor' } } }) }, from: vi.fn((table: string) => {
        const q: any = {}; for (const method of ['select','eq']) q[method] = vi.fn(() => q)
        q.single = async () => ({ data: { role: 'owner', status } }); q.maybeSingle = async () => ({ data: existing })
        q.upsert = mocks.upsert; return q
    }) }
}
beforeEach(() => { vi.resetAllMocks(); mocks.client.mockResolvedValue(client()); mocks.create.mockReturnValue({ verify: mocks.verify }); mocks.upsert.mockResolvedValue({ error: null }); mocks.encrypt.mockReturnValue({ encryptedData: 'encrypted', iv: 'iv' }) })
describe('Existing SMTP verification integrity', () => {
    it('rejects inactive memberships before reading or changing credentials', async () => {
        mocks.client.mockResolvedValue(client('suspended')); await expect(saveSmtpConfig(config, 'synthetic')).rejects.toThrow('Unauthorized'); expect(mocks.verify).not.toHaveBeenCalled(); expect(mocks.upsert).not.toHaveBeenCalled()
    })
    it('does not silently verify an endpoint changed without a password', async () => {
        const result = await saveSmtpConfig({ ...config, host: 'different.example.com' }); expect(result.success).toBe(false); expect(mocks.upsert).not.toHaveBeenCalled(); expect(mocks.verify).not.toHaveBeenCalled()
    })
    it('requires verification for a new configuration', async () => {
        mocks.client.mockResolvedValue(client('active', null)); expect((await saveSmtpConfig(config)).success).toBe(false); expect(mocks.upsert).not.toHaveBeenCalled()
    })
    it('preserves the encrypted password on a display-name-only edit to the verified sender', async () => {
        expect((await saveSmtpConfig({ ...config, from_name: 'Updated display name' })).success).toBe(true); expect(mocks.verify).not.toHaveBeenCalled(); expect(mocks.upsert.mock.calls[0][0]).not.toHaveProperty('password_encrypted')
    })
    it('verifies TLS before saving newly encrypted credentials', async () => {
        expect((await saveSmtpConfig(config, 'synthetic')).success).toBe(true); expect(mocks.verify).toHaveBeenCalledOnce(); expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ requireTLS: true, logger: false, debug: false })); expect(mocks.upsert.mock.calls[0][0]).toMatchObject({ password_encrypted: 'encrypted', iv: 'iv', is_verified: true })
    })
    it('does not leak a provider error containing secrets into the browser or persist a failed verification', async () => {
        mocks.verify.mockRejectedValue(new Error('secret credential echoed by server')); const result = await saveSmtpConfig(config, 'synthetic'); expect(result.success).toBe(false); expect(result.error).not.toContain('secret'); expect(mocks.upsert).not.toHaveBeenCalled()
    })
})

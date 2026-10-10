import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ preview: vi.fn(), contacts: vi.fn(), commit: vi.fn(), activation: vi.fn(), enroll: vi.fn(), renewal: vi.fn(), renew: vi.fn() }))
vi.mock('../marketing-review-actions', () => ({ prepareMarketingImport: mocks.preview, confirmMarketingImport: mocks.commit,
    prepareMarketingContactImport: mocks.contacts, prepareCampaignActivation: mocks.activation, prepareMarketingRenewal: mocks.renewal, confirmMarketingRenewal: mocks.renew }))
vi.mock('../marketing-actions', () => ({ enrollAudienceInCampaign: mocks.enroll }))
import { CampaignImport } from './campaign-import'
import { CampaignActivationReview } from './campaign-activation-review'
import { MarketingRenewal } from './marketing-renewal'
const token = '09000000-0000-4000-8000-000000000001'
const expiresAt = '2099-01-01T00:00:00Z'
const review = { token, expiresAt, issues: [], enabled: false, resume: false, audience: null, connectionId: null, channelName: 'Synthetic emitter',
    timezone: 'America/Bogota', mode: 'growth', window: { start: 9, end: 18 }, scheduledFor: null, steps: [] }
beforeEach(() => { vi.resetAllMocks(); mocks.activation.mockResolvedValue({ success: true, review }) })
describe('Explicit reviewed operations UI', () => {
    it('shows the saved review while sending stays disabled and never calls activation implicitly', async () => {
        render(<CampaignActivationReview campaignId="campaign" onClose={vi.fn()} onActivated={vi.fn()} />)
        await screen.findByText('Synthetic emitter')
        expect(screen.getByRole('button', { name: 'Confirmar activación' })).toBeDisabled()
        expect(mocks.enroll).not.toHaveBeenCalled()
    })
    it('requires confirmation and preserves a rejected stale review without reporting success', async () => {
        mocks.activation.mockResolvedValue({ success: true, review: { ...review, enabled: true } })
        mocks.enroll.mockResolvedValue({ success: false, error: 'Recipients changed; review again' })
        const done = vi.fn()
        render(<CampaignActivationReview campaignId="campaign" onClose={vi.fn()} onActivated={done} />)
        await screen.findByText('Synthetic emitter')
        expect(screen.getByRole('button', { name: 'Confirmar activación' })).toBeDisabled()
        fireEvent.click(screen.getByRole('checkbox'))
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar activación' }))
        expect(await screen.findByRole('alert')).toHaveTextContent('Recipients changed')
        expect(mocks.enroll).toHaveBeenCalledWith('campaign', { token, confirmed: true }); expect(done).not.toHaveBeenCalled()
    })
    it('reviews CSV without importing, excludes opted-out rows and commits only explicitly selected rows', async () => {
        mocks.preview.mockResolvedValue({ success: true, review: { token, expiresAt, rows: [
            { row: 2, name: 'Synthetic one', phone: '573001234567', eligible: true, reason: 'new' },
            { row: 3, name: 'Synthetic withdrawal', phone: '573001234568', eligible: false, reason: 'opted_out' },
        ] } })
        mocks.commit.mockResolvedValue({ success: true, result: { created: 1, existing: 0, consents: 1 } })
        render(<CampaignImport onClose={vi.fn()} />)
        const file = new File([''], 'synthetic.csv', { type: 'text/csv' })
        Object.defineProperty(file, 'text', { value: async () => 'nombre,telefono,email,origen_autorizacion,evidencia,fecha_autorizacion\nSynthetic one,+573001234567,,form,evidence,2026-01-01T00:00:00Z\nSynthetic withdrawal,+573001234568,,form,evidence,2026-01-01T00:00:00Z' })
        fireEvent.change(screen.getByLabelText('Archivo CSV'), { target: { files: [file] } })
        await screen.findByLabelText('Importar fila 3')
        expect(mocks.commit).not.toHaveBeenCalled(); expect(screen.getByLabelText('Importar fila 3')).toBeDisabled()
        fireEvent.click(screen.getByLabelText('Importar fila 2'))
        fireEvent.click(screen.getByLabelText(/He revisado las filas/))
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar importación (1)' }))
        await screen.findByText(/1 contactos de marketing creados/)
        expect(mocks.commit).toHaveBeenCalledWith({ token, rows: [2], confirmed: true, listName: 'synthetic' })
    })
    it('imports a plain list including a withdrawn contact without granting permission or activating messages', async () => {
        mocks.contacts.mockResolvedValue({ success: true, review: { token, expiresAt, rows: [
            { row: 2, name: '573001234567', phone: '573001234567', eligible: true, reason: 'contact_new' },
            { row: 3, name: 'Keep withdrawal', phone: '573001234568', eligible: true, reason: 'contact_withdrawn' },
            { row: 4, name: 'Duplicate', phone: '573001234567', eligible: false, reason: 'duplicate' },
        ] } })
        mocks.commit.mockResolvedValue({ success: true, result: { created: 1, existing: 1, consents: 0, listId: token, listName: 'plain' } })
        const useList = vi.fn()
        render(<CampaignImport onClose={vi.fn()} onImported={useList} />)
        const file = new File([''], 'plain.csv', { type: 'text/csv' })
        Object.defineProperty(file, 'text', { value: async () => 'telefono\n+573001234567\n+573001234568\n+573001234567' })
        fireEvent.change(screen.getByLabelText('Archivo CSV'), { target: { files: [file] } })
        await screen.findByLabelText('Importar fila 3')
        expect(screen.getByLabelText('Importar fila 2')).toBeChecked()
        expect(screen.getByLabelText('Importar fila 3')).toBeChecked()
        expect(screen.getByLabelText('Importar fila 4')).toBeDisabled()
        expect(mocks.preview).not.toHaveBeenCalled()
        expect(mocks.commit).not.toHaveBeenCalled()
        fireEvent.click(screen.getByLabelText(/Confirmo la importación de los contactos/))
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar importación (2)' }))
        await screen.findByText(/1 contactos de marketing creados y 1 contactos conservados/)
        expect(mocks.commit).toHaveBeenCalledWith({ token, rows: [2, 3], confirmed: true, listName: 'plain', mode: 'contacts' })
        expect(useList).not.toHaveBeenCalled()
        expect(mocks.enroll).not.toHaveBeenCalled()
        fireEvent.click(screen.getByRole('button', { name: 'Usar esta lista en la campaña' }))
        expect(useList).toHaveBeenCalledWith({ id: token, name: 'plain' })
    })
    it('invalidates the withdrawal review when the phone changes', async () => {
        mocks.renewal.mockResolvedValue({ success: true, review: { token, expiresAt, after: '2026-01-01T00:00:00Z' } })
        render(<MarketingRenewal onClose={vi.fn()} onSaved={vi.fn()} />)
        fireEvent.change(screen.getByLabelText('Teléfono internacional'), { target: { value: '573001234567' } })
        fireEvent.click(screen.getByRole('button', { name: 'Revisar baja' }))
        await screen.findByLabelText('Origen de la nueva autorización')
        await waitFor(() => expect(screen.getByLabelText('Teléfono internacional')).toBeEnabled())
        fireEvent.change(screen.getByLabelText('Teléfono internacional'), { target: { value: '573001234568' } })
        expect(screen.queryByLabelText('Origen de la nueva autorización')).not.toBeInTheDocument()
        expect(mocks.renew).not.toHaveBeenCalled()
    })
})

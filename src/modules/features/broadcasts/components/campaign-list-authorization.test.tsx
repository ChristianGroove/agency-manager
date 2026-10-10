import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ prepare: vi.fn(), confirm: vi.fn() }))
vi.mock('../marketing-review-actions', () => ({ prepareMarketingListAuthorization: mocks.prepare, confirmMarketingListAuthorization: mocks.confirm }))
import { CampaignListAuthorization } from './campaign-list-authorization'
const token = '09000000-0000-4000-8000-000000000001'
const review = { token, expiresAt: '2099-01-01T00:00:00Z', listName: 'Synthetic list', contacts: 100, toAuthorize: 95, excluded: 5 }
beforeEach(() => { vi.resetAllMocks(); mocks.prepare.mockResolvedValue({ success: true, review }); mocks.confirm.mockResolvedValue({ success: true, result: { authorized: 95 } }) })

describe('External permission declaration for a list', () => {
    it('only reviews on open, excludes withdrawals and requires an explicit declaration without a mandatory reference', async () => {
        const saved = vi.fn()
        render(<CampaignListAuthorization listId={token} onClose={vi.fn()} onSaved={saved} />)
        await screen.findByText('95 contactos pendientes de registrar')
        expect(screen.getByText(/Fuera de esta declaración: 5/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Registrar declaración' })).toBeDisabled()
        expect(mocks.confirm).not.toHaveBeenCalled()
        fireEvent.click(screen.getByRole('checkbox'))
        fireEvent.click(screen.getByRole('button', { name: 'Registrar declaración' }))
        await vi.waitFor(() => expect(saved).toHaveBeenCalledWith(95))
        expect(mocks.confirm).toHaveBeenCalledWith({ token, confirmed: true, reference: '' })
    })
    it('requires fresh confirmation when the reference changes and leaves stale reviews unsuccessful', async () => {
        mocks.confirm.mockResolvedValue({ success: false, error: 'La lista o bajas cambiaron' })
        const saved = vi.fn()
        render(<CampaignListAuthorization listId={token} onClose={vi.fn()} onSaved={saved} />)
        await screen.findByText('Synthetic list')
        fireEvent.click(screen.getByRole('checkbox'))
        fireEvent.change(screen.getByLabelText(/Referencia interna/), { target: { value: 'Store signups' } })
        expect(screen.getByRole('button', { name: 'Registrar declaración' })).toBeDisabled()
        fireEvent.click(screen.getByRole('checkbox'))
        fireEvent.click(screen.getByRole('button', { name: 'Registrar declaración' }))
        expect(await screen.findByRole('alert')).toHaveTextContent('La lista o bajas cambiaron')
        expect(saved).not.toHaveBeenCalled()
        expect(screen.getByRole('checkbox')).not.toBeChecked()
        fireEvent.click(screen.getByRole('button', { name: 'Actualizar revisión' }))
        await vi.waitFor(() => expect(mocks.prepare).toHaveBeenCalledTimes(2))
        expect(screen.getByRole('button', { name: 'Registrar declaración' })).toBeDisabled()
    })
    it('never enables authorization when every contact is excluded', async () => {
        mocks.prepare.mockResolvedValue({ success: true, review: { ...review, toAuthorize: 0, excluded: 100 } })
        render(<CampaignListAuthorization listId={token} onClose={vi.fn()} onSaved={vi.fn()} />)
        await screen.findByText('0 contactos pendientes de registrar')
        expect(screen.getByRole('checkbox')).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Registrar declaración' })).toBeDisabled()
        expect(mocks.confirm).not.toHaveBeenCalled()
    })
})

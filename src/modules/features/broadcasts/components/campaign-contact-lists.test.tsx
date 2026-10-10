import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ page: vi.fn() }))
vi.mock('../marketing-workspace-actions', () => ({ getMarketingContactListPage: mocks.page }))
import { CampaignContactLists } from './campaign-contact-lists'
const id = '21000000-0000-4000-8000-000000000001'
const page = { rows: [{ id, name: 'October list', contacts: 10, createdAt: '2026-10-01T00:00:00Z' }], next: null, selected: null }
beforeEach(() => { vi.resetAllMocks(); mocks.page.mockResolvedValue({ success: true, page }) })
describe('Campaign imported list choice', () => {
    it('queries only when needed and never changes the audience until an explicit selection', async () => {
        const select = vi.fn()
        render(<CampaignContactLists disabled={false} onSelect={select} />)
        expect(mocks.page).not.toHaveBeenCalled()
        fireEvent.click(screen.getByRole('button', { name: 'Elegir lista' }))
        await screen.findByText('October list')
        expect(select).not.toHaveBeenCalled()
        fireEvent.click(screen.getByRole('button', { name: 'Usar lista' }))
        expect(select).toHaveBeenCalledWith(id)
    })
    it('retains a saved selection and reports an unavailable list instead of switching to all contacts', async () => {
        const select = vi.fn()
        render(<CampaignContactLists value={id} disabled={false} onSelect={select} />)
        expect(await screen.findByRole('alert')).toHaveTextContent('lista guardada no está disponible')
        expect(mocks.page).toHaveBeenCalledWith({ selected: id, search: '', cursor: null })
        expect(select).not.toHaveBeenCalled()
    })
    it('ignores late page responses after the component closes', async () => {
        let resolve!: (value: unknown) => void
        mocks.page.mockImplementation(() => new Promise(done => { resolve = done }))
        const { unmount } = render(<CampaignContactLists value={id} disabled={false} onSelect={vi.fn()} />)
        unmount()
        await act(async () => resolve({ success: true, page }))
        expect(screen.queryByText('October list')).not.toBeInTheDocument()
    })
})

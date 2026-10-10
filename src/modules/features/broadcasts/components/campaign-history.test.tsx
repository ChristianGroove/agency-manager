import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ recipients: vi.fn(), steps: vi.fn(), toastError: vi.fn() }))
vi.mock('../marketing-history-actions', () => ({ getMarketingHistory: mocks.recipients, getMarketingStepHistory: mocks.steps }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: mocks.toastError } }))
import { CampaignHistory } from './campaign-history'
const row = { id: 'recipient-a', name: 'Synthetic name', phone: '123', status: 'completed', issue: null,
    started_at: null, completed_at: null, next_run_at: null, last_run_at: null,
    counts: { total: 1, queued: 0, sending: 0, accepted: 1, delivered: 0, read: 0, failed: 0, unknown: 0 } }
const page = { items: [row], hasMore: false, nextCursor: null, total: 1, queriedAt: '2026-10-10T00:00:00Z' }
beforeEach(() => { vi.resetAllMocks(); mocks.recipients.mockResolvedValue({ success: true, canExport: true, page }) })
afterEach(() => vi.unstubAllGlobals())
describe('Recipient report interactions', () => {
    it('does not present accepted messages as delivered, and loads step detail only on request', async () => {
        mocks.steps.mockResolvedValue({ success: true, page: { ...page, items: [{ enrollment_id: row.id, step_id: 'step-a', step_name: 'Template step',
            order_index: 0, type: 'whatsapp', template_name: 'promo', progress: 'advanced', delivery: 'unknown', error_code: null }] } })
        render(<CampaignHistory campaignId="campaign-a" />)
        await screen.findByText('Synthetic name')
        expect(screen.getByText('0 entregados · 0 leídos · 0 fallidos')).toBeInTheDocument()
        expect(mocks.steps).not.toHaveBeenCalled()
        fireEvent.click(screen.getByRole('button', { name: 'Ver pasos de Synthetic name' }))
        await screen.findByText('Mensaje: Sin resultado confirmado')
        expect(screen.getByText('Puede haberse enviado. No se reenvía automáticamente.')).toBeInTheDocument()
        expect(mocks.steps).toHaveBeenCalledWith({ campaignId: 'campaign-a', enrollmentId: row.id, cursor: null })
    })
    it('paginates and resets the cursor when applying different filters', async () => {
        mocks.recipients.mockResolvedValueOnce({ success: true, canExport: false, page: { ...page, total: 30, hasMore: true, nextCursor: row.id } })
        render(<CampaignHistory campaignId="campaign-a" />)
        await screen.findByText('Synthetic name')
        expect(screen.getByRole('button', { name: 'Exportar destinatarios CSV' })).toBeDisabled()
        fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
        await waitFor(() => expect(mocks.recipients).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: row.id })))
        await waitFor(() => expect(screen.getByRole('button', { name: 'Aplicar filtros' })).toBeEnabled())
        fireEvent.change(screen.getByLabelText('Nombre o teléfono'), { target: { value: 'Other' } })
        fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
        await waitFor(() => expect(mocks.recipients).toHaveBeenLastCalledWith({ campaignId: 'campaign-a', filters: { status: 'all', delivery: 'all', search: 'Other' }, cursor: null }))
    })
    it('reports unavailable data and permits retry without inventing an empty audience', async () => {
        mocks.recipients.mockResolvedValueOnce({ success: false, error: 'History unavailable' })
        render(<CampaignHistory campaignId="campaign-a" />)
        expect(await screen.findByRole('alert')).toHaveTextContent('History unavailable')
        expect(screen.queryByText(/No hay destinatarios inscritos/)).not.toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Actualizar historial' }))
        await screen.findByText('Synthetic name')
    })
    it('ignores a stale response after switching campaigns', async () => {
        let resolveOld: (value: unknown) => void = () => {}
        mocks.recipients.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
        const view = render(<CampaignHistory key="a" campaignId="campaign-a" />)
        view.rerender(<CampaignHistory key="b" campaignId="campaign-b" />)
        await screen.findByText('Synthetic name')
        await act(async () => resolveOld({ success: true, canExport: true, page: { ...page, items: [{ ...row, name: 'Stale tenant' }] } }))
        expect(screen.queryByText('Stale tenant')).not.toBeInTheDocument()
    })
    it('rejects a successful HTML login response instead of downloading it as a campaign report', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Login</html>', { headers: { 'Content-Type': 'text/html' } })))
        render(<CampaignHistory campaignId="campaign-a" />)
        await screen.findByText('Synthetic name')
        fireEvent.click(screen.getByRole('button', { name: 'Exportar destinatarios CSV' }))
        await waitFor(() => expect(mocks.toastError).toHaveBeenCalled())
        expect(screen.getByRole('button', { name: 'Exportar destinatarios CSV' })).toBeEnabled()
    })
})

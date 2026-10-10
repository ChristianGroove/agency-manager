import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
    campaign: vi.fn(), flows: vi.fn(), audience: vi.fn(), metrics: vi.fn(), setup: vi.fn(), readiness: vi.fn(),
    update: vi.fn(), saveAudience: vi.fn(), create: vi.fn(), sequence: vi.fn(), add: vi.fn(), edit: vi.fn(), remove: vi.fn(), principal: vi.fn(), page: vi.fn(), toast: vi.fn(), reorder: vi.fn(), assignees: vi.fn()
}))
vi.mock('../marketing-actions', () => ({
    getCampaign: mocks.campaign, getSequences: mocks.flows, getCampaignStats: mocks.metrics,
    updateCampaign: mocks.update, createCampaign: mocks.create, createSequence: mocks.sequence, addStepToSequence: mocks.add, updateStep: mocks.edit, deleteStep: mocks.remove, setPrincipalSequence: mocks.principal, deleteCampaign: vi.fn()
}))
vi.mock('../marketing-workspace-actions', () => ({ getCampaignAudience: mocks.audience, saveCampaignAudience: mocks.saveAudience, getMarketingCampaignPage: mocks.page, reorderCampaignSteps: mocks.reorder, getMarketingAssignees: mocks.assignees }))
vi.mock('../marketing-preflight-actions', () => ({ getMarketingSetup: mocks.setup, getAudienceReadiness: mocks.readiness }))
vi.mock('next/dynamic', () => ({ default: () => () => null }))
vi.mock('sonner', () => ({ toast: { error: mocks.toast, success: vi.fn() } }))
vi.mock('./campaign-readiness', () => ({ CampaignReadiness: () => <p>Revisión del diseño guardado</p> }))
vi.mock('./marketing-template-editor', () => ({ MarketingTemplateEditor: () => <p>Editor de plantilla</p> }))
import { CampaignBuilder } from './campaign-builder'
import { CreateCampaignDialog } from './create-campaign-dialog'
import { CampaignsList } from './campaigns-list'
import { CampaignAssigneeFilter } from './campaign-assignee-filter'
const id = '16000000-0000-4000-8000-000000000001', emitter = '18000000-0000-4000-8000-000000000001'
const saved = { has_phone: true, source: 'original', assigned_to: id, created_after: '2025-01-01T00:00:00Z' }
beforeEach(() => {
    vi.resetAllMocks()
    mocks.campaign.mockResolvedValue({ success: true, campaign: { id, status: 'draft', connection_id: emitter, delivery_config: { mode: 'growth', humanize: true, timezone: 'America/Bogota' } }, executionEnabled: false })
    mocks.flows.mockResolvedValue({ success: true, sequences: [{ id: 'sequence', is_active: true, steps: [{ id: 'step', type: 'whatsapp', name: 'Mensaje existente', content: { template_name: 'promo' } }] }] })
    mocks.audience.mockResolvedValue({ success: true, audience: { id: 'audience', filters: saved } })
    mocks.setup.mockResolvedValue({ success: true, canManage: true, canExecute: true, canImport: true, channels: [{ id: emitter, name: 'Emisor de prueba' }] })
    mocks.metrics.mockResolvedValue({ success: false, error: 'Fixture without metrics' })
    mocks.readiness.mockResolvedValue({ success: true, audience: { eligible: 1, matched: 1, missingConsent: 0, optedOut: 0, invalidFormat: 0, duplicates: 0 } })
    mocks.update.mockResolvedValue({ success: true }); mocks.saveAudience.mockResolvedValue({ success: true })
    mocks.reorder.mockResolvedValue({ success: true })
})
async function wizard() { render(<CampaignBuilder campaignId={id} campaignName="Campaña de prueba" />); await waitFor(() => expect(screen.queryByText('Cargando campaña…')).not.toBeInTheDocument()) }
function tab(name: string) { fireEvent.mouseDown(screen.getByRole('tab', { name }), { button: 0, ctrlKey: false }) }
describe('Simple campaign workspace', () => {
    it('loads the recipient step without creating, enrolling, changing consent or sending', async () => {
        await wizard()
        expect(screen.getByLabelText('Estado del contacto · vacío para todos')).toBeInTheDocument()
        expect(screen.queryByText('Stealth Mode')).not.toBeInTheDocument()
        expect(mocks.sequence).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.saveAudience).not.toHaveBeenCalled()
    })
    it('preserves advanced saved filters and requires an explicit save', async () => {
        await wizard()
        fireEvent.change(screen.getByLabelText('Estado del contacto · vacío para todos'), { target: { value: 'qualified' } })
        expect(mocks.saveAudience).not.toHaveBeenCalled()
        fireEvent.click(screen.getByRole('button', { name: 'Guardar destinatarios' }))
        await waitFor(() => expect(mocks.saveAudience).toHaveBeenCalledWith(id, { ...saved, status: 'qualified', tags: undefined }))
        expect(mocks.update).not.toHaveBeenCalled()
    })
    it('blocks final review while scheduling edits remain unsaved', async () => {
        await wizard(); tab('3. Programación')
        fireEvent.change(screen.getByLabelText('Fecha de inicio · hora local del navegador'), { target: { value: '2099-01-01T12:00' } })
        tab('4. Revisión')
        expect(screen.getByRole('button', { name: 'Abrir revisión final' })).toBeDisabled()
        expect(mocks.update).not.toHaveBeenCalled()
        tab('3. Programación')
        expect(screen.getByLabelText('Fecha de inicio · hora local del navegador')).toHaveValue('2099-01-01T12:00')
    })
    it('does not discard an unsaved schedule when another part of the draft is saved', async () => {
        await wizard(); tab('3. Programación')
        fireEvent.change(screen.getByLabelText('Fecha de inicio · hora local del navegador'), { target: { value: '2099-01-01T12:00' } })
        tab('1. Destinatarios'); fireEvent.change(screen.getByLabelText('Estado del contacto · vacío para todos'), { target: { value: 'qualified' } })
        fireEvent.click(screen.getByRole('button', { name: 'Guardar destinatarios' }))
        await waitFor(() => expect(mocks.saveAudience).toHaveBeenCalled())
        tab('3. Programación'); expect(screen.getByLabelText('Fecha de inicio · hora local del navegador')).toHaveValue('2099-01-01T12:00')
    })
    it('keeps paused campaigns read-only and labels their real state', async () => {
        mocks.campaign.mockResolvedValue({ success: true, campaign: { id, status: 'paused', connection_id: emitter }, executionEnabled: false })
        await wizard(); expect(screen.getByText('Pausada')).toBeInTheDocument()
        tab('2. Mensaje'); expect(screen.getByRole('button', { name: 'Editar' })).toBeDisabled()
        expect(mocks.sequence).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled()
    })
    it('respects view-only permissions in the editor', async () => {
        mocks.setup.mockResolvedValue({ success: true, canManage: false, canExecute: false, canImport: false, channels: [] })
        await wizard(); expect(screen.getByLabelText('Estado del contacto · vacío para todos')).toBeDisabled()
        tab('4. Revisión'); expect(screen.getByRole('button', { name: 'Abrir revisión final' })).toBeDisabled()
    })
    it('preserves the existing UTC timestamp and an unrestricted delivery window when changing the time zone', async () => {
        const iso = '2099-01-01T15:00:42.123Z'
        mocks.campaign.mockResolvedValue({ success: true, campaign: { id, status: 'draft', connection_id: emitter, scheduled_for: iso, delivery_config: { mode: 'growth', humanize: true, timezone: 'America/Bogota' } }, executionEnabled: false })
        await wizard(); tab('3. Programación')
        expect(screen.getByRole('checkbox', { name: 'Limitar a una ventana diaria' })).not.toBeChecked()
        fireEvent.change(screen.getByLabelText('Zona horaria de la ventana'), { target: { value: 'America/Mexico_City' } })
        fireEvent.click(screen.getByRole('button', { name: 'Guardar programación' }))
        await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(id, { scheduled_for: iso, delivery_config: { mode: 'growth', humanize: true, timezone: 'America/Mexico_City', schedule_window: undefined } }))
    })
    it('keeps a legacy wait in minutes rather than silently converting it to days', async () => {
        mocks.flows.mockResolvedValue({ success: true, sequences: [{ id: 'sequence', is_active: true, steps: [{ id: 'wait-step', type: 'delay', name: 'Espera existente', delay_config: { duration: 30, unit: 'minutes' } }] }] })
        mocks.edit.mockResolvedValue({ success: true })
        await wizard(); tab('2. Mensaje')
        fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
        fireEvent.change(screen.getByLabelText('Tiempo de espera'), { target: { value: '45' } })
        fireEvent.click(screen.getByRole('button', { name: 'Guardar contenido' }))
        await waitFor(() => expect(mocks.edit).toHaveBeenCalledWith('wait-step', expect.objectContaining({ type: 'delay', delay_config: { value: 45, unit: 'minutes' } })))
        expect(mocks.sequence).not.toHaveBeenCalled()
    })
    it('moves the chosen step with the complete displayed order and blocks boundary moves', async () => {
        const first = '31000000-0000-4000-8000-000000000001', second = '31000000-0000-4000-8000-000000000002'
        mocks.flows.mockResolvedValue({ success: true, sequences: [{ id: 'sequence', is_active: true, steps: [first, second].map((id, order_index) => ({ id, order_index, type: 'delay', name: 'Espera', delay_config: { value: 1, unit: 'minutes' } })) }] })
        await wizard(); tab('2. Mensaje')
        expect(screen.getByRole('button', { name: 'Subir paso 1' })).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Bajar paso 2' })).toBeDisabled()
        fireEvent.click(screen.getByRole('button', { name: 'Subir paso 2' }))
        await waitFor(() => expect(mocks.reorder).toHaveBeenCalledWith({ campaignId: id, sequenceId: 'sequence', expected: [first, second], order: [second, first] }))
        expect(mocks.sequence).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled()
    })
    it('changes one date filter without rounding or removing other stored filters', async () => {
        const exact = '2025-01-01T00:00:42.123Z'
        mocks.audience.mockResolvedValue({ success: true, audience: { id: 'audience', filters: { ...saved, created_after: exact } } })
        await wizard()
        fireEvent.change(screen.getByLabelText('Última actividad desde'), { target: { value: '2026-01-01T12:00' } })
        fireEvent.click(screen.getByRole('button', { name: 'Guardar destinatarios' }))
        await waitFor(() => expect(mocks.saveAudience).toHaveBeenCalledWith(id, { ...saved, created_after: exact, last_activity_after: new Date('2026-01-01T12:00').toISOString(), tags: undefined }))
    })
})

describe('Tenant assignee selection', () => {
    it('does not expose an unavailable stored UUID or silently change its filter', async () => {
        mocks.assignees.mockResolvedValue({ success: true, page: { rows: [{ id, name: 'Ana de prueba' }], selected: null, next: null } })
        const change = vi.fn()
        render(<CampaignAssigneeFilter value={emitter} disabled={false} onChange={change} />)
        await screen.findByText('Responsable guardado no disponible; el filtro se conserva.')
        expect(screen.queryByText(emitter)).not.toBeInTheDocument(); expect(change).not.toHaveBeenCalled()
        fireEvent.click(screen.getByRole('button', { name: 'Elegir a Ana de prueba' }))
        expect(change).toHaveBeenCalledWith(id)
    })
    it('ignores a late response for a previous responsible filter', async () => {
        let resolve!: (result: unknown) => void
        mocks.assignees.mockReturnValueOnce(new Promise(result => { resolve = result }))
            .mockResolvedValue({ success: true, page: { rows: [], selected: { id: emitter, name: 'Responsable actual', active: false }, next: null } })
        const view = render(<CampaignAssigneeFilter value={id} disabled={true} onChange={vi.fn()} />)
        view.rerender(<CampaignAssigneeFilter value={emitter} disabled={true} onChange={vi.fn()} />)
        await screen.findByText('Responsable actual · ya no está activo')
        await act(async () => resolve({ success: true, page: { rows: [], selected: { id, name: 'Respuesta antigua', active: true }, next: null } }))
        expect(screen.queryByText('Respuesta antigua')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Quitar filtro de responsable' })).toBeDisabled()
    })
})
describe('Creation and campaign list', () => {
    it('only creates a named draft on submission and opens that same draft', async () => {
        const created = vi.fn(); mocks.create.mockResolvedValue({ success: true, campaign: { id } })
        render(<CreateCampaignDialog onClose={vi.fn()} onCreated={created} />)
        expect(mocks.create).not.toHaveBeenCalled()
        fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: ' Oferta ' } }); fireEvent.click(screen.getByRole('button', { name: 'Crear borrador' }))
        await waitFor(() => expect(created).toHaveBeenCalledWith(id)); expect(mocks.create).toHaveBeenCalledWith({ name: 'Oferta' })
    })
    it('shows paused/completed/archived states without using old engagement counters', async () => {
        mocks.page.mockResolvedValue({ success: true, page: { rows: ['paused', 'completed', 'archived'].map((status, index) => ({ id: `row-${index}`, name: status, status, recipients: 5, completed: 3, failed: 1, cancelled: 1, accepted: 5, delivered: 2, read: 1, unknown: 0, deliveryFailed: 0 })), next: null } })
        render(<CampaignsList />)
        await screen.findByText('Pausada'); const table = within(screen.getByRole('table'))
        expect(table.getByText('Completada')).toBeInTheDocument(); expect(table.getByText('Archivada')).toBeInTheDocument()
        expect(table.queryByText('Engagement')).not.toBeInTheDocument(); expect(table.queryByText('Activa')).not.toBeInTheDocument()
        expect(screen.getAllByText('5 aceptados · 2 entregados')).toHaveLength(3)
    })
})

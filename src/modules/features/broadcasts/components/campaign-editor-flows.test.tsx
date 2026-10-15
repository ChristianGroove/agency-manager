import { Suspense, lazy } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMarketingExample, marketingScenarios } from '../marketing-examples'
import { MarketingExampleProvider } from '../marketing-client-api'
import { CampaignWorkspaceSheet } from './campaign-workspace-sheet'
import { CampaignResults } from './campaign-results'

vi.mock('next/dynamic', () => ({ default: (loader: () => Promise<React.ComponentType>) => {
    const Component = lazy(() => loader().then(defaultExport => ({ default: defaultExport })))
    return function Loaded(props: Record<string, unknown>) { return <Suspense fallback={<p>Cargando ejemplo…</p>}><Component {...props} /></Suspense> }
} }))
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

async function exampleWorkspace(scenario: Parameters<typeof createMarketingExample>[0], configure?: (example: ReturnType<typeof createMarketingExample>) => void | Promise<void>) {
    const example = createMarketingExample(scenario)
    await configure?.(example)
    const setup = await example.api.getMarketingSetup()
    const email = await example.api.getMarketingEmailSenders()
    const close = vi.fn()
    const create = vi.spyOn(example.api, 'createCampaign')
    if (!setup.success || !email.success) throw new Error('Invalid example fixture')
    render(<MarketingExampleProvider api={example.api}><CampaignWorkspaceSheet campaign={example.initialCampaign} channels={[...setup.channels, ...email.channels]} canManage={setup.canManage} canExecute={setup.canExecute} canImport={setup.canImport} executionEnabled={setup.executionEnabled} onClose={close} /></MarketingExampleProvider>)
    await waitFor(() => expect(screen.queryByText('Cargando campaña…')).not.toBeInTheDocument())
    return { ...example, close, create }
}

describe('Campaign creation and review as used by the dashboard', () => {
    it.each(['new-whatsapp', 'new-email'] as const)('keeps import permissions with preloaded senders in %s without creating a draft', async scenario => {
        const example = await exampleWorkspace(scenario)
        expect(screen.getByRole('button', { name: 'Importar lista' })).toBeEnabled()
        expect(example.create).not.toHaveBeenCalled()
        expect(screen.getByText('Nuevo borrador')).toBeInTheDocument()
    })
    it('prepares email locally, saves one recoverable draft and keeps the content after reopening', async () => {
        const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
        const example = await exampleWorkspace('new-email')
        fireEvent.click(screen.getByRole('button', { name: 'Configurar mensaje' }))
        fireEvent.change(await screen.findByLabelText('Asunto'), { target: { value: 'Novedades para {{nombre}}' } })
        fireEvent.change(screen.getByLabelText('Mensaje'), { target: { value: 'Hola {{nombre}}, tenemos novedades para ti.' } })
        fireEvent.click(screen.getByRole('button', { name: 'Usar este mensaje' }))
        await screen.findByText('Mensaje preparado · pendiente de guardar')
        expect(example.create).not.toHaveBeenCalled()
        fireEvent.change(screen.getByLabelText('Nombre de la campaña'), { target: { value: 'Campaña de ejemplo' } })
        fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }))
        await screen.findByText('Todo guardado')
        expect(example.create).toHaveBeenCalledTimes(1)
        const sequences = await example.api.getSequences(example.initialCampaign.id)
        expect(sequences.success && sequences.sequences?.[0].steps?.[0].content.subject).toBe('Novedades para {{nombre}}')
        expect(fetcher).not.toHaveBeenCalled()
    })
    it('saves the pending name and activates in one explicit action, refreshing the parent', async () => {
        const example = await exampleWorkspace('ready-whatsapp')
        const activate = vi.spyOn(example.api, 'enrollAudienceInCampaign')
        fireEvent.change(screen.getByLabelText('Nombre de la campaña'), { target: { value: 'Nombre actualizado' } })
        fireEvent.click(screen.getByRole('button', { name: 'Iniciar campaña' }))
        await screen.findByText('Actividad de la campaña')
        const result = await example.api.getCampaign(example.initialCampaign.id)
        expect(result.success && result.campaign?.name).toBe('Nombre actualizado')
        expect(activate).toHaveBeenCalledTimes(1)
        expect(activate).toHaveBeenCalledWith(example.initialCampaign.id, { token: expect.any(String), confirmed: true })
        expect(screen.queryByText('Revisión final de la campaña')).not.toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar campaña' }))
        expect(example.close).toHaveBeenCalledWith(true)
    })
    it('recovers a partially saved new campaign without creating another draft or opening review', async () => {
        const example = await exampleWorkspace('new-email')
        const update = vi.spyOn(example.api, 'updateCampaign').mockResolvedValueOnce({ success: false, error: 'Configuración pendiente' })
        const prepare = vi.spyOn(example.api, 'prepareCampaignActivation')
        fireEvent.click(screen.getByRole('button', { name: 'Configurar mensaje' }))
        fireEvent.change(await screen.findByLabelText('Asunto'), { target: { value: 'Un asunto de prueba' } })
        fireEvent.change(screen.getByLabelText('Mensaje'), { target: { value: 'Contenido de prueba' } })
        fireEvent.click(screen.getByRole('button', { name: 'Usar este mensaje' }))
        await screen.findByText('Mensaje preparado · pendiente de guardar')
        fireEvent.change(screen.getByLabelText('Nombre de la campaña'), { target: { value: 'Borrador recuperable' } })
        fireEvent.click(screen.getByRole('button', { name: 'Iniciar campaña' }))
        await screen.findByText('No se completó el guardado')
        expect(prepare).not.toHaveBeenCalled()
        expect(example.create).toHaveBeenCalledTimes(1)
        fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }))
        await screen.findByText('Todo guardado')
        expect(example.create).toHaveBeenCalledTimes(1)
        expect(update).toHaveBeenCalledTimes(2)
    })
    it('keeps the real environment execution flag independent from execution permission', async () => {
        await exampleWorkspace('execution-disabled')
        expect(screen.getByText(/Los envíos masivos están deshabilitados/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Iniciar campaña' })).toBeDisabled()
    })
    it('asks before discarding a changed message and preserves it when continuing', async () => {
        await exampleWorkspace('new-email')
        fireEvent.click(screen.getByRole('button', { name: 'Configurar mensaje' }))
        fireEvent.change(await screen.findByLabelText('Asunto'), { target: { value: 'Un asunto pendiente' } })
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))
        expect(screen.getByLabelText('Asunto')).toHaveValue('Un asunto pendiente')
    })
    it('shows missing consent in the same workspace without activating', async () => {
        const example = await exampleWorkspace('missing-consent')
        const activate = vi.spyOn(example.api, 'enrollAudienceInCampaign')
        fireEvent.click(screen.getByRole('button', { name: 'Iniciar campaña' }))
        await screen.findByText(/No hay destinatarios con autorización vigente/)
        expect(activate).not.toHaveBeenCalled()
    })
    it('keeps a view-only campaign read-only', async () => {
        await exampleWorkspace('read-only')
        expect(screen.getByLabelText('Nombre de la campaña')).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Importar lista' })).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Iniciar campaña' })).toBeDisabled()
    })
    it('fails closed for unimplemented example actions instead of invoking real server actions', async () => {
        const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
        for (const scenario of marketingScenarios) {
            const example = createMarketingExample(scenario.id)
            expect((await example.api.deleteCampaign('unavailable')).success).toBe(false)
        }
        expect(fetcher).not.toHaveBeenCalled()
    })
    it('provides an actionable email incident history and scheduler state', async () => {
        const example = createMarketingExample('unknown-email')
        const result = await example.api.getCampaignStats(example.initialCampaign.id)
        if (!result.success) throw new Error('Invalid metrics')
        render(<MarketingExampleProvider api={example.api}><CampaignResults campaignId={example.initialCampaign.id} connectionId="smtp:example" metrics={result} canExecute onRefresh={async () => {}} /></MarketingExampleProvider>)
        expect(screen.getByText('Diagnóstico de envío')).toBeVisible()
        fireEvent.click(screen.getByRole('button', { name: 'Revisar envíos sin confirmar' }))
        await screen.findByText('Ana de ejemplo')
        expect(screen.getByLabelText('Con mensajes en estado')).toHaveValue('unknown')
    })
    it('prevents duplicate starts while server validation is pending', async () => {
        let release!: () => void
        let prepare!: ReturnType<typeof vi.spyOn>, activate!: ReturnType<typeof vi.spyOn>
        await exampleWorkspace('ready-whatsapp', async example => {
            const prepared = await example.api.prepareCampaignActivation(example.initialCampaign.id)
            prepare = vi.spyOn(example.api, 'prepareCampaignActivation').mockReturnValueOnce(new Promise(resolve => { release = () => resolve(prepared) }))
            activate = vi.spyOn(example.api, 'enrollAudienceInCampaign')
        })
        const start = screen.getByRole('button', { name: 'Iniciar campaña' })
        fireEvent.click(start); fireEvent.click(start)
        await waitFor(() => expect(prepare).toHaveBeenCalledTimes(1))
        await act(async () => release())
        await screen.findByText('Actividad de la campaña')
        expect(activate).toHaveBeenCalledTimes(1)
    })
    it('rejects an expired validation ticket without submitting activation', async () => {
        let activate!: ReturnType<typeof vi.spyOn>
        await exampleWorkspace('ready-whatsapp', async example => {
            const prepared = await example.api.prepareCampaignActivation(example.initialCampaign.id)
            if (!prepared.success) throw new Error('Invalid fixture')
            vi.spyOn(example.api, 'prepareCampaignActivation').mockResolvedValue({ ...prepared, review: { ...prepared.review, expiresAt: '2000-01-01T00:00:00Z' } })
            activate = vi.spyOn(example.api, 'enrollAudienceInCampaign')
        })
        fireEvent.click(screen.getByRole('button', { name: 'Iniciar campaña' }))
        await screen.findByText(/La validación caducó/)
        expect(activate).not.toHaveBeenCalled()
    })
    it('keeps a server rejection visible without changing the campaign to active', async () => {
        const example = await exampleWorkspace('ready-whatsapp', example => {
            vi.spyOn(example.api, 'enrollAudienceInCampaign').mockResolvedValue({ success: false, enrolled: 0, error: 'La audiencia cambió. Vuelve a iniciar.' })
        })
        fireEvent.click(screen.getByRole('button', { name: 'Iniciar campaña' }))
        await screen.findByText('La audiencia cambió. Vuelve a iniciar.')
        expect(screen.getByRole('button', { name: 'Iniciar campaña' })).toBeEnabled()
        const result = await example.api.getCampaign(example.initialCampaign.id)
        expect(result.success && result.campaign?.status).toBe('draft')
    })
    it('requires a state refresh after an uncertain activation response', async () => {
        let activate!: ReturnType<typeof vi.spyOn>
        await exampleWorkspace('ready-whatsapp', example => {
            activate = vi.spyOn(example.api, 'enrollAudienceInCampaign').mockRejectedValueOnce(new Error('Network disconnected'))
        })
        fireEvent.click(screen.getByRole('button', { name: 'Iniciar campaña' }))
        await screen.findByText(/No se pudo confirmar el inicio/)
        expect(screen.getByRole('button', { name: 'Iniciar campaña' })).toBeDisabled()
        expect(activate).toHaveBeenCalledTimes(1)
        fireEvent.click(screen.getByRole('button', { name: 'Actualizar estado' }))
        await waitFor(() => expect(screen.getByRole('button', { name: 'Iniciar campaña' })).toBeEnabled())
        expect(screen.queryByText(/No se pudo confirmar el inicio/)).not.toBeInTheDocument()
    })
    it.each(['scheduled-email', 'paused'] as const)('starts %s without a second confirmation dialog', async scenario => {
        let activate!: ReturnType<typeof vi.spyOn>
        const example = await exampleWorkspace(scenario, example => {
            activate = vi.spyOn(example.api, 'enrollAudienceInCampaign')
        })
        fireEvent.click(screen.getByRole('button', { name: scenario === 'paused' ? 'Reanudar campaña' : 'Programar campaña' }))
        await screen.findByText('Actividad de la campaña')
        await waitFor(() => expect(activate).toHaveBeenCalledTimes(1))
        const result = await example.api.getCampaign(example.initialCampaign.id)
        expect(result.success && result.campaign?.status).toBe('active')
        if (scenario === 'scheduled-email') {
            const stats = await example.api.getCampaignStats(example.initialCampaign.id)
            expect(stats.success && stats.stats.completed).toBe(0)
            expect(stats.success && stats.delivery.accepted).toBe(0)
        }
        expect(screen.queryByText('Revisión final de la campaña')).not.toBeInTheDocument()
    })
    it('creates and starts a new email campaign without requiring a separate draft save', async () => {
        const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
        const example = await exampleWorkspace('new-email')
        fireEvent.change(screen.getByLabelText('Nombre de la campaña'), { target: { value: 'Inicio directo de email' } })
        fireEvent.click(screen.getByRole('button', { name: 'Configurar mensaje' }))
        fireEvent.change(await screen.findByLabelText('Asunto'), { target: { value: 'Novedades para {{nombre}}' } })
        fireEvent.change(screen.getByLabelText('Mensaje'), { target: { value: 'Hola {{nombre}}, descubre nuestras novedades.' } })
        fireEvent.click(screen.getByRole('button', { name: 'Usar este mensaje' }))
        await screen.findByText('Mensaje preparado · pendiente de guardar')
        fireEvent.click(screen.getByRole('button', { name: 'Iniciar campaña' }))
        await screen.findByText('Actividad de la campaña')
        expect(example.create).toHaveBeenCalledTimes(1)
        const result = await example.api.getSequences(example.initialCampaign.id)
        expect(result.success && result.sequences?.[0].steps?.[0].content.body).toBe('Hola {{nombre}}, descubre nuestras novedades.')
        expect(fetcher).not.toHaveBeenCalled()
    })
    it('honors a server execution gate that changes after the form has loaded', async () => {
        let activate!: ReturnType<typeof vi.spyOn>
        await exampleWorkspace('ready-whatsapp', async example => {
            const prepared = await example.api.prepareCampaignActivation(example.initialCampaign.id)
            if (!prepared.success) throw new Error('Invalid fixture')
            vi.spyOn(example.api, 'prepareCampaignActivation').mockResolvedValue({ ...prepared, review: { ...prepared.review, enabled: false } })
            activate = vi.spyOn(example.api, 'enrollAudienceInCampaign')
        })
        fireEvent.click(screen.getByRole('button', { name: 'Iniciar campaña' }))
        await screen.findByText('Los envíos masivos están deshabilitados en este entorno.')
        expect(activate).not.toHaveBeenCalled()
    })
})

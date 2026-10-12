import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { BrandingProvider } from '@/components/providers/branding-provider'
import { FabController } from '@/components/layout/fab-controller'
import { AIChatPanel } from '@/modules/features/caa/components/ai-chat-panel'
import { PetProvider, usePet } from './pet-provider'
import { DEFAULT_PET_SETTINGS, resolveDashboardPetConfig, type PetSettings } from './config'
import type { BrandingConfig } from '@/types/branding'

const mocks = vi.hoisted(() => ({ ask: vi.fn() }))
vi.mock('@/modules/features/caa/actions/ask-help-assistant', () => ({ askHelpAssistant: mocks.ask }))
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'light', setTheme: vi.fn() }) }))
vi.mock('next/image', () => ({ default: () => null }))
vi.mock('next/dynamic', () => ({ default: () => function Modal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    return open ? <div role="dialog" aria-label="Ayuda"><button onClick={() => onOpenChange(false)}>Cerrar ayuda</button></div> : null
} }))
vi.mock('./pet-visual', () => ({ PetVisual: ({ state, palette, onFailure }: { state: string; palette: { color: string }; onFailure?: () => void }) =>
    <span data-testid="pet-visual" data-state={state} data-color={palette.color} onDoubleClick={onFailure} />,
}))

const pixyId = '11111111-1111-4111-8111-111111111111'
const tenantId = '22222222-2222-4222-8222-222222222222'
const settings: PetSettings = { ...DEFAULT_PET_SETTINGS, enabled: true, pixyOrganizationId: pixyId, audience: 'all' }
const branding = { colors: { primary: '#112233', secondary: '#445566' } } as BrandingConfig

function wrapper(children: ReactNode, config = settings, organizationId = tenantId) {
    return <BrandingProvider initialBranding={branding}><PetProvider key={organizationId} config={resolveDashboardPetConfig(config, organizationId)}>{children}</PetProvider></BrandingProvider>
}
function Probe() {
    const pet = usePet()
    return <><output data-testid="state">{pet?.state}</output><button onClick={() => pet?.reportCriticalAlert(true)}>Aviso crítico</button></>
}

beforeEach(() => {
    mocks.ask.mockReset()
    window.matchMedia = vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('dashboard pet and help integration', () => {
    it('opens help directly without the legacy tools menu or a pet tooltip', () => {
        render(wrapper(<FabController />))
        expect(screen.queryByRole('button', { name: 'Herramientas del dashboard' })).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Abrir ayuda' })).not.toHaveAttribute('title')
        expect(screen.getByTestId('pet-visual')).toHaveAttribute('data-color', '#112233')
        fireEvent.click(screen.getByRole('button', { name: 'Abrir ayuda' }))
        expect(screen.getByRole('dialog', { name: 'Ayuda' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Abrir ayuda' })).not.toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar ayuda' }))
        expect(screen.getByRole('button', { name: 'Abrir ayuda' })).toBeInTheDocument()
    })
    it('keeps direct help access after a rendering failure', () => {
        render(wrapper(<FabController />))
        fireEvent.doubleClick(screen.getByTestId('pet-visual'))
        expect(screen.queryByTestId('pet-visual')).not.toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Abrir ayuda' }))
        expect(screen.getByRole('dialog', { name: 'Ayuda' })).toBeInTheDocument()
    })
    it('does not mount any renderer while disabled', () => {
        render(wrapper(<FabController />, { ...settings, enabled: false }))
        expect(screen.queryByTestId('pet-visual')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Abrir ayuda' })).toBeInTheDocument()
    })
    it('reports thinking, success and expiry using the real chat request lifecycle', async () => {
        let resolve!: (response: { success: boolean; message: string }) => void
        mocks.ask.mockImplementation(() => new Promise(done => { resolve = done }))
        render(wrapper(<><AIChatPanel /><Probe /></>))
        expect(screen.getAllByTestId('pet-visual')).toHaveLength(1)
        expect(screen.queryByRole('heading', { name: 'Pixy IA' })).not.toBeInTheDocument()
        expect(screen.getByRole('textbox', { name: 'Tu pregunta' })).toBeInTheDocument()
        fireEvent.change(screen.getByPlaceholderText('Escribe tu pregunta...'), { target: { value: '¿Cómo creo una tarea?' } })
        fireEvent.submit(screen.getByPlaceholderText('Escribe tu pregunta...').closest('form')!)
        expect(screen.getByTestId('state')).toHaveTextContent('thinking')
        expect(screen.getByTestId('pet-visual')).toHaveAttribute('data-state', 'thinking')
        await act(async () => resolve({ success: true, message: 'Abre tareas.' }))
        expect(screen.getByText('Abre tareas.')).toBeInTheDocument()
        expect(screen.getByTestId('state')).toHaveTextContent('happy')
        expect(screen.getAllByTestId('pet-visual')).toHaveLength(1)
        expect(screen.getByTestId('pet-visual')).toHaveAttribute('data-state', 'happy')
        // Unmount removes the active context and its expiration timer.
    })
    it('keeps error text and gives critical alerts precedence when enabled', async () => {
        mocks.ask.mockResolvedValue({ success: false, error: 'Servicio no disponible.' })
        render(wrapper(<><AIChatPanel /><Probe /></>, { ...settings, alertReactions: true }))
        fireEvent.change(screen.getByPlaceholderText('Escribe tu pregunta...'), { target: { value: 'Necesito ayuda' } })
        fireEvent.submit(screen.getByPlaceholderText('Escribe tu pregunta...').closest('form')!)
        await waitFor(() => expect(screen.getByText('Servicio no disponible.')).toBeInTheDocument())
        expect(screen.getByTestId('state')).toHaveTextContent('error')
        expect(screen.getAllByTestId('pet-visual')).toHaveLength(1)
        expect(screen.getByTestId('pet-visual')).toHaveAttribute('data-state', 'error')
        fireEvent.click(screen.getByRole('button', { name: 'Aviso crítico' }))
        expect(screen.getByTestId('state')).toHaveTextContent('error')
    })
    it('clears prior tenant signals and switches to Pixy colors on context change', async () => {
        const view = render(wrapper(<><FabController /><Probe /></>, { ...settings, alertReactions: true }))
        fireEvent.click(screen.getByRole('button', { name: 'Aviso crítico' }))
        expect(screen.getByTestId('state')).toHaveTextContent('error')
        view.rerender(wrapper(<><FabController /><Probe /></>, settings, pixyId))
        expect(screen.getByTestId('state')).toHaveTextContent('idle')
        expect(screen.getByTestId('pet-visual')).toHaveAttribute('data-color', settings.color)
    })
})

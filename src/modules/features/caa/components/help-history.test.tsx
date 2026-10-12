import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AIChatPanel } from './ai-chat-panel'

const mocks = vi.hoisted(() => ({ list: vi.fn(), load: vi.fn(), ask: vi.fn() }))
vi.mock('../actions/help-history', () => ({ listHelpThreads: mocks.list, loadHelpThread: mocks.load }))
vi.mock('../actions/ask-help-assistant', () => ({ askHelpAssistant: mocks.ask }))
vi.mock('@/modules/core/pet/pet-provider', () => ({ usePet: () => null }))
vi.mock('@/modules/core/pet/use-pet-motion', () => ({ usePetMedia: () => false }))

const thread = { id: '11111111-1111-4111-8111-111111111111', title: 'Cambiar tema', created_at: '2026-10-11T00:00:00Z' }
const stored = [{ id: 'a', role: 'user', content: '¿Cómo cambio el tema?', created_at: thread.created_at },
    { id: 'b', role: 'assistant', content: 'Usa el botón del sidebar.', created_at: thread.created_at }]

beforeEach(() => {
    vi.clearAllMocks()
    mocks.list.mockResolvedValue({ threads: [thread], hasMore: false })
    mocks.load.mockResolvedValue({ messages: stored })
    mocks.ask.mockResolvedValue({ success: true, message: 'Respuesta nueva.', threadId: thread.id })
    Element.prototype.scrollIntoView = vi.fn()
})
afterEach(cleanup)

describe('private help history UI', () => {
    it('restores saved conversation after closing and reopening without asking AI', async () => {
        const view = render(<AIChatPanel />)
        await screen.findByText('Usa el botón del sidebar.')
        view.unmount()
        render(<AIChatPanel />)
        await screen.findByText('Usa el botón del sidebar.')
        expect(mocks.load).toHaveBeenCalledWith(thread.id)
        expect(mocks.ask).not.toHaveBeenCalled()
        expect(screen.getByRole('log')).toHaveClass('no-scrollbar')
        expect(screen.getByRole('button', { name: /Ir a pregunta/ })).toBeInTheDocument()
    })
    it('uses restored context and thread identity when continuing', async () => {
        render(<AIChatPanel />)
        await waitFor(() => expect(screen.getByRole('textbox')).toBeEnabled())
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '¿Y en móvil?' } })
        fireEvent.submit(screen.getByRole('textbox').closest('form')!)
        await screen.findByText('Respuesta nueva.')
        expect(mocks.ask).toHaveBeenCalledWith('¿Y en móvil?', stored, thread.id)
    })
    it('keeps help usable and warns when history storage is unavailable', async () => {
        mocks.list.mockResolvedValue({ threads: [], hasMore: false, error: 'Historial no disponible.' })
        render(<AIChatPanel />)
        await screen.findByText('Historial no disponible.')
        expect(screen.getByRole('textbox')).toBeEnabled()
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Necesito ayuda' } })
        fireEvent.submit(screen.getByRole('textbox').closest('form')!)
        await screen.findByText('Respuesta nueva.')
    })
    it('does not replace newer content when an old load completes after unmount', async () => {
        let finish!: (value: { messages: typeof stored }) => void
        mocks.load.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
        const old = render(<AIChatPanel />)
        await waitFor(() => expect(mocks.load).toHaveBeenCalled())
        old.unmount()
        mocks.list.mockResolvedValue({ threads: [], hasMore: false })
        render(<AIChatPanel />)
        await waitFor(() => expect(screen.getByRole('textbox')).toBeEnabled())
        await act(async () => finish({ messages: stored }))
        expect(screen.queryByText('Usa el botón del sidebar.')).not.toBeInTheDocument()
    })
    it('does not force bottom scrolling when reading an older question', async () => {
        let finish!: (value: { success: boolean; message: string }) => void
        mocks.ask.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
        render(<AIChatPanel />)
        await waitFor(() => expect(screen.getByRole('textbox')).toBeEnabled())
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Necesito más detalles' } })
        fireEvent.submit(screen.getByRole('textbox').closest('form')!)
        const area = screen.getByRole('log')
        Object.defineProperties(area, { scrollHeight: { value: 1000 }, clientHeight: { value: 200 }, scrollTop: { value: 0, writable: true } })
        fireEvent.scroll(area)
        vi.mocked(Element.prototype.scrollIntoView).mockClear()
        await act(async () => finish({ success: true, message: 'Respuesta posterior.' }))
        expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
        expect(screen.getByRole('button', { name: 'Ir al último mensaje' })).toBeInTheDocument()
    })
})

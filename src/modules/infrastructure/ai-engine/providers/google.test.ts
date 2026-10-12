import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GoogleProvider } from './google'

const mocks = vi.hoisted(() => ({ model: vi.fn(), chat: vi.fn(), send: vi.fn() }))
vi.mock('@google/generative-ai', () => ({ GoogleGenerativeAI: class { getGenerativeModel = mocks.model } }))
beforeEach(() => {
    vi.clearAllMocks()
    mocks.model.mockReturnValue({ startChat: mocks.chat })
    mocks.chat.mockReturnValue({ sendMessage: mocks.send })
    mocks.send.mockResolvedValue({ response: { text: () => 'Respuesta', usageMetadata: {} } })
})
describe('Google message role contract', () => {
    it('requests JSON output for guide selection and other JSON tasks', async () => {
        await new GoogleProvider().generateResponse([{ role: 'user', content: 'Select a guide' }], 'test-model', 'test-key', { response_format: { type: 'json_object' } })
        expect(mocks.chat.mock.calls[0][0].generationConfig.responseMimeType).toBe('application/json')
    })
    it('keeps system instructions separate and preserves user/assistant history', async () => {
        await new GoogleProvider().generateResponse([
            { role: 'system', content: 'Instrucciones verificadas' },
            { role: 'user', content: 'Pregunta previa' },
            { role: 'assistant', content: 'Respuesta previa' },
            { role: 'user', content: 'Pregunta actual' },
        ], 'test-model', 'test-key', { temperature: 0.2 })
        expect(mocks.model).toHaveBeenCalledWith({ model: 'test-model', systemInstruction: 'Instrucciones verificadas' })
        expect(mocks.chat.mock.calls[0][0].history).toEqual([
            { role: 'user', parts: [{ text: 'Pregunta previa' }] },
            { role: 'model', parts: [{ text: 'Respuesta previa' }] },
        ])
        expect(mocks.send).toHaveBeenCalledWith('Pregunta actual')
    })
})

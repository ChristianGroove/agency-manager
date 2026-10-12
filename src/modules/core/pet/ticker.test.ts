import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { subscribe, pointer } from './vendor/robot-heads/src/ticker'

let frames: Map<number, FrameRequestCallback>
let nextId: number
let hidden: boolean
const cleanup: (() => void)[] = []

function tick(time: number) {
    const entry = frames.entries().next().value
    if (!entry) throw new Error('No animation scheduled')
    const [id, callback] = entry
    frames.delete(id)
    callback(time)
}
beforeEach(() => {
    frames = new Map(); nextId = 0; hidden = false
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { const id = ++nextId; frames.set(id, callback); return id }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)))
})
afterEach(() => { cleanup.splice(0).forEach(stop => stop()); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('animation isolation and lifecycle', () => {
    it('isolates a failed head and continues drawing healthy subscribers', () => {
        const error = new Error('Canvas failed')
        const failed = vi.fn(() => { throw error })
        const recover = vi.fn()
        const healthy = vi.fn()
        cleanup.push(subscribe(failed, recover), subscribe(healthy))
        tick(100); tick(134)
        expect(failed).toHaveBeenCalledTimes(1)
        expect(recover).toHaveBeenCalledWith(error)
        expect(healthy).toHaveBeenCalledTimes(2)
    })
    it('survives errors in the visual recovery observer as well', () => {
        const healthy = vi.fn()
        cleanup.push(subscribe(() => { throw new Error('draw') }, () => { throw new Error('observer') }), subscribe(healthy))
        expect(() => tick(100)).not.toThrow()
        expect(healthy).toHaveBeenCalledTimes(1)
    })
    it('removes listeners and stops all animation on last unsubscribe', () => {
        const remove = vi.spyOn(document, 'removeEventListener')
        const stop = subscribe(vi.fn())
        cleanup.push(stop)
        stop()
        expect(frames.size).toBe(0)
        expect(remove.mock.calls.map(args => args[0])).toEqual(expect.arrayContaining(['pointermove', 'pointerleave', 'visibilitychange']))
        expect(Number.isNaN(pointer.x)).toBe(true)
        // A later mount must be able to start again after complete shutdown.
        cleanup.push(subscribe(vi.fn()))
        expect(frames.size).toBe(1)
    })
    it('sleeps while the page is hidden and resumes without a large time jump', () => {
        const draw = vi.fn()
        cleanup.push(subscribe(draw))
        tick(100)
        hidden = true; document.dispatchEvent(new Event('visibilitychange'))
        expect(frames.size).toBe(0)
        hidden = false; document.dispatchEvent(new Event('visibilitychange'))
        tick(60000)
        expect(draw).toHaveBeenLastCalledWith(0)
    })
    it('limits visible drawing to 30 FPS without slowing simulation time', () => {
        const draw = vi.fn()
        cleanup.push(subscribe(draw))
        tick(100); tick(116)
        expect(draw).toHaveBeenCalledTimes(1)
        tick(134)
        expect(draw).toHaveBeenCalledTimes(2)
        expect(draw).toHaveBeenLastCalledWith(0.034)
    })
})

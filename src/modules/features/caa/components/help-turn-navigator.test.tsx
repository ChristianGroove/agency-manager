import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { HelpTurnNavigator } from './help-turn-navigator'

let callbacks: Map<number, FrameRequestCallback>
let nextFrame: number

beforeEach(() => {
    callbacks = new Map()
    nextFrame = 0
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
        callbacks.set(++nextFrame, callback)
        return nextFrame
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => callbacks.delete(id)))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function flushFrame() {
    act(() => {
        const pending = [...callbacks.values()]
        callbacks.clear()
        pending.forEach(callback => callback(0))
    })
}

const messages = Array.from({ length: 8 }, (_, index) => ({ role: 'user' as const, content: `Pregunta ${index}` }))

it('coalesces cursor events and paints the latest position with neighboring rounded bars', () => {
    const view = render(<HelpTurnNavigator messages={messages} activeTurn={0} reducedMotion={false} onSelect={vi.fn()} />)
    flushFrame()
    const nav = screen.getByRole('navigation')
    for (let clientY = 6; clientY <= 42; clientY += 2) {
        fireEvent(nav, new MouseEvent('pointermove', { bubbles: true, clientY }))
    }
    expect(callbacks.size).toBe(1)
    flushFrame()
    const bars = view.container.querySelectorAll<HTMLSpanElement>('span[data-index]')
    expect(parseFloat(bars[3].style.width)).toBeCloseTo(23.4)
    expect(parseFloat(bars[2].style.width)).toBeGreaterThan(parseFloat(bars[1].style.width))
    expect(bars[3].style.transform).toBe('')
    expect(bars[3].style.transition).toBe('')
    expect(bars[3]).toHaveClass('rounded-full')
    fireEvent.pointerLeave(nav)
    flushFrame()
    expect(bars[3].style.width).toBe('4px')
    expect(callbacks.size).toBe(0)
})

it('cancels queued work when the navigator unmounts', () => {
    const view = render(<HelpTurnNavigator messages={messages} activeTurn={0} reducedMotion={false} onSelect={vi.fn()} />)
    expect(callbacks.size).toBe(1)
    view.unmount()
    expect(callbacks.size).toBe(0)
})

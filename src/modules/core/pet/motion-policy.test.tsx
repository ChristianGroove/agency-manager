import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RobotHeadView } from './robot-head-view'
import { DEFAULT_PET_SETTINGS } from './config'

vi.mock('./vendor/robot-heads/src/RobotHead', () => ({ RobotHead: ({ paused, interactive }: { paused: boolean; interactive: boolean }) =>
    <span data-testid="motion" data-paused={String(paused)} data-interactive={String(interactive)} />,
}))

let reduced: boolean
let hidden: boolean
const mediaObservers = new Set<() => void>()
const props = { settings: { ...DEFAULT_PET_SETTINGS }, palette: { color: '#112233', trimColor: '#445566', screenColor: '#FFFFFF' }, size: 64 }
beforeEach(() => {
    vi.useFakeTimers(); reduced = false; hidden = false
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
    vi.stubGlobal('matchMedia', () => ({
        get matches() { return reduced },
        addEventListener: (_: string, callback: () => void) => mediaObservers.add(callback),
        removeEventListener: (_: string, callback: () => void) => mediaObservers.delete(callback),
    }))
})
afterEach(() => { cleanup(); mediaObservers.clear(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('pet motion policy', () => {
    it('keeps idle static without requiring an animation loop', () => {
        render(<RobotHeadView {...props} state="idle" />)
        expect(screen.getByTestId('motion')).toHaveAttribute('data-paused', 'true')
    })
    it('settles short contextual gestures while leaving the state visible', () => {
        render(<RobotHeadView {...props} state="happy" animate />)
        expect(screen.getByTestId('motion')).toHaveAttribute('data-paused', 'false')
        act(() => vi.advanceTimersByTime(2500))
        expect(screen.getByTestId('motion')).toHaveAttribute('data-paused', 'true')
    })
    it('caps contextual waiting at 15 seconds instead of consuming CPU indefinitely', () => {
        render(<RobotHeadView {...props} state="thinking" animate />)
        act(() => vi.advanceTimersByTime(2500))
        expect(screen.getByTestId('motion')).toHaveAttribute('data-paused', 'false')
        act(() => vi.advanceTimersByTime(12500))
        expect(screen.getByTestId('motion')).toHaveAttribute('data-paused', 'true')
    })
    it('requires explicit continuous mode for ongoing animation', () => {
        render(<RobotHeadView {...props} settings={{ ...props.settings, animation: 'continuous' }} state="idle" animate />)
        act(() => vi.advanceTimersByTime(60000))
        expect(screen.getByTestId('motion')).toHaveAttribute('data-paused', 'false')
    })
    it('reacts to movement preference changes and page visibility during the session', () => {
        render(<RobotHeadView {...props} state="thinking" animate />)
        act(() => { reduced = true; mediaObservers.forEach(change => change()) })
        expect(screen.getByTestId('motion')).toHaveAttribute('data-paused', 'true')
        act(() => { reduced = false; mediaObservers.forEach(change => change()) })
        expect(screen.getByTestId('motion')).toHaveAttribute('data-paused', 'false')
        act(() => { hidden = true; document.dispatchEvent(new Event('visibilitychange')) })
        expect(screen.getByTestId('motion')).toHaveAttribute('data-paused', 'true')
    })
    it('disables playful click overrides while displaying an error', () => {
        render(<RobotHeadView {...props} settings={{ ...props.settings, interactive: true }} state="error" animate />)
        expect(screen.getByTestId('motion')).toHaveAttribute('data-interactive', 'false')
    })
})

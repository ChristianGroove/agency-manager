import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePetHibernation } from './use-pet-hibernation'
import { PetProvider, usePet } from './pet-provider'
import { DEFAULT_PET_SETTINGS, resolveDashboardPetConfig } from './config'
import { readPetSettings, petSettingsSchema } from './schema'

function Timer({ enabled = true }: { enabled?: boolean }) {
    const { sleeping, wake } = usePetHibernation(enabled, 5)
    return <><output>{sleeping ? 'sleeping' : 'awake'}</output><button onMouseEnter={wake}>Robot</button></>
}
function Signals() {
    const pet = usePet()!
    return <><output>{pet.state}</output><button onMouseEnter={pet.wake}>Robot</button><button onClick={() => pet.reportHelpState('thinking')}>Pregunta</button><button onClick={() => pet.reportHelpState('idle')}>Terminar</button></>
}
beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers() })
describe('hover-based hibernation', () => {
    it('sleeps after five minutes even while the cursor moves elsewhere', () => {
        render(<Timer />)
        act(() => vi.advanceTimersByTime(299999))
        expect(screen.getByText('awake')).toBeInTheDocument()
        fireEvent.pointerMove(document, { clientX: 400, clientY: 200 })
        act(() => vi.advanceTimersByTime(1))
        expect(screen.getByText('sleeping')).toBeInTheDocument()
        fireEvent.pointerMove(document, { clientX: 800, clientY: 200 })
        expect(screen.getByText('sleeping')).toBeInTheDocument()
    })
    it('renews a full five-minute window on hover, including before expiry', () => {
        render(<Timer />)
        act(() => vi.advanceTimersByTime(240000))
        fireEvent.mouseEnter(screen.getByText('Robot'))
        act(() => vi.advanceTimersByTime(299999))
        expect(screen.getByText('awake')).toBeInTheDocument()
        act(() => vi.advanceTimersByTime(1))
        expect(screen.getByText('sleeping')).toBeInTheDocument()
        fireEvent.mouseEnter(screen.getByText('Robot'))
        expect(screen.getByText('awake')).toBeInTheDocument()
    })
    it('can be switched off and removes its timer on unmount', () => {
        const view = render(<Timer enabled={false} />)
        act(() => vi.advanceTimersByTime(600000))
        expect(screen.getByText('awake')).toBeInTheDocument()
        view.rerender(<Timer />)
        expect(vi.getTimerCount()).toBe(1)
        view.unmount()
        expect(vi.getTimerCount()).toBe(0)
    })
    it('starts a fresh active window when re-enabled', () => {
        const view = render(<Timer />)
        act(() => vi.advanceTimersByTime(300000))
        view.rerender(<Timer enabled={false} />)
        view.rerender(<Timer />)
        expect(screen.getByText('awake')).toBeInTheDocument()
        act(() => vi.advanceTimersByTime(300000))
        expect(screen.getByText('sleeping')).toBeInTheDocument()
    })
    it('checks the elapsed deadline when returning from a throttled background tab', () => {
        vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
        render(<Timer />)
        vi.setSystemTime(Date.now() + 360000)
        act(() => document.dispatchEvent(new Event('visibilitychange')))
        expect(screen.getByText('sleeping')).toBeInTheDocument()
    })
    it('keeps real help states visible without renewing the hover deadline', () => {
        const id = '11111111-1111-4111-8111-111111111111'
        render(<PetProvider config={resolveDashboardPetConfig({ ...DEFAULT_PET_SETTINGS, enabled: true, pixyOrganizationId: id }, id)}><Signals /></PetProvider>)
        act(() => vi.advanceTimersByTime(300000))
        expect(screen.getByText('sleeping')).toBeInTheDocument()
        fireEvent.click(screen.getByText('Pregunta'))
        expect(screen.getByText('thinking')).toBeInTheDocument()
        fireEvent.click(screen.getByText('Terminar'))
        expect(screen.getByText('sleeping')).toBeInTheDocument()
    })
    it('keeps existing stored configurations compatible and validates the new setting', () => {
        expect(readPetSettings({ version: 1, enabled: false }).hibernateAfterMinutes).toBe(5)
        expect(readPetSettings({ version: 1, enabled: false }).hibernateEnabled).toBe(true)
        expect(petSettingsSchema.safeParse({ ...DEFAULT_PET_SETTINGS, hibernateAfterMinutes: 0 }).success).toBe(false)
        expect(petSettingsSchema.safeParse({ ...DEFAULT_PET_SETTINGS, hibernateAfterMinutes: 31 }).success).toBe(false)
    })
})

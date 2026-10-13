import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PetProvider, usePet } from './pet-provider'
import { usePetOperation } from './use-pet-operation'
import { DEFAULT_PET_SETTINGS, resolveDashboardPetConfig } from './config'

const orgId = '11111111-1111-4111-8111-111111111111'
const config = (reactions = true) => resolveDashboardPetConfig({ ...DEFAULT_PET_SETTINGS, enabled: true, alertReactions: reactions, pixyOrganizationId: orgId }, orgId)
type Finish = (state: 'happy' | 'error' | 'idle') => void
let first: Finish
let second: Finish
function Probe() {
    const pet = usePet()
    return <><output data-testid="state">{pet?.state}</output>
        <button onClick={() => { first = pet!.beginOperation() }}>Primera</button>
        <button onClick={() => { second = pet!.beginOperation() }}>Segunda</button>
        <button onClick={() => pet?.reportHelpState('thinking')}>Ayuda</button>
        <button onClick={() => pet?.reportCriticalAlert(true)}>Crítico</button>
    </>
}
function PendingSave() {
    const begin = usePetOperation()
    return <button onClick={() => { first = begin() }}>Guardar</button>
}
afterEach(() => { cleanup(); vi.useRealTimers() })
describe('bounded optional module signals', () => {
    it('reports real operation completion and expires feedback', () => {
        vi.useFakeTimers()
        render(<PetProvider config={config()}><Probe /></PetProvider>)
        fireEvent.click(screen.getByText('Primera'))
        expect(screen.getByTestId('state')).toHaveTextContent('working')
        act(() => first('happy'))
        expect(screen.getByTestId('state')).toHaveTextContent('happy')
        act(() => vi.advanceTimersByTime(2500))
        expect(screen.getByTestId('state')).toHaveTextContent('idle')
    })
    it('ignores stale completion from an older operation', () => {
        render(<PetProvider config={config()}><Probe /></PetProvider>)
        fireEvent.click(screen.getByText('Primera')); fireEvent.click(screen.getByText('Segunda'))
        act(() => first('error'))
        expect(screen.getByTestId('state')).toHaveTextContent('working')
        act(() => second('happy'))
        expect(screen.getByTestId('state')).toHaveTextContent('happy')
    })
    it('prioritizes chat and critical alerts over module feedback', () => {
        render(<PetProvider config={config()}><Probe /></PetProvider>)
        fireEvent.click(screen.getByText('Primera')); fireEvent.click(screen.getByText('Ayuda'))
        expect(screen.getByTestId('state')).toHaveTextContent('thinking')
        fireEvent.click(screen.getByText('Crítico'))
        expect(screen.getByTestId('state')).toHaveTextContent('error')
    })
    it('returns to idle when an operation stalls', () => {
        vi.useFakeTimers()
        render(<PetProvider config={config()}><Probe /></PetProvider>)
        fireEvent.click(screen.getByText('Primera'))
        act(() => vi.advanceTimersByTime(15000))
        expect(screen.getByTestId('state')).toHaveTextContent('idle')
    })
    it('does not react when operation reactions are disabled', () => {
        render(<PetProvider config={config(false)}><Probe /></PetProvider>)
        fireEvent.click(screen.getByText('Primera')); act(() => first('error'))
        expect(screen.getByTestId('state')).toHaveTextContent('idle')
    })
    it('clears a pending save on unmount and ignores its later response', () => {
        const petConfig = config()
        const view = render(<PetProvider config={petConfig}><Probe /><PendingSave /></PetProvider>)
        fireEvent.click(screen.getByText('Guardar'))
        view.rerender(<PetProvider config={petConfig}><Probe /></PetProvider>)
        act(() => first('happy'))
        expect(screen.getByTestId('state')).toHaveTextContent('idle')
    })
})

'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useBranding } from '@/components/providers/branding-provider'
import { resolvePetPalette, type DashboardPetConfig, type PetSettings, type PetState } from './config'
import { usePetHibernation } from './use-pet-hibernation'

interface PetContextValue {
    config: DashboardPetConfig
    enabled: boolean
    state: PetState
    palette: ReturnType<typeof resolvePetPalette>
    reportHelpState: (state: PetState) => void
    reportCriticalAlert: (active: boolean) => void
    reportRendererFailure: () => void
    beginOperation: () => (state: 'happy' | 'error' | 'idle') => void
    sleeping: boolean
    wake: () => void
}

const PetContext = createContext<PetContextValue | null>(null)
export function usePet() { return useContext(PetContext) }

export function PetProvider({ config, children }: { config: DashboardPetConfig; children: ReactNode }) {
    const branding = useBranding()
    const [failedSettings, setFailedSettings] = useState<PetSettings | null>(null)
    const [helpState, setHelpState] = useState<PetState>('idle')
    const [criticalAlert, setCriticalAlert] = useState(false)
    const operationSequence = useRef(0)
    const [operation, setOperation] = useState<{ id: number; state: PetState }>({ id: 0, state: 'idle' })
    const beginOperation = useCallback(() => {
        const id = ++operationSequence.current
        if (!config.enabled || !config.settings.alertReactions) return () => {}
        setOperation({ id, state: 'working' })
        let finished = false
        return (state: 'happy' | 'error' | 'idle') => {
            if (finished) return
            finished = true
            setOperation(current => current.id === id ? { id, state } : current)
        }
    }, [config.enabled, config.settings.alertReactions])

    useEffect(() => {
        if (operation.state === 'idle') return
        const timer = setTimeout(() => setOperation(current => current.id === operation.id ? { ...current, state: 'idle' } : current),
            operation.state === 'working' ? 15000 : operation.state === 'error' ? 8000 : 2500)
        return () => clearTimeout(timer)
    }, [operation])
    const enabled = config.enabled && failedSettings !== config.settings
    const { sleeping, wake } = usePetHibernation(enabled && config.settings.hibernateEnabled, config.settings.hibernateAfterMinutes)
    const reportHelpState = useCallback((state: PetState) => {
        if (config.enabled) setHelpState(state)
    }, [config.enabled])
    const reportCriticalAlert = useCallback((active: boolean) => {
        if (config.enabled && config.settings.alertReactions) setCriticalAlert(active)
    }, [config.enabled, config.settings.alertReactions])
    const reportRendererFailure = useCallback(() => setFailedSettings(config.settings), [config.settings])

    useEffect(() => {
        if (helpState !== 'happy' && helpState !== 'error') return
        const timer = setTimeout(() => setHelpState('idle'), helpState === 'happy' ? 2500 : 8000)
        return () => clearTimeout(timer)
    }, [helpState])

    const palette = useMemo(() => resolvePetPalette(config, branding), [config, branding])
    const activeState = criticalAlert && config.settings.alertReactions ? 'error' as const
        : helpState !== 'idle' ? helpState : config.settings.alertReactions ? operation.state : 'idle'
    const value = useMemo(() => ({
        config, enabled, state: activeState === 'idle' && sleeping ? 'sleeping' as const : activeState, palette,
        sleeping, wake, reportHelpState, reportCriticalAlert, reportRendererFailure, beginOperation,
    }), [config, enabled, activeState, sleeping, wake, palette, reportHelpState, reportCriticalAlert, reportRendererFailure, beginOperation])

    return <PetContext.Provider value={value}>{children}</PetContext.Provider>
}

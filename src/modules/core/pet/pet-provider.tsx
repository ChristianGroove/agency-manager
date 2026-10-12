'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useBranding } from '@/components/providers/branding-provider'
import { resolvePetPalette, type DashboardPetConfig, type PetSettings, type PetState } from './config'

interface PetContextValue {
    config: DashboardPetConfig
    enabled: boolean
    state: PetState
    palette: ReturnType<typeof resolvePetPalette>
    reportHelpState: (state: PetState) => void
    reportCriticalAlert: (active: boolean) => void
    reportRendererFailure: () => void
}

const PetContext = createContext<PetContextValue | null>(null)
export function usePet() { return useContext(PetContext) }

export function PetProvider({ config, children }: { config: DashboardPetConfig; children: ReactNode }) {
    const branding = useBranding()
    const [failedSettings, setFailedSettings] = useState<PetSettings | null>(null)
    const [helpState, setHelpState] = useState<PetState>('idle')
    const [criticalAlert, setCriticalAlert] = useState(false)
    const enabled = config.enabled && failedSettings !== config.settings
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
    const value = useMemo(() => ({
        config, enabled, state: criticalAlert && config.settings.alertReactions ? 'error' as const : helpState, palette,
        reportHelpState, reportCriticalAlert, reportRendererFailure,
    }), [config, enabled, criticalAlert, helpState, palette, reportHelpState, reportCriticalAlert, reportRendererFailure])

    return <PetContext.Provider value={value}>{children}</PetContext.Provider>
}

"use client"

import React, { createContext, useContext } from 'react'
import { PortalThemeConfig, DEFAULT_PORTAL_THEME_CONFIG } from './types'
import { usePortalTheme } from './use-portal-theme'

interface PortalThemeContextValue {
    config: PortalThemeConfig
    isGlass: boolean
    isGourmet: boolean
    cardClasses: string
    pageBackgroundClass: string
}

const PortalThemeContext = createContext<PortalThemeContextValue>({
    config: DEFAULT_PORTAL_THEME_CONFIG,
    isGlass: true,
    isGourmet: false,
    cardClasses: '',
    pageBackgroundClass: ''
})

export function PortalThemeProvider({ 
    config: initialConfig, 
    children 
}: { 
    config?: Partial<PortalThemeConfig> | null
    children: React.ReactNode 
}) {
    const themeState = usePortalTheme(initialConfig)

    return (
        <PortalThemeContext.Provider value={themeState}>
            {children}
        </PortalThemeContext.Provider>
    )
}

export function usePortalThemeContext() {
    return useContext(PortalThemeContext)
}

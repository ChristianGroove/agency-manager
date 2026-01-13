"use client"

import { useEffect, createContext, useContext } from "react"
import { BrandingConfig } from "@/types/branding"

interface BrandingProviderProps {
    initialBranding: BrandingConfig
    children: React.ReactNode
}

// Create Context
const BrandingContext = createContext<BrandingConfig | null>(null)

export function useBranding() {
    return useContext(BrandingContext)
}

export function BrandingProvider({ initialBranding, children }: BrandingProviderProps) {
    useEffect(() => {
        if (!initialBranding?.colors) return

        const root = document.documentElement

        // Update Brand Colors
        if (initialBranding.colors.primary) {
            root.style.setProperty("--brand-pink", initialBranding.colors.primary)
            // Primary is already linked to brand-pink in CSS, but we enforce it just in case logic changes
            // or if we want to support direct --primary override
            root.style.setProperty("--primary", initialBranding.colors.primary)
            root.style.setProperty("--sidebar-primary", initialBranding.colors.primary)
        }

        if (initialBranding.colors.secondary) {
            root.style.setProperty("--brand-cyan", initialBranding.colors.secondary)
            root.style.setProperty("--ring", initialBranding.colors.secondary)
        }

    }, [initialBranding])

    return (
        <BrandingContext.Provider value={initialBranding}>
            {children}
        </BrandingContext.Provider>
    )
}


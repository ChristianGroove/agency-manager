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
            root.style.setProperty("--primary", initialBranding.colors.primary)
            root.style.setProperty("--color-primary", initialBranding.colors.primary)
            root.style.setProperty("--sidebar-primary", initialBranding.colors.primary)
        }

        if (initialBranding.colors.secondary) {
            root.style.setProperty("--brand-cyan", initialBranding.colors.secondary)
            root.style.setProperty("--ring", initialBranding.colors.secondary)
            root.style.setProperty("--color-ring", initialBranding.colors.secondary)
        }

    }, [initialBranding])

    const primary = initialBranding?.colors?.primary
    const secondary = initialBranding?.colors?.secondary

    return (
        <BrandingContext.Provider value={initialBranding}>
            {primary && (
                <style
                    id="branding-provider-dynamic-css"
                    dangerouslySetInnerHTML={{
                        __html: `
:root, :root.dark, .dark, [data-theme="dark"], html, body {
  --primary: ${primary} !important;
  --color-primary: ${primary} !important;
  --brand-pink: ${primary} !important;
  --sidebar-primary: ${primary} !important;
  ${secondary ? `--ring: ${secondary} !important; --color-ring: ${secondary} !important; --brand-cyan: ${secondary} !important;` : ''}
}
`,
                    }}
                />
            )}
            {children}
        </BrandingContext.Provider>
    )
}


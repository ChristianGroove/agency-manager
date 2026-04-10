"use client"

import { useBranding } from "@/components/providers/branding-provider"

export function BrandingHeader() {
    const branding = useBranding()
    // Prefer light logo for headers if light background, or main. 
    // Usually headers in onboarding are on light bg (white/gray).
    const logoUrl = branding?.logos?.main_light || branding?.logos?.main || branding?.logos?.favicon || ""
    const appName = branding?.name || "Pixy"

    return (
        <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
            {logoUrl ? (
                <img src={logoUrl} alt={appName} className="h-8 w-auto object-contain" />
            ) : (
                <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center text-white">
                    {appName.charAt(0)}
                </div>
            )}
            {!logoUrl && <span>{appName}</span>}
        </div>
    )
}

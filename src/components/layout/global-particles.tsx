"use client"

import { useEffect, useState } from "react"
import { getEffectiveBranding } from "@/modules/core/branding/actions"

interface GlobalParticlesProps {
    orgId?: string | null
    primaryColor?: string | null
}

function hexToRgb(hex?: string | null): string | null {
    if (!hex) return null
    const clean = hex.replace("#", "")
    if (clean.length === 6) {
        const r = parseInt(clean.substring(0, 2), 16)
        const g = parseInt(clean.substring(2, 4), 16)
        const b = parseInt(clean.substring(4, 6), 16)
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            return `${r}, ${g}, ${b}`
        }
    }
    return null
}

// Generate 40 particles for the global screen with pre-warmed negative delays for immediate screen distribution
const particles = Array.from({ length: 40 }, (_, i) => {
    const duration = (15 + (i % 25)) * 3 // 45-120s horizontal movement
    const prewarmRatio = (i * 0.173) % 1
    const delay = -(prewarmRatio * duration) // Negative delay so particles are already spread across the screen on load
    return {
        id: i,
        isBrandingColor: i % 3 === 0,
        size: 1 + (i % 6), // 1-6px based on index
        top: (i * 2.5) % 100, // Spread across 100% height
        duration,
        delay,
        translateX40: (i % 5) * 4 - 10,
        translateX100: (i % 5) * 8 - 20,
    }
})

export function GlobalParticles({ orgId, primaryColor }: GlobalParticlesProps) {
    const [brandingColor, setBrandingColor] = useState<string>(() => {
        return hexToRgb(primaryColor) || "255, 255, 255"
    })

    useEffect(() => {
        if (primaryColor) {
            const rgb = hexToRgb(primaryColor)
            if (rgb) {
                setBrandingColor(rgb)
                return
            }
        }

        const fetchBranding = async () => {
            try {
                if (!orgId) return
                const data = await getEffectiveBranding(orgId)
                if (data?.colors?.primary) {
                    const rgb = hexToRgb(data.colors.primary)
                    if (rgb) setBrandingColor(rgb)
                }
            } catch (e) {
                console.error("Failed to load branding color for global particles", e)
            }
        }
        fetchBranding()
    }, [orgId, primaryColor])

    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0 text-gray-300 dark:text-white">
            {/* Particles */}
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute rounded-full animate-global-float-right"
                    style={{
                        top: `${p.top}%`,
                        left: `-${p.size + 50}px`, // start off-screen to the left
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        backgroundColor: p.isBrandingColor
                            ? `rgb(${brandingColor})`
                            : 'currentColor',
                        opacity: p.isBrandingColor ? 0.6 : 0.4,
                        boxShadow: p.isBrandingColor ? `0 0 ${p.size * 2}px rgb(${brandingColor})` : 'none',
                        animationDuration: `${p.duration}s`,
                        animationDelay: `${p.delay}s`,
                    }}
                />
            ))}
        </div>
    )
}

"use client"

import { useEffect, useState } from "react"
import { getEffectiveBranding } from "@/modules/core/branding/actions"

interface GlobalParticlesProps {
    orgId?: string | null
}

// Generate 40 particles for the global screen
const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    isBrandingColor: i % 3 === 0,
    size: 1 + (i % 6), // 1-6px based on index
    top: (i * 2.5) % 100, // Spread across 100% height
    duration: (15 + (i % 25)) * 3, // 45-120s (3x slower) movement horizontally
    delay: (i * 0.8) % 10, // Staggered delays
    translateX40: (i % 5) * 4 - 10,
    translateX100: (i % 5) * 8 - 20,
}))

export function GlobalParticles({ orgId }: GlobalParticlesProps) {
    const [brandingColor, setBrandingColor] = useState<string>("255, 255, 255") // Default RGB

    useEffect(() => {
        const fetchBranding = async () => {
            try {
                if (!orgId) return
                const data = await getEffectiveBranding(orgId)
                if (data?.colors?.primary) {
                    const hex = data.colors.primary.replace('#', '')
                    const r = parseInt(hex.substring(0, 2), 16)
                    const g = parseInt(hex.substring(2, 4), 16)
                    const b = parseInt(hex.substring(4, 6), 16)
                    setBrandingColor(`${r}, ${g}, ${b}`)
                }
            } catch (e) {
                console.error("Failed to load branding color for global particles", e)
            }
        }
        fetchBranding()
    }, [orgId])

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

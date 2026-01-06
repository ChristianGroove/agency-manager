"use client"

import { useEffect, useState } from "react"
import { getEffectiveBranding } from "@/modules/core/branding/actions"

interface SidebarParticlesProps {
    orgId: string | null
}

// Generate deterministic values based on index to avoid hydration mismatch
const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    isBrandingColor: i % 3 === 0, // Every 3rd particle uses branding color
    size: 1 + (i % 4), // 1-4px based on index
    left: (i * 8.33) % 100, // Evenly distributed
    duration: 5 + (i % 5), // 5-10s
    delay: (i * 0.4) % 5, // Staggered delays
    translateX40: (i % 5) * 4 - 10, // -10 to 10
    translateX100: (i % 5) * 8 - 20, // -20 to 20
}))

export function SidebarParticles({ orgId }: SidebarParticlesProps) {
    const [brandingColor, setBrandingColor] = useState<string>("255, 255, 255") // Default RGB

    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const data = await getEffectiveBranding(orgId)
                if (data?.colors?.primary) {
                    const hex = data.colors.primary.replace('#', '')
                    const r = parseInt(hex.substring(0, 2), 16)
                    const g = parseInt(hex.substring(2, 4), 16)
                    const b = parseInt(hex.substring(4, 6), 16)
                    setBrandingColor(`${r}, ${g}, ${b}`)
                }
            } catch (e) {
                console.error("Failed to load branding color for particles", e)
            }
        }
        fetchBranding()
    }, [orgId])

    return (
        <div className="absolute bottom-0 left-0 w-full h-[40%] overflow-hidden pointer-events-none z-0 text-gray-300 dark:text-white">
            {/* Light Gradient at bottom */}
            <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-t from-gray-900/5 dark:from-white/10 to-transparent blur-2xl"
                style={{ opacity: 0.3 }}
            />

            {/* Particles */}
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute rounded-full animate-sidebar-float-up"
                    style={{
                        left: `${p.left}%`,
                        bottom: `-${p.size + 10}px`,
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


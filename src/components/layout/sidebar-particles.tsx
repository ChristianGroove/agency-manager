"use client"

import { useEffect, useState } from "react"
import { getEffectiveBranding } from "@/modules/core/branding/actions"

interface SidebarParticlesProps {
    orgId: string | null
}

export function SidebarParticles({ orgId }: SidebarParticlesProps) {
    const [brandingColor, setBrandingColor] = useState<string>("255, 255, 255") // Default RGB

    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const data = await getEffectiveBranding(orgId)
                if (data?.colors?.primary) {
                    // Simple hex to rgb conversion for css var usage if needed, 
                    // or just store the hex. Let's try to parse hex to match the white mix.
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
        <div className="absolute bottom-0 left-0 w-full h-[40%] overflow-hidden pointer-events-none z-0">
            {/* Light Gradient at bottom */}
            <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-t from-white/10 to-transparent blur-2xl"
                style={{ opacity: 0.3 }}
            />

            {/* Particles */}
            {[...Array(12)].map((_, i) => {
                const isBrandingColor = Math.random() > 0.6 // 40% chance of branding color
                const size = Math.random() * 3 + 1 // 1px to 4px
                const duration = Math.random() * 5 + 5 // 5s to 10s
                const delay = Math.random() * 5

                return (
                    <div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            bottom: `-${size + 10}px`, // Start just below view
                            width: `${size}px`,
                            height: `${size}px`,
                            backgroundColor: isBrandingColor
                                ? `rgb(${brandingColor})`
                                : 'white',
                            opacity: isBrandingColor ? 0.6 : 0.4,
                            boxShadow: isBrandingColor ? `0 0 ${size * 2}px rgb(${brandingColor})` : 'none',
                            animation: `sidebarFloatUp ${duration}s linear infinite`,
                            animationDelay: `${delay}s`,
                        }}
                    />
                )
            })}

            <style jsx>{`
                @keyframes sidebarFloatUp {
                    0% {
                        transform: translateY(0) translateX(0);
                        opacity: 0;
                    }
                    10% {
                        opacity: 1;
                    }
                    40% {
                         transform: translateY(-100px) translateX(${Math.random() * 20 - 10}px);
                         opacity: 0.5;
                    }
                    100% {
                        transform: translateY(-300px) translateX(${Math.random() * 40 - 20}px); // Move up ~300px (approx 30% of screen height)
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    )
}

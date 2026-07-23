"use client"

import React from 'react'

export interface CyberGlassBackgroundProps {
    primaryColor?: string
    secondaryColor?: string
    isDark?: boolean
}

export function CyberGlassBackground({ 
    primaryColor = '#08B7E9', 
    secondaryColor = '#3B82F6',
    isDark = false 
}: CyberGlassBackgroundProps) {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
            {/* Ambient Background Gradient Base */}
            <div 
                className="absolute inset-0 transition-colors duration-700"
                style={{
                    backgroundColor: isDark ? '#09090b' : '#f8fafc'
                }}
            />

            {/* Orb 1: Primary Brand Orb (Top-Left) */}
            <div 
                className="absolute -top-32 -left-32 w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] rounded-full blur-[90px] sm:blur-[140px] opacity-35 dark:opacity-30 animate-pulse transition-all duration-1000"
                style={{
                    backgroundColor: primaryColor,
                    animationDuration: '8s'
                }}
            />

            {/* Orb 2: Secondary Accent Orb (Center-Right) */}
            <div 
                className="absolute top-1/3 -right-24 w-[300px] sm:w-[480px] h-[300px] sm:h-[480px] rounded-full blur-[80px] sm:blur-[130px] opacity-30 dark:opacity-25 transition-all duration-1000"
                style={{
                    backgroundColor: secondaryColor || primaryColor,
                    animation: 'floatOrb 12s ease-in-out infinite alternate'
                }}
            />

            {/* Orb 3: Bottom Center Glow */}
            <div 
                className="absolute -bottom-28 left-1/4 w-[320px] sm:w-[500px] h-[320px] sm:h-[500px] rounded-full blur-[95px] sm:blur-[150px] opacity-25 dark:opacity-20 transition-all duration-1000"
                style={{
                    backgroundColor: primaryColor,
                    animation: 'floatOrbReverse 15s ease-in-out infinite alternate'
                }}
            />

            {/* Subtle Grid / Noise Texture Overlay */}
            <div 
                className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04] bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]"
            />

            {/* CSS Animation Keyframes for smooth 60fps Ambient Motion */}
            <style jsx global>{`
                @keyframes floatOrb {
                    0% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(-30px, 40px) scale(1.1); }
                    100% { transform: translate(25px, -20px) scale(0.95); }
                }
                @keyframes floatOrbReverse {
                    0% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(40px, -35px) scale(1.15); }
                    100% { transform: translate(-20px, 20px) scale(0.9); }
                }
            `}</style>
        </div>
    )
}

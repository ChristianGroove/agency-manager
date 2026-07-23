"use client"

import React from 'react'
import { cn } from '@/modules/infrastructure/utils/utils'

export interface CyberGlassBackgroundProps {
    primaryColor?: string
    secondaryColor?: string
    isDark?: boolean
    isFixed?: boolean
}

export function CyberGlassBackground({ 
    primaryColor = '#08B7E9', 
    secondaryColor = '#3B82F6',
    isDark = false,
    isFixed = false
}: CyberGlassBackgroundProps) {
    return (
        <div className={cn(isFixed ? "fixed inset-0" : "absolute inset-0", "pointer-events-none overflow-hidden z-0 select-none")}>
            {/* Ambient Background Base */}
            <div 
                className="absolute inset-0 transition-colors duration-700"
                style={{
                    backgroundColor: isDark ? '#09090b' : '#f1f5f9'
                }}
            />

            {/* Orb 1: Primary Brand Orb (Top-Left) */}
            <div 
                className="absolute -top-24 -left-24 w-[380px] sm:w-[600px] h-[380px] sm:h-[600px] rounded-full blur-[70px] sm:blur-[110px] opacity-60 dark:opacity-45 animate-pulse transition-all duration-1000"
                style={{
                    backgroundColor: primaryColor,
                    animationDuration: '7s'
                }}
            />

            {/* Orb 2: Secondary Accent Orb (Center-Right) */}
            <div 
                className="absolute top-1/3 -right-20 w-[340px] sm:w-[520px] h-[340px] sm:h-[520px] rounded-full blur-[65px] sm:blur-[100px] opacity-55 dark:opacity-40 transition-all duration-1000"
                style={{
                    backgroundColor: secondaryColor || primaryColor,
                    animation: 'floatOrb 10s ease-in-out infinite alternate'
                }}
            />

            {/* Orb 3: Bottom Left Glow */}
            <div 
                className="absolute -bottom-20 left-1/6 w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] rounded-full blur-[75px] sm:blur-[120px] opacity-50 dark:opacity-35 transition-all duration-1000"
                style={{
                    backgroundColor: primaryColor,
                    animation: 'floatOrbReverse 14s ease-in-out infinite alternate'
                }}
            />

            {/* Subtle Grid Texture */}
            <div 
                className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"
            />

            {/* Keyframe Animations */}
            <style jsx global>{`
                @keyframes floatOrb {
                    0% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(-35px, 45px) scale(1.15); }
                    100% { transform: translate(30px, -25px) scale(0.92); }
                }
                @keyframes floatOrbReverse {
                    0% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(45px, -40px) scale(1.2); }
                    100% { transform: translate(-25px, 25px) scale(0.88); }
                }
            `}</style>
        </div>
    )
}

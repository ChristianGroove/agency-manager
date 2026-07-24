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
    const accentColor = secondaryColor && secondaryColor !== primaryColor ? secondaryColor : '#EC4899'

    return (
        <div className={cn(isFixed ? "fixed inset-0" : "absolute inset-0", "pointer-events-none overflow-hidden z-0 select-none")}>
            {/* 1. Base Canvas Background */}
            <div 
                className="absolute inset-0 transition-colors duration-700"
                style={{
                    backgroundColor: isDark ? '#09090b' : '#f0f4f8'
                }}
            />

            {/* 2. Core Aurora Rotating Lens Flare (Center Dynamic Glow) */}
            <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[800px] h-[500px] sm:h-[800px] rounded-full blur-[100px] sm:blur-[160px] opacity-45 dark:opacity-35"
                style={{
                    background: `radial-gradient(circle, ${primaryColor} 0%, ${accentColor} 50%, transparent 75%)`,
                    animation: 'cyberAuroraRotate 18s linear infinite'
                }}
            />

            {/* 3. Orb 1: Floating Primary Brand Sphere (Top-Left) */}
            <div 
                className="absolute -top-32 -left-20 w-[350px] sm:w-[580px] h-[350px] sm:h-[580px] rounded-full blur-[65px] sm:blur-[110px] opacity-65 dark:opacity-50"
                style={{
                    background: `radial-gradient(circle, ${primaryColor} 0%, rgba(8,183,233,0.4) 60%, transparent 80%)`,
                    animation: 'cyberFloatTop 9s ease-in-out infinite alternate'
                }}
            />

            {/* 4. Orb 2: Floating Neon Accent Sphere (Right-Center) */}
            <div 
                className="absolute top-1/3 -right-24 w-[320px] sm:w-[520px] h-[320px] sm:h-[520px] rounded-full blur-[60px] sm:blur-[100px] opacity-60 dark:opacity-45"
                style={{
                    background: `radial-gradient(circle, ${accentColor} 0%, ${primaryColor} 60%, transparent 80%)`,
                    animation: 'cyberFloatRight 11s ease-in-out infinite alternate'
                }}
            />

            {/* 5. Orb 3: Bottom Left Radiant Pulse */}
            <div 
                className="absolute -bottom-24 left-1/10 w-[360px] sm:w-[560px] h-[360px] sm:h-[560px] rounded-full blur-[70px] sm:blur-[120px] opacity-55 dark:opacity-40"
                style={{
                    background: `radial-gradient(circle, ${primaryColor} 0%, ${accentColor} 55%, transparent 75%)`,
                    animation: 'cyberFloatBottom 13s ease-in-out infinite alternate'
                }}
            />

            {/* 6. Sweeping Glass Light Ray (Diagonal Sheen Glide) */}
            <div 
                className="absolute top-0 -left-[100%] w-[200%] h-full opacity-35 dark:opacity-20 pointer-events-none"
                style={{
                    background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)',
                    animation: 'cyberLightSweep 8s cubic-bezier(0.4, 0, 0.2, 1) infinite'
                }}
            />

            {/* 7. Ascending Cyber Floating Particles */}
            <div className="absolute inset-0 overflow-hidden opacity-60 dark:opacity-40">
                <div 
                    className="absolute bottom-10 left-[15%] w-2 h-2 rounded-full blur-[1px]"
                    style={{ backgroundColor: primaryColor, animation: 'cyberParticle 7s linear infinite' }}
                />
                <div 
                    className="absolute bottom-20 left-[45%] w-3 h-3 rounded-full blur-[1px]"
                    style={{ backgroundColor: accentColor, animation: 'cyberParticle 10s linear infinite 2s' }}
                />
                <div 
                    className="absolute bottom-5 left-[75%] w-2.5 h-2.5 rounded-full blur-[1px]"
                    style={{ backgroundColor: primaryColor, animation: 'cyberParticle 8.5s linear infinite 4s' }}
                />
                <div 
                    className="absolute bottom-16 left-[88%] w-2 h-2 rounded-full blur-[1px]"
                    style={{ backgroundColor: accentColor, animation: 'cyberParticle 9s linear infinite 1s' }}
                />
            </div>

            {/* 8. Subtle Radial Grid Texture */}
            <div 
                className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06] bg-[radial-gradient(#000_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#fff_1.2px,transparent_1.2px)] [background-size:22px_22px]"
            />

            {/* GPU Accelerated Keyframe Animations */}
            <style jsx global>{`
                @keyframes cyberAuroraRotate {
                    0% { transform: translate3d(-50%, -50%, 0) rotate(0deg) scale(1); }
                    50% { transform: translate3d(-50%, -50%, 0) rotate(180deg) scale(1.18); }
                    100% { transform: translate3d(-50%, -50%, 0) rotate(360deg) scale(1); }
                }
                @keyframes cyberFloatTop {
                    0% { transform: translate3d(0, 0, 0) scale(1); }
                    50% { transform: translate3d(40px, 35px, 0) scale(1.15); }
                    100% { transform: translate3d(-20px, 60px, 0) scale(0.95); }
                }
                @keyframes cyberFloatRight {
                    0% { transform: translate3d(0, 0, 0) scale(1); }
                    50% { transform: translate3d(-45px, 50px, 0) scale(1.2); }
                    100% { transform: translate3d(30px, -30px, 0) scale(0.9); }
                }
                @keyframes cyberFloatBottom {
                    0% { transform: translate3d(0, 0, 0) scale(1); }
                    50% { transform: translate3d(50px, -45px, 0) scale(1.22); }
                    100% { transform: translate3d(-30px, -20px, 0) scale(0.88); }
                }
                @keyframes cyberLightSweep {
                    0% { transform: translate3d(-60%, 0, 0); }
                    40% { transform: translate3d(60%, 0, 0); }
                    100% { transform: translate3d(60%, 0, 0); }
                }
                @keyframes cyberParticle {
                    0% { transform: translate3d(0, 0, 0) scale(0.8); opacity: 0; }
                    20% { opacity: 0.8; }
                    80% { opacity: 0.8; }
                    100% { transform: translate3d(0, -90vh, 0) scale(1.3); opacity: 0; }
                }
            `}</style>
        </div>
    )
}

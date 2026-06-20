"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import Image from "next/image"

import { useBranding } from "@/components/providers/branding-provider"



// Wave SVG Path (Sine Wave, Fill Bottom)
// M0,50 Q250,100 500,50 Q750,0 1000,50 V100 H0 Z
const WAVE_PATH = "M0,50 Q250,100 500,50 Q750,0 1000,50 V100 H0 Z"

export function GlobalLoader() {
    const branding = useBranding()

    // Dynamic Isotype Logic
    // Use Branding Favicon (Isotype) -> Fallback to default Pixy
    const rawLogoSrc = branding?.logos?.favicon || '/pixy-isotipo.png'
    // Ensure cache busting or v-param handling if needed, but usually simple string check works
    // Clean query params for extension check
    const cleanPath = rawLogoSrc.split('?')[0].toLowerCase()
    const isSvg = cleanPath.endsWith('.svg')

    const logoSrc = branding?.logos?.favicon || '/pixy-isotipo.png'

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl transition-colors duration-500">
            {/* Background: Pure Canvas (Clean) */}

            {/* Logo Animation Container */}
            <div className="relative w-32 h-32 mb-8 flex items-center justify-center">

                {isSvg ? (
                    /* OPTION A: SVG ISOTYPE -> LIQUID WAVE EFFECT */
                    /* Mask Container */
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                        className="absolute inset-0 z-10 w-full h-full"
                        style={{
                            maskImage: `url(${logoSrc})`,
                            maskSize: 'contain',
                            maskPosition: 'center',
                            maskRepeat: 'no-repeat',
                            WebkitMaskImage: `url(${logoSrc})`,
                            WebkitMaskSize: 'contain',
                            WebkitMaskPosition: 'center',
                            WebkitMaskRepeat: 'no-repeat',
                        }}
                    >
                        {/* Layer 1: Empty Base (Adapts to theme) */}
                        <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800/50" />

                        {/* Layer 2: Liquid Wave Fill */}
                        <div className="absolute inset-0 flex flex-col justify-end overflow-hidden">
                            <motion.div
                                className="relative w-full"
                                style={{ backgroundColor: 'var(--brand-pink)' }}
                                initial={{ height: "0%" }}
                                animate={{ height: ["0%", "120%"] }}
                                transition={{
                                    duration: 3.5,
                                    ease: "easeInOut",
                                    repeat: Infinity,
                                    repeatDelay: 0.5
                                }}
                            >
                                {/* The Wave Crest */}
                                <div
                                    className="absolute -top-[15px] left-0 w-[200%] h-[20px] flex"
                                    style={{
                                        animation: 'wave 0.8s linear infinite',
                                        willChange: 'transform',
                                        fill: 'var(--brand-pink)'
                                    }}
                                >
                                    <svg className="w-[50%] h-full" viewBox="0 0 1000 100" preserveAspectRatio="none">
                                        <path d={WAVE_PATH} className="fill-[var(--brand-pink)]" />
                                    </svg>
                                    <svg className="w-[50%] h-full" viewBox="0 0 1000 100" preserveAspectRatio="none">
                                        <path d={WAVE_PATH} className="fill-[var(--brand-pink)]" />
                                    </svg>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                ) : (
                    /* OPTION B: BITMAP IMAGE (PNG/JPG) -> SIMPLE PULSE */
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="relative w-24 h-24" // Slightly smaller to fit nicely
                    >
                        <Image
                            src={logoSrc}
                            alt="Brand Loader"
                            fill
                            className="object-contain"
                            priority
                            unoptimized // Ensure dynamic external URLs work if configured
                        />
                        {/* Subtle pulse behind bitmap to give life */}
                        <motion.div
                            className="absolute inset-0 -z-10 rounded-full blur-2xl opacity-20"
                            style={{ backgroundColor: 'var(--brand-pink)' }}
                            animate={{ opacity: [0.1, 0.3, 0.1], scale: [0.8, 1.1, 0.8] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    </motion.div>
                )}

                {/* Shared Glow (Only for SVG mode mostly, or subtle universal) */}
                {isSvg && (
                    <div
                        className="absolute inset-0 z-0 blur-2xl opacity-30 animate-pulse"
                        style={{ backgroundColor: 'var(--brand-pink)' }}
                    />
                )}
            </div>


            {/* Global Styles for Keyframes */}
            <style jsx global>{`
                @keyframes wave {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    )
}

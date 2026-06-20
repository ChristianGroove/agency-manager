"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { SplitText } from "@/components/ui/split-text"
import dynamic from "next/dynamic"
import { useBranding } from "@/components/providers/branding-provider"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const Lottie = dynamic(() => import("lottie-react"), { ssr: false })

export interface GlobalBannerConfig {
    id?: string
    space_type?: string
    title: string
    description: string | string[]
    cta_text?: string
    cta_url?: string
    media_type?: string
    media_url?: string
    layout_pos?: "left" | "center" | "right"
    theme?: "light" | "dark" | "brand_primary" | "brand_secondary"
    is_active?: boolean
}

export function GlobalDashboardBanner({ config }: { config?: GlobalBannerConfig | null }) {
    const [currentTip, setCurrentTip] = useState(0)
    const [animationData, setAnimationData] = useState<any>(null)
    const branding = useBranding()

    // Si no hay configuración activa, renderizamos un slot vacío igual al anterior
    if (!config || !config.is_active) return null

    const tips = Array.isArray(config.description) ? config.description : [config.description]
    const hasMultipleTips = tips.length > 1

    useEffect(() => {
        // Cargar animación JSON si está definida
        if (config.media_url && config.media_type !== 'image') {
            fetch(config.media_url)
                .then(res => res.json())
                .then(data => setAnimationData(data))
                .catch(err => console.error("Error loading animation:", err))
        }

        // Rotar tips (fade-in text effects)
        if (hasMultipleTips) {
            const interval = setInterval(() => {
                setCurrentTip((prev) => (prev + 1) % tips.length)
            }, 8000)
            return () => clearInterval(interval)
        }
    }, [config.media_url, config.media_type, tips.length, hasMultipleTips])

    let bgClasses = "glass-panel bg-white/10 dark:bg-white/5 backdrop-blur-md shadow-xl text-gray-900 dark:text-white"
    let titleClasses = "text-gray-900 dark:text-white"
    let descClasses = "text-gray-700 dark:text-gray-300"
    let customStyles = {}

    if (config.theme === 'dark') {
        bgClasses = "glass-panel bg-white/5 backdrop-blur-md text-white shadow-xl"
        titleClasses = "text-white"
        descClasses = "text-gray-300"
    } else if (config.theme === 'brand_primary' || config.theme === 'brand_secondary') {
        bgClasses = "glass-panel bg-white/20 dark:bg-white/10 backdrop-blur-md text-white shadow-xl"
        titleClasses = "text-gray-900 dark:text-white drop-shadow-sm"
        descClasses = "text-gray-800 dark:text-white/80"
        // remove inline background to let glassmorphism work
        customStyles = {}
    }

    // Lógica de Layout (Flex direction y alineaciones)
    let containerFlex = "flex-row justify-between"
    let textAlignment = "text-left items-start"
    let mediaAlignment = "justify-end"

    if (config.layout_pos === 'left') {
        containerFlex = "flex-row-reverse justify-between"
        textAlignment = "text-left items-start"
        mediaAlignment = "justify-start"
    } else if (config.layout_pos === 'center') {
        containerFlex = "flex-col md:flex-row justify-center"
        textAlignment = "text-center items-center"
        mediaAlignment = "justify-center"
    }

    return (
        <Card
            className={`w-full h-[250px] relative overflow-hidden rounded-[30px] flex flex-col transition-all duration-500 ${bgClasses}`}
            style={customStyles}
        >
            {/* Animated particles background (Hidden for UI experiment) */}
            {/* 
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" suppressHydrationWarning>
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        suppressHydrationWarning
                        className="absolute w-1 h-1 rounded-full opacity-30"
                        style={{
                            backgroundColor: config.theme === 'brand_primary' || config.theme === 'brand_secondary' ? 'rgba(255,255,255,0.4)' : 'var(--portal-primary, var(--primary))',
                            left: `${Math.random() * 100}%`,
                            bottom: '-10px',
                            animation: `floatUp ${5 + Math.random() * 5}s linear infinite`,
                            animationDelay: `${Math.random() * 5}s`,
                        }}
                    />
                ))}
            </div>
            */}

            <CardContent className={`flex-1 w-full h-full min-h-0 flex ${containerFlex} p-6 z-20 gap-6 overflow-hidden`}>

                {/* Text Content */}
                <div className={`flex-1 flex flex-col justify-center max-w-2xl h-full min-h-0 ${textAlignment} z-20`}>
                    <div className="flex flex-col h-full justify-center w-full min-h-0">
                        <h2 className={`text-2xl md:text-3xl font-extrabold mb-1 tracking-tight shrink-0 ${titleClasses}`}>
                            {config.title}
                        </h2>

                        <div className="flex-1 min-h-[40px] relative w-full flex items-center overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentTip}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: -20, opacity: 0 }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className={`text-sm md:text-base lg:text-lg absolute w-full max-h-full font-medium whitespace-pre-line leading-relaxed overflow-y-auto ${descClasses}`}
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    <style>{`.${descClasses.split(' ')[0]}::-webkit-scrollbar { display: none; }`}</style>
                                    <SplitText delay={0.05} duration={0.02}>
                                        {tips[currentTip] || ''}
                                    </SplitText>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {config.cta_text && (
                            <div className="mt-auto pt-3 shrink-0">
                                <Link href={config.cta_url || '#'}>
                                    <Button
                                        className={`rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 px-6 font-bold`}
                                        variant={config.theme === 'brand_primary' || config.theme === 'dark' ? 'secondary' : 'default'}
                                    >
                                        {config.cta_text}
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Media Element (Lottie / Image) */}
                {config.media_url && (
                    <div className={`relative flex items-center ${mediaAlignment} w-full md:w-[35%] min-h-[150px] md:min-h-full pointer-events-none z-10 
                                     ${config.layout_pos === 'center' ? 'opacity-20 absolute inset-0 !w-full !justify-center' : ''}`}
                    >
                        {config.media_type === 'image' ? (
                            <img src={config.media_url} alt="Banner Graphic" className="max-w-full max-h-[220px] object-contain drop-shadow-2xl" />
                        ) : (
                            animationData && (
                                <Lottie
                                    animationData={animationData}
                                    loop={true}
                                    className="w-full max-w-[280px] drop-shadow-2xl"
                                />
                            )
                        )}
                    </div>
                )}
            </CardContent>

            <style jsx>{`
                @keyframes floatUp {
                    0% {
                        transform: translateY(0) scale(1);
                        opacity: 0;
                    }
                    10% {
                        opacity: 0.5;
                    }
                    50% {
                        opacity: 0.3;
                    }
                    100% {
                        transform: translateY(-400px) scale(0.5);
                        opacity: 0;
                    }
                }
            `}</style>
        </Card>
    )
}

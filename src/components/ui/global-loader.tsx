"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import Image from "next/image"

const LOADING_TEXTS = [
    "Cargando recursos...",
    "Conectando base de datos...",
    "Sincronizando assets...",
    "Iniciando Pixy CRM...",
    "Optimizando experiencia..."
]

export function GlobalLoader() {
    const [textIndex, setTextIndex] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setTextIndex((prev) => (prev + 1) % LOADING_TEXTS.length)
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-zinc-950 backdrop-blur-3xl">
            {/* Background Ambient Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] animate-pulse" />
            </div>

            {/* Logo Animation */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                    scale: [1, 1.05, 1],
                    opacity: 1,
                    filter: ["drop-shadow(0 0 0px var(--primary))", "drop-shadow(0 0 20px var(--primary))", "drop-shadow(0 0 0px var(--primary))"]
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="relative w-32 h-32 mb-8"
            >
                <Image
                    src="/pixy-isotipo.png"
                    alt="Pixy Loader"
                    fill
                    className="object-contain"
                    priority
                />
            </motion.div>

            {/* Loading Bar */}
            <div className="w-48 h-1 bg-muted rounded-full overflow-hidden mb-4 relative">
                <motion.div
                    className="absolute inset-0 bg-primary"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "linear",
                        repeatType: "loop"
                    }}
                />
            </div>

            {/* Dynamic Text */}
            <div className="h-6 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={textIndex}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="text-sm font-medium text-muted-foreground tracking-widest uppercase"
                    >
                        {LOADING_TEXTS[textIndex]}
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
    )
}

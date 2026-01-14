"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles } from "lucide-react"
import { useViewContext } from "../context/view-context"
import { cn } from "@/lib/utils"

interface FloatingAssistantProps {
    onOpen: () => void
}

export function FloatingAssistant({ onOpen }: FloatingAssistantProps) {
    const { currentContext } = useViewContext()
    const [isHovered, setIsHovered] = useState(false)

    // Fallback if no specific context is active
    const label = currentContext?.label ? `Asistente de ${currentContext.label}` : "Pixy Assistant"

    return (
        <div className="fixed bottom-6 right-6 z-[100]">
            <motion.button
                layout
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpen}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="group relative flex items-center gap-3 bg-zinc-900/90 dark:bg-white/90 backdrop-blur-xl border border-white/10 dark:border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.2)] pl-4 pr-4 py-3 rounded-full transition-all duration-500 ease-out overflow-hidden"
            >
                {/* Magnetic Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-zinc-100 dark:text-zinc-900" strokeWidth={1.5} />
                    {/* Activity Dot */}
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                </div>

                <AnimatePresence mode="wait">
                    {isHovered && (
                        <motion.span
                            initial={{ width: 0, opacity: 0, x: -10 }}
                            animate={{ width: 'auto', opacity: 1, x: 0 }}
                            exit={{ width: 0, opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="font-medium text-sm text-zinc-100 dark:text-zinc-900 whitespace-nowrap overflow-hidden"
                        >
                            {label}
                            <span className="ml-2 px-1.5 py-0.5 rounded-md bg-white/20 dark:bg-black/10 text-[10px] uppercase tracking-wider font-bold">Cmd+K</span>
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>
        </div>
    )
}

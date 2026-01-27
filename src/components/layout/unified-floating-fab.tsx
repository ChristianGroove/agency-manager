"use client"

import { useState } from "react"
import { motion, AnimatePresence, Variants } from "framer-motion"
import { Rocket, Moon, Sun, MessageSquare } from "lucide-react"
import { useTheme } from "next-themes"
import Image from "next/image"
import { cn } from "@/lib/utils"

// Props: Handlers for the actions
interface UnifiedFloatingFabProps {
    onOpenMeta: () => void
    onOpenHelp: () => void
}

export function UnifiedFloatingFab({ onOpenMeta, onOpenHelp }: UnifiedFloatingFabProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const { theme, setTheme } = useTheme()

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark")
    }

    // Animation variants
    const containerVariants: Variants = {
        collapsed: {
            transition: { staggerChildren: 0.03, staggerDirection: 1 } // Retract: Top down (Faster)
        },
        expanded: {
            transition: { staggerChildren: 0.05, delayChildren: 0.05, staggerDirection: -1 } // Emerge: Bottom up (Faster start)
        }
    }

    const itemVariants: Variants = {
        collapsed: { opacity: 0, scale: 0.3, y: 50 }, // Start slightly larger (0.3) to avoid "tiny" look for too long
        expanded: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { type: "spring", stiffness: 500, damping: 25 } // Snappier spring
        }
    }

    // Floating animation for the trigger
    const triggerVariants: Variants = {
        floating: {
            y: [0, -8, 0],
            rotate: [0, 2, -2, 0],
            transition: {
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
            }
        },
        expanded: {
            y: 0,
            rotate: 0,
            transition: { duration: 0.3 }
        }
    }

    return (
        <>
            {/* Backdrop for Click Outside (Only when expanded) */}
            {isExpanded && (
                <div
                    className="fixed inset-0 z-[9998]"
                    onClick={() => setIsExpanded(false)}
                />
            )}

            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-center gap-3">
                {/* Expanded Menu Actions */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            className="flex flex-col gap-3 pb-2 relative z-0" // Lower Z-index
                            initial="collapsed"
                            animate="expanded"
                            exit="collapsed"
                            variants={containerVariants}
                        >
                            {/* 3. HELP (Top) */}
                            <motion.button
                                variants={itemVariants}
                                onClick={() => {
                                    onOpenHelp()
                                    setIsExpanded(false)
                                }}
                                className={cn(
                                    "relative group flex items-center justify-center w-10 h-10 rounded-full",
                                    "bg-white dark:bg-zinc-800 shadow-lg border border-gray-200 dark:border-zinc-700",
                                    "hover:scale-110 transition-transform"
                                )}
                                title="Asistente IA"
                            >
                                <MessageSquare className="w-5 h-5 text-primary" />
                                {/* Tooltip */}
                                <span className="absolute right-12 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap backdrop-blur-sm pointer-events-none">
                                    Chat Asistente
                                </span>
                            </motion.button>

                            {/* 2. META (Middle) */}
                            <motion.button
                                variants={itemVariants}
                                onClick={() => {
                                    onOpenMeta()
                                    setIsExpanded(false)
                                }}
                                className={cn(
                                    "relative group flex items-center justify-center w-10 h-10 rounded-full",
                                    "bg-white dark:bg-zinc-800 shadow-lg border border-gray-200 dark:border-zinc-700",
                                    "hover:scale-110 transition-transform"
                                )}
                                title="Meta Control"
                            >
                                <Rocket className="w-5 h-5 text-primary" />
                                <span className="absolute right-12 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap backdrop-blur-sm pointer-events-none">
                                    Meta Control
                                </span>
                            </motion.button>

                            {/* 1. THEME (Bottom) */}
                            <motion.button
                                variants={itemVariants}
                                onClick={toggleTheme}
                                className={cn(
                                    "relative group flex items-center justify-center w-10 h-10 rounded-full",
                                    "bg-white dark:bg-zinc-800 shadow-lg border border-gray-200 dark:border-zinc-700",
                                    "hover:scale-110 transition-transform"
                                )}
                                title="Cambiar Tema"
                            >
                                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-primary" />
                                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-primary" />
                                <span className="absolute right-12 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap backdrop-blur-sm pointer-events-none">
                                    Tema {theme === 'dark' ? 'Claro' : 'Oscuro'}
                                </span>
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Trigger (Droid) */}
                <motion.button
                    onClick={() => setIsExpanded(!isExpanded)}
                    variants={triggerVariants}
                    animate={isExpanded ? "expanded" : "floating"}
                    // Removed width/height animation to prevent jitter. Using Scale and Classes.
                    className={cn(
                        "relative w-10 h-10 rounded-full flex items-center justify-center", // Base size w-10 (40px)
                        "transition-all duration-300 ease-out", // Smoother transition

                        // Default High-Glass Style
                        "bg-white/30 dark:bg-black/40 backdrop-blur-xl border border-white/30 dark:border-white/20",
                        "shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]",

                        // Hover: Scale up + Solid Premium Look
                        "hover:scale-125", // Scale instead of w/h
                        "hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200 dark:hover:from-zinc-800 dark:hover:to-black",
                        "hover:border-white/50 dark:hover:border-white/20",
                        "hover:shadow-[0_4px_25px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_4px_35px_rgba(0,0,0,0.6)]",

                        "z-10 overflow-hidden group" // Ensure Z > options (z-0)
                    )}
                    whileTap={{ scale: 0.9 }}
                >
                    {/* Droid Image - Flipped to look Left, Rotates on Expand */}
                    <motion.div
                        className="relative w-full h-full p-1 opacity-90 group-hover:opacity-100"
                        animate={{
                            rotate: isExpanded ? -90 : 0,
                            scaleX: -1 // Maintain flip
                        }}
                        whileHover={{
                            rotate: isExpanded ? -90 : 12, // While expanded stay -90, else 12
                            scaleX: -1
                        }}
                        transition={{ duration: 0.3 }}
                    >
                        <Image
                            src="/assets/droid.png"
                            alt="AI Assistant"
                            fill
                            className="object-contain"
                            sizes="56px"
                        />
                    </motion.div>

                    {/* Holographic Ring effect on hover */}
                    <div className={cn(
                        "absolute inset-[-4px] rounded-full border border-cyan-400/0 group-hover:border-cyan-400/50 transition-colors duration-500 pointer-events-none",
                        "group-hover:shadow-[0_0_15px_rgba(34,211,153,0.3)]"
                    )} />
                </motion.button>
            </div>
        </>
    )
}

"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence, useDragControls } from "framer-motion"
import { useViewContext } from "../context/view-context"
import { cn } from "@/lib/utils"

interface FloatingAssistantProps {
    onOpen: () => void
}

/**
 * FloatingAssistant v3.1 - HOLOGRAM ORB (Refined)
 * 
 * Changes:
 * - 30% smaller overall
 * - Default state 20% smaller than hover
 * - Black sphere in light mode for contrast
 * - Draggable to any position
 */
export function FloatingAssistant({ onOpen }: FloatingAssistantProps) {
    const { currentContext } = useViewContext()
    const [isHovered, setIsHovered] = useState(false)
    const [isLaunching, setIsLaunching] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const dragControls = useDragControls()

    const handleClick = () => {
        // Don't open if we just finished dragging
        if (isDragging) return

        setIsLaunching(true)
        setTimeout(() => {
            onOpen()
            setIsLaunching(false)
        }, 400)
    }

    // Sizes: Base 40px (was 56px = 30% reduction), hover adds 20%
    const baseSize = isHovered ? 40 : 32  // 32px default, 40px on hover
    const ringOffset1 = isHovered ? 6 : 4
    const ringOffset2 = isHovered ? 8 : 6
    const ringOffset3 = isHovered ? 3 : 2

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.1}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setTimeout(() => setIsDragging(false), 100)}
            whileDrag={{ scale: 1.05, cursor: "grabbing" }}
            className="fixed bottom-6 right-6 z-[100] cursor-grab"
            style={{ touchAction: "none" }}
        >
            {/* Ambient Glow */}
            <motion.div
                animate={{
                    scale: isHovered ? 1.8 : 1,
                    opacity: isHovered ? 0.8 : 0.3
                }}
                className={cn(
                    "absolute inset-0 rounded-full blur-xl transition-all duration-500",
                    "bg-gradient-to-r from-primary/40 via-fuchsia-500/30 to-cyan-400/40",
                    isLaunching && "opacity-0 scale-[3]"
                )}
            />

            {/* Floating Container with Bobbing Animation */}
            <motion.div
                animate={{
                    y: [0, -5, 0],
                    scale: isHovered ? 1 : 0.8, // 20% smaller when not hovered
                }}
                transition={{
                    y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                    scale: { duration: 0.3, ease: "easeOut" }
                }}
                className="relative"
            >
                {/* Outer Orbital Ring 1 */}
                <motion.div
                    animate={{
                        rotateY: 360,
                        rotateX: isHovered ? 20 : 0
                    }}
                    transition={{
                        rotateY: { duration: isHovered ? 3 : 8, repeat: Infinity, ease: "linear" },
                        rotateX: { duration: 0.5 }
                    }}
                    className="absolute pointer-events-none"
                    style={{
                        inset: `-${ringOffset1}px`,
                        perspective: "200px",
                        transformStyle: "preserve-3d"
                    }}
                >
                    <div className={cn(
                        "absolute inset-0 rounded-full border",
                        "border-primary/50",
                        "shadow-[0_0_10px_rgba(242,5,226,0.3)]",
                        isHovered && "border-primary/80 border-2"
                    )} />
                </motion.div>

                {/* Outer Orbital Ring 2 */}
                <motion.div
                    animate={{
                        rotateZ: -360,
                        rotateX: isHovered ? -30 : -60
                    }}
                    transition={{
                        rotateZ: { duration: isHovered ? 4 : 12, repeat: Infinity, ease: "linear" },
                        rotateX: { duration: 0.5 }
                    }}
                    className="absolute pointer-events-none"
                    style={{
                        inset: `-${ringOffset2}px`,
                        perspective: "200px",
                        transformStyle: "preserve-3d"
                    }}
                >
                    <div className={cn(
                        "absolute inset-0 rounded-full border",
                        "border-cyan-400/40",
                        "shadow-[0_0_8px_rgba(0,224,255,0.2)]",
                        isHovered && "border-cyan-400/70"
                    )} />
                </motion.div>

                {/* Outer Orbital Ring 3 */}
                <motion.div
                    animate={{
                        rotateY: -360,
                        rotateZ: isHovered ? 45 : 30
                    }}
                    transition={{
                        rotateY: { duration: isHovered ? 5 : 15, repeat: Infinity, ease: "linear" },
                        rotateZ: { duration: 0.5 }
                    }}
                    className="absolute pointer-events-none"
                    style={{
                        inset: `-${ringOffset3}px`,
                        perspective: "200px",
                        transformStyle: "preserve-3d"
                    }}
                >
                    <div className={cn(
                        "absolute inset-0 rounded-full border",
                        "border-fuchsia-400/25",
                        isHovered && "border-fuchsia-400/50"
                    )} />
                </motion.div>

                {/* Main Orb Button */}
                <motion.button
                    onClick={handleClick}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    whileTap={{ scale: 0.9 }}
                    animate={{
                        scale: isLaunching ? [1, 1.3, 0] : 1,
                        opacity: isLaunching ? [1, 1, 0] : 1,
                        width: baseSize,
                        height: baseSize,
                    }}
                    transition={{
                        scale: { duration: 0.4 },
                        width: { duration: 0.3 },
                        height: { duration: 0.3 }
                    }}
                    className={cn(
                        "relative rounded-full",
                        // Light mode: white/light sphere
                        "bg-gradient-to-br from-white via-zinc-100 to-zinc-50",
                        // Dark mode: dark sphere
                        "dark:from-zinc-900 dark:via-zinc-800 dark:to-black",
                        "backdrop-blur-xl",
                        // Light mode: dark border for contrast
                        "border border-zinc-300 dark:border-white/20",
                        "flex items-center justify-center",
                        "transition-shadow duration-500",
                        "overflow-hidden",
                        // Light mode shadow
                        "shadow-[0_4px_20px_rgba(0,0,0,0.15),inset_0_0_15px_rgba(242,5,226,0.1)]",
                        // Dark mode shadow
                        "dark:shadow-[0_4px_20px_rgba(0,0,0,0.3),inset_0_0_15px_rgba(242,5,226,0.1)]",
                        isHovered && "shadow-[0_4px_30px_rgba(242,5,226,0.3),inset_0_0_25px_rgba(242,5,226,0.2)]",
                        isHovered && "dark:shadow-[0_4px_30px_rgba(0,0,0,0.4),inset_0_0_25px_rgba(242,5,226,0.25)]"
                    )}
                >
                    {/* Inner Holographic Gradients */}
                    <div className={cn(
                        "absolute inset-0 rounded-full",
                        "bg-[radial-gradient(circle_at_30%_30%,rgba(242,5,226,0.2),transparent_50%)]",
                        "transition-opacity duration-300",
                        isHovered ? "opacity-100" : "opacity-40"
                    )} />
                    <div className={cn(
                        "absolute inset-0 rounded-full",
                        "bg-[radial-gradient(circle_at_70%_70%,rgba(0,224,255,0.15),transparent_50%)]",
                        "transition-opacity duration-300",
                        isHovered ? "opacity-100" : "opacity-20"
                    )} />

                    {/* AI Eye / Ready Icon */}
                    <div className="relative z-10">
                        <AnimatePresence mode="wait">
                            {!isHovered ? (
                                <motion.div
                                    key="eye"
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                    className="relative"
                                >
                                    {/* Eye Glow */}
                                    <div className="absolute inset-[-3px] rounded-full bg-primary/30 blur-sm" />

                                    {/* Eye Ring - smaller */}
                                    <div className={cn(
                                        "w-4 h-4 rounded-full",
                                        "bg-gradient-to-br from-primary via-fuchsia-500 to-primary",
                                        "flex items-center justify-center",
                                        "shadow-[0_0_12px_rgba(242,5,226,0.6)]",
                                        "border border-white/30"
                                    )}>
                                        {/* Pupil */}
                                        <motion.div
                                            animate={{
                                                x: [0, 0.5, -0.5, 0],
                                                y: [0, -0.3, 0.3, 0],
                                            }}
                                            transition={{
                                                duration: 4,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                            className="w-2 h-2 rounded-full bg-zinc-900 shadow-inner relative"
                                        >
                                            <div className="absolute top-0.5 left-0.5 w-1 h-1 rounded-full bg-white/90" />
                                        </motion.div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="ready"
                                    initial={{ scale: 0, opacity: 0, rotate: -90 }}
                                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                    exit={{ scale: 0, opacity: 0, rotate: 90 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                    className="relative"
                                >
                                    <div className="absolute inset-[-4px] rounded-full bg-cyan-400/40 blur-sm animate-pulse" />
                                    <div className={cn(
                                        "w-5 h-5 rounded-full",
                                        "bg-gradient-to-br from-cyan-400 via-primary to-fuchsia-500",
                                        "flex items-center justify-center",
                                        "shadow-[0_0_15px_rgba(0,224,255,0.5)]"
                                    )}>
                                        <span className="text-white font-bold text-xs leading-none">?</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Particles on Hover */}
                    {isHovered && (
                        <>
                            {[...Array(4)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                                    animate={{
                                        x: Math.cos((i * 90) * Math.PI / 180) * 20,
                                        y: Math.sin((i * 90) * Math.PI / 180) * 20,
                                        opacity: [0, 1, 0],
                                        scale: [0, 1, 0]
                                    }}
                                    transition={{
                                        duration: 1.2,
                                        repeat: Infinity,
                                        delay: i * 0.15,
                                        ease: "easeOut"
                                    }}
                                    className={cn(
                                        "absolute w-1 h-1 rounded-full",
                                        i % 2 === 0 ? "bg-primary" : "bg-cyan-400"
                                    )}
                                />
                            ))}
                        </>
                    )}
                </motion.button>

                {/* Tooltip */}
                <AnimatePresence>
                    {isHovered && !isLaunching && !isDragging && (
                        <motion.div
                            initial={{ opacity: 0, x: 8, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 8, scale: 0.9 }}
                            className={cn(
                                "absolute right-full mr-3 top-1/2 -translate-y-1/2",
                                "px-3 py-1.5 rounded-lg",
                                "bg-zinc-900/95 backdrop-blur-xl",
                                "border border-primary/30",
                                "shadow-[0_0_15px_rgba(242,5,226,0.2)]",
                                "whitespace-nowrap"
                            )}
                        >
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-white">
                                    Asistente
                                </span>
                                <span className="px-1 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-mono font-bold">
                                    ⌘K
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    )
}

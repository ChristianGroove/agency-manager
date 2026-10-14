"use client"

import React from "react"
import { motion } from "framer-motion"

export interface AnimatedBorderBeamProps {
    className?: string
    duration?: number
}

export function AnimatedBorderBeam({ className = "rounded-2xl", duration = 2.5 }: AnimatedBorderBeamProps) {
    return (
        <div className={`absolute -inset-[1px] ${className} overflow-hidden pointer-events-none z-10`}>
            {/* Top Beam */}
            <motion.div
                className="absolute top-0 left-0 h-[2.5px] w-[50%] bg-gradient-to-r from-transparent via-white to-transparent opacity-75"
                initial={{ filter: "blur(2px)" }}
                animate={{
                    left: ["-50%", "100%"],
                    opacity: [0.3, 0.75, 0.3],
                    filter: ["blur(1px)", "blur(2.5px)", "blur(1px)"],
                }}
                transition={{
                    left: {
                        duration,
                        ease: "easeInOut",
                        repeat: Infinity,
                        repeatDelay: 1,
                    },
                    opacity: {
                        duration: 1.2,
                        repeat: Infinity,
                        repeatType: "mirror",
                    },
                    filter: {
                        duration: 1.5,
                        repeat: Infinity,
                        repeatType: "mirror",
                    },
                }}
            />

            {/* Right Beam */}
            <motion.div
                className="absolute top-0 right-0 h-[50%] w-[2.5px] bg-gradient-to-b from-transparent via-white to-transparent opacity-75"
                initial={{ filter: "blur(2px)" }}
                animate={{
                    top: ["-50%", "100%"],
                    opacity: [0.3, 0.75, 0.3],
                    filter: ["blur(1px)", "blur(2.5px)", "blur(1px)"],
                }}
                transition={{
                    top: {
                        duration,
                        ease: "easeInOut",
                        repeat: Infinity,
                        repeatDelay: 1,
                        delay: 0.6,
                    },
                    opacity: {
                        duration: 1.2,
                        repeat: Infinity,
                        repeatType: "mirror",
                        delay: 0.6,
                    },
                    filter: {
                        duration: 1.5,
                        repeat: Infinity,
                        repeatType: "mirror",
                        delay: 0.6,
                    },
                }}
            />

            {/* Bottom Beam */}
            <motion.div
                className="absolute bottom-0 right-0 h-[2.5px] w-[50%] bg-gradient-to-r from-transparent via-white to-transparent opacity-75"
                initial={{ filter: "blur(2px)" }}
                animate={{
                    right: ["-50%", "100%"],
                    opacity: [0.3, 0.75, 0.3],
                    filter: ["blur(1px)", "blur(2.5px)", "blur(1px)"],
                }}
                transition={{
                    right: {
                        duration,
                        ease: "easeInOut",
                        repeat: Infinity,
                        repeatDelay: 1,
                        delay: 1.2,
                    },
                    opacity: {
                        duration: 1.2,
                        repeat: Infinity,
                        repeatType: "mirror",
                        delay: 1.2,
                    },
                    filter: {
                        duration: 1.5,
                        repeat: Infinity,
                        repeatType: "mirror",
                        delay: 1.2,
                    },
                }}
            />

            {/* Left Beam */}
            <motion.div
                className="absolute bottom-0 left-0 h-[50%] w-[2.5px] bg-gradient-to-b from-transparent via-white to-transparent opacity-75"
                initial={{ filter: "blur(2px)" }}
                animate={{
                    bottom: ["-50%", "100%"],
                    opacity: [0.3, 0.75, 0.3],
                    filter: ["blur(1px)", "blur(2.5px)", "blur(1px)"],
                }}
                transition={{
                    bottom: {
                        duration,
                        ease: "easeInOut",
                        repeat: Infinity,
                        repeatDelay: 1,
                        delay: 1.8,
                    },
                    opacity: {
                        duration: 1.2,
                        repeat: Infinity,
                        repeatType: "mirror",
                        delay: 1.8,
                    },
                    filter: {
                        duration: 1.5,
                        repeat: Infinity,
                        repeatType: "mirror",
                        delay: 1.8,
                    },
                }}
            />

            {/* Corner Sparkle Dots */}
            <motion.div
                className="absolute top-0 left-0 h-[5px] w-[5px] rounded-full bg-white/40 blur-[1px]"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "mirror" }}
            />
            <motion.div
                className="absolute top-0 right-0 h-[7px] w-[7px] rounded-full bg-white/60 blur-[1.5px]"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2.4, repeat: Infinity, repeatType: "mirror", delay: 0.5 }}
            />
            <motion.div
                className="absolute bottom-0 right-0 h-[7px] w-[7px] rounded-full bg-white/60 blur-[1.5px]"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2.2, repeat: Infinity, repeatType: "mirror", delay: 1 }}
            />
            <motion.div
                className="absolute bottom-0 left-0 h-[5px] w-[5px] rounded-full bg-white/40 blur-[1px]"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2.3, repeat: Infinity, repeatType: "mirror", delay: 1.5 }}
            />
        </div>
    )
}

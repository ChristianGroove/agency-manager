"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"

interface SplitTextProps {
    children: string
    className?: string
    delay?: number
    duration?: number
}

export function SplitText({
    children,
    className = "",
    delay = 0,
    duration = 0.05
}: SplitTextProps) {
    const letters = children.split("")

    const container = {
        hidden: { opacity: 0 },
        visible: (i = 1) => ({
            opacity: 1,
            transition: { staggerChildren: duration, delayChildren: delay },
        }),
    }

    const child = {
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring" as const,
                damping: 12,
                stiffness: 200,
            },
        },
        hidden: {
            opacity: 0,
            y: 20,
        },
    }

    return (
        <motion.span
            className={className}
            variants={container}
            initial="hidden"
            whileInView="visible" // Change to whileInView for scroll trigger, or keep animate="visible"
            animate="visible"
            viewport={{ once: true }}
        >
            {letters.map((letter, index) => (
                <motion.span key={index} variants={child}>
                    {letter === " " ? "\u00A0" : letter}
                </motion.span>
            ))}
        </motion.span>
    )
}

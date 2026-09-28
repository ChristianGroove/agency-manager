"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"
import { cn } from "@/modules/infrastructure/utils/utils"

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
    if (!children) return null

    // Normalizar saltos de línea (\r\n -> \n)
    const sanitized = typeof children === "string" ? children.replace(/\r\n/g, "\n") : String(children)
    // Split by words to ensure words and numbers (like '2026') do not break awkwardly mid-word
    const words = sanitized.split(" ")

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

    let charCount = 0

    return (
        <motion.span
            key={sanitized}
            className={cn("inline min-w-0", className)}
            variants={container}
            initial="hidden"
            animate="visible"
        >
            {words.map((word, wIdx) => (
                <span key={wIdx} className="inline">
                    <span className="inline-block whitespace-nowrap">
                        {word.split("").map((letter) => {
                            const idx = charCount++
                            if (letter === "\n") {
                                return <br key={idx} className="select-none" />
                            }
                            return (
                                <motion.span key={idx} variants={child} className="inline-block">
                                    {letter}
                                </motion.span>
                            )
                        })}
                    </span>
                    {wIdx < words.length - 1 ? " " : ""}
                </span>
            ))}
        </motion.span>
    )
}


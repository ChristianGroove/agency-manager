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
    const letters = sanitized.split("")

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
            key={sanitized}
            className={cn("inline", className)}
            variants={container}
            initial="hidden"
            animate="visible"
        >
            {letters.map((letter, index) => {
                if (letter === "\n") {
                    return <br key={index} className="select-none" />
                }
                if (letter === " ") {
                    return (
                        <span key={index} className="inline">
                            {" "}
                        </span>
                    )
                }
                return (
                    <motion.span key={index} variants={child} className="inline-block">
                        {letter}
                    </motion.span>
                )
            })}
        </motion.span>
    )
}


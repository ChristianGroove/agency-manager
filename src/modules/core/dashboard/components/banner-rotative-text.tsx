"use client"

import { motion } from "framer-motion"
import { cn } from "@/modules/infrastructure/utils/utils"

interface BannerRotativeTextProps {
    children: string
    className?: string
    delay?: number
    duration?: number
}

/**
 * Componente de animación especializado EXCLUSIVAMENTE para los textos rotativos y párrafos
 * dinámicos del Banner Global del Dashboard.
 * 
 * - Soporta saltos de línea con \n y renderizado explícito de <br />.
 * - Mantiene espacios normales rompibles para que los párrafos se ajusten al ancho del banner.
 * - Aceleración por hardware con inline-block para animar letras sin cortar el contenedor.
 */
export function BannerRotativeText({
    children,
    className = "",
    delay = 0,
    duration = 0.015
}: BannerRotativeTextProps) {
    if (!children) return null

    // Normalizar saltos de línea (\r\n -> \n)
    const sanitized = typeof children === "string" ? children.replace(/\r\n/g, "\n") : String(children)
    const letters = sanitized.split("")

    const container = {
        hidden: { opacity: 0 },
        visible: () => ({
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
            y: 8,
        },
    }

    return (
        <motion.span
            key={sanitized}
            className={cn("inline w-full", className)}
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

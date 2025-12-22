"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface MagicCardProps {
    children: React.ReactNode
    className?: string
    gradientSize?: number
    gradientColor?: string
    gradientOpacity?: number
}

export function MagicCard({
    children,
    className,
    gradientSize = 200,
    gradientColor = "#00E0FF",
    gradientOpacity = 0.25,
}: MagicCardProps) {
    const cardRef = useRef<HTMLDivElement>(null)
    const [isFocused, setIsFocused] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [opacity, setOpacity] = useState(0)

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return

        const card = cardRef.current
        const rect = card.getBoundingClientRect()

        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }

    const handleMouseEnter = () => {
        setOpacity(gradientOpacity)
        setIsFocused(true)
    }

    const handleMouseLeave = () => {
        setOpacity(0)
        setIsFocused(false)
    }

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn(
                "relative rounded-[30px]",
                className
            )}
        >
            <div
                className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 rounded-[30px]"
                style={{
                    opacity,
                    background: `radial-gradient(${gradientSize}px circle at ${position.x}px ${position.y}px, ${gradientColor}, transparent 100%)`,
                }}
            />
            <div className="relative z-10">
                {children}
            </div>
        </div>
    )
}

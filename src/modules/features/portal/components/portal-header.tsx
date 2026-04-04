"use client"

import { SplitText } from "@/components/ui/split-text"
import { cn } from "@/lib/utils"

interface PortalHeaderProps {
    title: string
    subtitle?: string
    className?: string
    centered?: boolean
}

export function PortalHeader({ title, subtitle, className, centered = true }: PortalHeaderProps) {
    return (
        <div className={cn(
            "space-y-2 mt-2 mb-6 animate-in fade-in duration-700",
            centered && "text-center",
            className
        )}>
            <h1 className="text-[1.65rem] md:text-3xl font-bold text-gray-900 leading-tight px-4 md:px-0 break-normal overflow-hidden">
                <SplitText>{title}</SplitText>
            </h1>
            {subtitle && (
                <p className="text-gray-500 max-w-2xl mx-auto">
                    {subtitle}
                </p>
            )}
        </div>
    )
}

import React from "react"
import { Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface QuantitySelectorProps {
    quantity: number
    onIncrement: (e: React.MouseEvent) => void
    onDecrement: (e: React.MouseEvent) => void
    size?: "sm" | "md"
    primaryColor?: string
}

export function QuantitySelector({
    quantity,
    onIncrement,
    onDecrement,
    size = "sm",
    primaryColor = "#F205E2"
}: QuantitySelectorProps) {
    const isSmall = size === "sm"

    return (
        <div className={`flex items-center bg-gray-100 dark:bg-zinc-800 rounded-full p-0.5 gap-1.5 transition-all animate-in fade-in zoom-in duration-200`}>
            <Button
                type="button"
                onClick={onDecrement}
                size="icon"
                variant="ghost"
                className={`${isSmall ? "h-6 w-6" : "h-7 w-7"} rounded-full bg-white dark:bg-zinc-700 text-gray-600 dark:text-gray-300 shadow-sm hover:bg-gray-50 active:scale-90`}
            >
                <Minus className={`${isSmall ? "h-3 w-3" : "h-3.5 w-3.5"}`} />
            </Button>

            <span className={`${isSmall ? "text-xs" : "text-sm"} font-bold w-4 text-center text-gray-900 dark:text-gray-100`}>
                {quantity}
            </span>

            <Button
                type="button"
                onClick={onIncrement}
                size="icon"
                className={`${isSmall ? "h-6 w-6" : "h-7 w-7"} rounded-full shadow-sm active:scale-90 text-white`}
                style={{ backgroundColor: primaryColor }}
            >
                <Plus className={`${isSmall ? "h-3 w-3" : "h-3.5 w-3.5"}`} />
            </Button>
        </div>
    )
}

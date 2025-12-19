"use client"

import Lottie from "lottie-react"
import { cn } from "@/lib/utils"

interface LottieAnimationProps {
    animationData: any
    className?: string
    loop?: boolean
}

export function LottieAnimation({ animationData, className, loop = true }: LottieAnimationProps) {
    return (
        <div className={cn("w-full h-full", className)}>
            <Lottie animationData={animationData} loop={loop} />
        </div>
    )
}

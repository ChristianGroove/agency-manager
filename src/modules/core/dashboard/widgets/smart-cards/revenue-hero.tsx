
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { SplitText } from "@/components/ui/split-text"
import dynamic from "next/dynamic"

const Lottie = dynamic(() => import("lottie-react"), { ssr: false })

export interface RevenueHeroProps {
    title: string
    value: React.ReactNode
    unit?: string
    tips: string[]
    animationUrl?: string
    icon?: any
    className?: string
}

export function RevenueHero({
    title,
    value,
    unit,
    tips = [],
    animationUrl = '/animations/cartoon-man-working-at-desk-illustration-2025-10-20-04-30-47-utc.json',
    className
}: RevenueHeroProps) {
    const [currentTip, setCurrentTip] = useState(0)
    const [animationData, setAnimationData] = useState<any>(null)

    useEffect(() => {
        // Load animation
        fetch(animationUrl)
            .then(res => res.json())
            .then(data => setAnimationData(data))
            .catch(err => console.error("Error loading animation:", err))

        // Rotate tips
        if (tips.length > 0) {
            const interval = setInterval(() => {
                setCurrentTip((prev) => (prev + 1) % tips.length)
            }, 8000)
            return () => clearInterval(interval)
        }
    }, [animationUrl, tips.length])

    return (
        <Card className={`flex-1 min-h-[250px] bg-brand-dark border-0 shadow-lg text-white overflow-hidden relative rounded-[30px] flex flex-col ${className}`}>
            {/* Animated particles background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-brand-cyan/30 rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            bottom: '-10px',
                            animation: `floatUp ${5 + Math.random() * 5}s linear infinite`,
                            animationDelay: `${Math.random() * 5}s`,
                        }}
                    />
                ))}
            </div>

            {/* Lottie Animation */}
            {animationData && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[260px] opacity-40 z-10 pointer-events-none hidden md:block">
                    <Lottie animationData={animationData} loop={true} />
                </div>
            )}

            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-200">
                    <TrendingUp className="h-5 w-5 text-brand-cyan" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col z-20">
                <div className="flex-1 flex items-center">
                    <div className="text-4xl font-bold text-white flex items-baseline gap-2">
                        {value}
                        {unit && <span className="text-lg font-normal text-gray-400">{unit}</span>}
                    </div>
                </div>
                {tips.length > 0 && (
                    <div className="h-[60px] relative mt-2 max-w-md overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.p
                                key={currentTip}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="text-sm text-gray-400 absolute w-full"
                            >
                                <SplitText delay={0.3} duration={0.03}>
                                    {tips[currentTip]}
                                </SplitText>
                            </motion.p>
                        </AnimatePresence>
                    </div>
                )}
            </CardContent>

            <style jsx>{`
                @keyframes floatUp {
                    0% {
                        transform: translateY(0) scale(1);
                        opacity: 0;
                    }
                    10% {
                        opacity: 0.5;
                    }
                    50% {
                        opacity: 0.3;
                    }
                    100% {
                        transform: translateY(-400px) scale(0.5);
                        opacity: 0;
                    }
                }
            `}</style>
        </Card>
    )
}

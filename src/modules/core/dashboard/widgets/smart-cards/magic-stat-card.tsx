
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MagicCard } from "@/components/ui/magic-card"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

export interface MagicStatCardProps {
    title: string
    value: React.ReactNode
    icon: LucideIcon
    subtext?: React.ReactNode
    gradientColor?: string
    className?: string
}

export function MagicStatCard({
    title,
    value,
    icon: Icon,
    subtext,
    gradientColor = "#00E0FF",
    className
}: MagicStatCardProps) {
    return (
        <MagicCard gradientColor={gradientColor} className={className}>
            <Card className="bg-transparent border-gray-100 dark:border-white/10 dark:bg-white/5 shadow-sm hover:shadow-md transition-shadow rounded-[30px] h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {title}
                    </CardTitle>
                    <div className="p-2 bg-gray-50 dark:bg-white/10 rounded-lg">
                        <Icon className="h-4 w-4 text-gray-500 dark:text-gray-200" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
                    {subtext && (
                        <p className="text-xs text-muted-foreground mt-1">
                            {subtext}
                        </p>
                    )}
                </CardContent>
            </Card>
        </MagicCard>
    )
}


"use client"

import { Card } from "@/components/ui/card"
import AnimatedAvatarGroup from "@/components/ui/animated-avatar-group"

export interface SmartAlertItem {
    id: string
    name: string
    image?: string
    value?: number
}

export interface SmartAlertProps {
    title: string
    message: React.ReactNode
    itemsHeading?: string
    items: SmartAlertItem[]
}

export function SmartAlert({ title, message, itemsHeading, items }: SmartAlertProps) {
    if (items.length === 0) return null

    return (
        <Card className="bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 shadow-sm rounded-[30px] overflow-hidden">
            <div className="flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-6">
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        {title}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-xl">
                        {message}
                    </p>
                </div>

                {/* Animated Avatars */}
                <div className="flex flex-col items-center md:items-end gap-3">
                    {itemsHeading && (
                        <div className="text-sm font-medium text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider text-xs">
                            {itemsHeading}
                        </div>
                    )}
                    <AnimatedAvatarGroup
                        users={items}
                        limit={5}
                    />
                </div>
            </div>
        </Card>
    )
}

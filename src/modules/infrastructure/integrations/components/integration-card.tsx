"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Plus, Settings2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

export interface IntegrationProvider {
    key: string
    name: string
    description: string
    icon: any
    category: 'messaging' | 'crm' | 'finance' | 'tools'
    status: 'connected' | 'disconnected' | 'error'
    connectionCount?: number
    colorClass: string // Tailwind gradient classes
}

interface IntegrationCardProps {
    provider: IntegrationProvider
    onConnect?: () => void
    onManage?: () => void
}

export function IntegrationCard({ provider, onConnect, onManage }: IntegrationCardProps) {
    const isConnected = provider.status === 'connected'

    return (
        <Card className="flex flex-col h-full overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-lg transition-all duration-300 group">
            {/* Banner Area */}
            <div className={cn(
                "h-24 w-full relative",
                provider.colorClass
            )}>
                {/* Status Badge (Top Right) */}
                {isConnected && (
                    <div className="absolute top-3 right-3">
                        <Badge variant="secondary" className="bg-white/20 backdrop-blur-md text-white border-none shadow-sm hover:bg-white/30">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Active
                        </Badge>
                    </div>
                )}

                {/* Provider Icon (Overlapping) */}
                <div className="absolute -bottom-6 left-5 h-14 w-14 rounded-xl bg-white dark:bg-zinc-900 border-4 border-white dark:border-zinc-900 shadow-md flex items-center justify-center">
                    <provider.icon className="h-7 w-7 text-zinc-700 dark:text-zinc-200 group-hover:scale-110 transition-transform duration-300" />
                </div>
            </div>

            {/* Content Area */}
            <CardContent className="pt-10 pb-4 px-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                        {provider.name}
                    </CardTitle>
                    {/* Optional: Add small status dot if needed */}
                </div>

                <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed h-10">
                    {provider.description}
                </CardDescription>
            </CardContent>

            {/* Footer Action */}
            <CardFooter className="px-5 pb-5 pt-0">
                {isConnected ? (
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
                        onClick={onManage}
                    >
                        <Settings2 className="mr-2 h-3.5 w-3.5" />
                        Configure {provider.connectionCount && `(${provider.connectionCount})`}
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        className={cn(
                            "w-full text-white shadow-sm border-0 transition-opacity opacity-90 hover:opacity-100",
                            provider.colorClass // Use same gradient for button or just generic? User wanted branding.
                            // Actually, let's use a solid distinct color or the brand color for the button.
                            // But button with gradient might be too much. Let's stick to black/white or primary.
                        )}
                        style={{
                            background: 'var(--primary)' // Default to primary or keep black
                        }}
                        onClick={onConnect}
                    >
                        <Plus className="mr-2 h-3.5 w-3.5" />
                        Connect
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}

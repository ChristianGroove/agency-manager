"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    MessageSquare,
    Bot,
    Users,
    Database,
    FileText,
    Zap,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Sparkles
} from "lucide-react"
import { getOrgUsageStatus, UsageStatus } from "@/modules/core/billing/plan-actions"
import { cn } from "@/lib/utils"

interface UsageStatusCardProps {
    organizationId: string
    className?: string
    compact?: boolean
}

const ENGINE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
    whatsapp: { icon: MessageSquare, label: "WhatsApp", color: "text-green-500" },
    ai: { icon: Bot, label: "AI Tokens", color: "text-purple-500" },
    crm_contacts: { icon: Users, label: "Contactos CRM", color: "text-blue-500" },
    storage_gb: { icon: Database, label: "Almacenamiento", color: "text-orange-500" },
    invoices: { icon: FileText, label: "Facturas", color: "text-cyan-500" },
    automations: { icon: Zap, label: "Automations", color: "text-yellow-500" },
    users: { icon: Users, label: "Usuarios", color: "text-indigo-500" }
}

function formatNumber(num: number): string {
    if (num === -1 || num === Infinity) return "∞"
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
    return num.toString()
}

export function UsageStatusCard({ organizationId, className, compact = false }: UsageStatusCardProps) {
    const [usageData, setUsageData] = useState<UsageStatus[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchUsage() {
            try {
                const data = await getOrgUsageStatus(organizationId)
                setUsageData(data)
            } catch (error) {
                console.error("Error fetching usage:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchUsage()
    }, [organizationId])

    if (loading) {
        return (
            <Card className={cn("animate-pulse", className)}>
                <CardHeader className="pb-2">
                    <div className="h-5 w-32 bg-muted rounded" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-8 bg-muted rounded" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!usageData.length) {
        return null // No limits configured
    }

    // Filter to show only main engines in compact mode
    const displayData = compact
        ? usageData.filter(u => ['whatsapp', 'ai', 'crm_contacts'].includes(u.engine))
        : usageData

    // Check if any limits are critical (>80%)
    const hasCritical = usageData.some(u => !u.is_unlimited && u.percentage >= 80)
    const hasExceeded = usageData.some(u => u.is_exceeded)

    return (
        <Card className={cn(
            "relative overflow-hidden",
            hasExceeded && "border-destructive",
            hasCritical && !hasExceeded && "border-yellow-500/50",
            className
        )}>
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />

            <CardHeader className="pb-2 relative">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Uso del Plan</CardTitle>
                    </div>
                    {hasExceeded ? (
                        <Badge variant="destructive" className="animate-pulse">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Límite Excedido
                        </Badge>
                    ) : hasCritical ? (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Cerca del Límite
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="border-green-500 text-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Normal
                        </Badge>
                    )}
                </div>
                {!compact && (
                    <CardDescription>
                        Tu consumo actual vs límites del plan
                    </CardDescription>
                )}
            </CardHeader>

            <CardContent className="space-y-4 relative">
                {displayData.map((usage) => {
                    const config = ENGINE_CONFIG[usage.engine] || {
                        icon: Sparkles,
                        label: usage.engine,
                        color: "text-muted-foreground"
                    }
                    const Icon = config.icon

                    return (
                        <div key={usage.engine} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <Icon className={cn("h-4 w-4", config.color)} />
                                    <span className="font-medium">{config.label}</span>
                                </div>
                                <span className={cn(
                                    "text-xs font-mono",
                                    usage.is_exceeded && "text-destructive font-bold",
                                    usage.percentage >= 80 && !usage.is_exceeded && "text-yellow-600"
                                )}>
                                    {usage.is_unlimited ? (
                                        <span className="text-muted-foreground">Ilimitado</span>
                                    ) : (
                                        <>
                                            {formatNumber(usage.used)} / {formatNumber(usage.limit)}
                                        </>
                                    )}
                                </span>
                            </div>

                            {!usage.is_unlimited && (
                                <Progress
                                    value={usage.percentage}
                                    className={cn(
                                        "h-2",
                                        usage.is_exceeded && "[&>div]:bg-destructive",
                                        usage.percentage >= 80 && !usage.is_exceeded && "[&>div]:bg-yellow-500",
                                        usage.percentage < 80 && "[&>div]:bg-primary"
                                    )}
                                />
                            )}
                        </div>
                    )
                })}

                {hasExceeded && (
                    <Button
                        className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        size="sm"
                    >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Actualizar Plan
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}

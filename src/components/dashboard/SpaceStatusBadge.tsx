"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Clock, Crown, Package, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { differenceInDays, parseISO } from "date-fns"
import "./SpaceStatusBadge.css"

interface SpaceStatusBadgeProps {
    app: any
    subscription: any
    orgName: string
    brandColor?: string
}

function getContrastColor(hexColor: string) {
    if (!hexColor) return "rgba(0,0,0,0.7)"
    try {
        const hex = hexColor.replace("#", "")
        const r = parseInt(hex.substring(0, 2), 16)
        const g = parseInt(hex.substring(2, 2), 16)
        const b = parseInt(hex.substring(4, 2), 16)
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
        return (yiq >= 128) ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.95)"
    } catch (e) {
        return "rgba(0,0,0,0.7)"
    }
}

export function SpaceStatusBadge({ app, subscription, orgName, brandColor }: SpaceStatusBadgeProps) {
    const [isOpen, setIsOpen] = useState(false)

    // Fallback if app data is not yet loaded
    const displayApp = app || subscription?.saas_apps || { name: "Space Plan", color: "#F205E2" }

    const daysRemaining = subscription?.current_period_end
        ? differenceInDays(parseISO(subscription.current_period_end), new Date())
        : null

    const isBypass = !!subscription?.bypass_until && new Date(subscription.bypass_until) > new Date()
    const isActive = subscription?.status === 'active' || isBypass
    const planName = subscription?.saas_apps?.name || displayApp?.name || "Sin Plan"

    // Dynamic colors
    const finalBtnColor = brandColor || displayApp.color || "var(--brand-pink)"
    const contrastTextColor = getContrastColor(finalBtnColor)

    const drawerColor = daysRemaining !== null
        ? (daysRemaining > 7 ? "#d8ff7c" : daysRemaining > 2 ? "#fbff13" : "#ff4b4b")
        : "#fbff13"

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <div className="premium-badge-container" style={{
                    "--btn-color": finalBtnColor,
                    "--btn-text-color": contrastTextColor,
                    "--drawer-color": drawerColor
                } as React.CSSProperties}>
                    <div className="premium-badge-drawer top">expira en...</div>
                    <div className="premium-badge-drawer bottom">
                        {daysRemaining !== null ? `${daysRemaining} días` : 'N/A'}
                    </div>
                    <button className="premium-badge-btn">
                        <span className="premium-badge-text">
                            {displayApp.name || "Space Plan"}
                        </span>
                    </button>
                    {[1, 2, 3, 4].map((i) => (
                        <svg key={i} className="premium-badge-corner" xmlns="http://www.w3.org/2000/svg" viewBox="-1 1 32 32">
                            <path d="M32,32C14.355,32,0,17.645,0,0h.985c0,17.102,13.913,31.015,31.015,31.015v.985Z" />
                        </svg>
                    ))}
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                <div className="relative h-32 w-full overflow-hidden" style={{ backgroundColor: `${displayApp.color || '#6366f1'}20` }}>
                    <div className="absolute top-6 left-8 flex items-center gap-4">
                        <div className="p-3 bg-white rounded-2xl shadow-sm text-primary" style={{ color: displayApp.color || "#6366f1" }}>
                            <Package className="h-8 w-8" />
                        </div>
                        <div className="text-white drop-shadow-sm">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{displayApp.name}</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{orgName}</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 pt-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="border-none bg-slate-50 dark:bg-white/5">
                            <CardContent className="p-4 flex flex-col items-center gap-1">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <span className="text-xs text-slate-500 uppercase font-bold tracking-tighter">Estado</span>
                                <Badge variant="secondary" className={cn(
                                    "uppercase text-[10px]",
                                    isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                                )}>
                                    {isBypass ? 'PRO CORTESÍA' : (isActive ? 'ACTIVO' : 'SIN PLAN')}
                                </Badge>
                            </CardContent>
                        </Card>
                        <Card className="border-none bg-slate-50 dark:bg-white/5">
                            <CardContent className="p-4 flex flex-col items-center gap-1">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <span className="text-xs text-slate-500 uppercase font-bold tracking-tighter">Renovación</span>
                                <span className="text-sm font-bold">
                                    {daysRemaining !== null ? `${daysRemaining} días` : 'N/A'}
                                </span>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Beneficios Activos</h3>
                        <div className="grid gap-2">
                            {(displayApp.features || ["Gestión Completa", "Soporte Prioritario", "Multi-Agente"]).map((feature: string, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    {feature}
                                </div>
                            ))}
                        </div>
                    </div>

                    {isBypass && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-xs flex gap-3 items-start">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <p>Tu organización tiene un beneficio de **Cortesía Administrativa**. No se realizarán cobros automáticos hasta el vencimiento del bypass.</p>
                        </div>
                    )}

                    <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex gap-3">
                        <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setIsOpen(false)}>
                            Cerrar
                        </Button>
                        <Button className="flex-1 rounded-xl shadow-lg shadow-primary/20" style={{ backgroundColor: displayApp.color || "#6366f1" }}>
                            Gestionar Plan
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { CheckCircle2, Clock, Crown, Package, AlertCircle, FileText, Download, Receipt, History } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { format, differenceInDays, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { getSubscriptionHistory } from "@/modules/features/billing/billing-actions"
import { SubscriptionTicket } from "./SubscriptionTicket"
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
    const [history, setHistory] = useState<any[]>([])
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null)

    useEffect(() => {
        if (isOpen) {
            const fetchHistory = async () => {
                setIsLoadingHistory(true)
                try {
                    const data = await getSubscriptionHistory()
                    setHistory(data)
                } catch (error) {
                    // Silently fail or handle gracefully in UI
                } finally {
                    setIsLoadingHistory(false)
                }
            }
            fetchHistory()
        }
    }, [isOpen])

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
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden rounded-2xl border border-gray-200/50 dark:border-white/10 shadow-2xl bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-zinc-100">
                {selectedTransaction ? (
                    <SubscriptionTicket
                        transaction={selectedTransaction}
                        organization={{ name: orgName }}
                        onClose={() => setSelectedTransaction(null)}
                    />
                ) : (
                    <>
                        {/* Header */}
                        <div className="relative p-6 px-8 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5 flex items-center gap-4">
                            <div className="p-3 bg-brand-pink/10 rounded-xl text-brand-pink border border-brand-pink/20 shrink-0">
                                <Package className="h-6 w-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white truncate">{displayApp.name}</h2>
                                    {isActive && <Crown className="h-4 w-4 text-amber-400 fill-amber-400 shrink-0" />}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
                                    <span className="font-semibold text-brand-pink uppercase text-[10px] tracking-wider">{orgName}</span>
                                    <span>•</span>
                                    <span>PORTAL DE GESTIÓN</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <Tabs defaultValue="plan" className="w-full space-y-6">
                                <TabsList className="grid w-full grid-cols-2 h-auto gap-1.5 p-1.5 bg-gray-100/60 dark:bg-white/5 backdrop-blur-md border border-gray-200/50 dark:border-white/10 rounded-2xl">
                                    <TabsTrigger 
                                        value="plan" 
                                        className="flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-brand-pink dark:data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                    >
                                        <Package className="h-3.5 w-3.5" />
                                        Mi Plan
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="billing" 
                                        className="flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-brand-pink dark:data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                    >
                                        <History className="h-3.5 w-3.5" />
                                        Facturación
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="plan" className="space-y-6 mt-0">
                                    <div className="grid grid-cols-3 gap-4">
                                        <Card className="border-none bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-2xl p-4 flex flex-col items-center gap-2 text-center shadow-sm">
                                            <div className={cn(
                                                "p-2 rounded-xl",
                                                isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
                                            )}>
                                                <CheckCircle2 className="h-4 w-4" />
                                            </div>
                                            <span className="text-[10px] text-slate-400 dark:text-gray-400 uppercase font-extrabold tracking-wider">Estatus</span>
                                            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                                                {isBypass ? 'PRO CORTESÍA' : (isActive ? 'ACTIVO' : 'SUSPENDIDO')}
                                            </span>
                                        </Card>

                                        <Card className="border-none bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-2xl p-4 flex flex-col items-center gap-2 text-center shadow-sm">
                                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                <Clock className="h-4 w-4" />
                                            </div>
                                            <span className="text-[10px] text-slate-400 dark:text-gray-400 uppercase font-extrabold tracking-wider">Renovación</span>
                                            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                                                {daysRemaining !== null ? `${daysRemaining} días` : 'Ilimitado'}
                                            </span>
                                        </Card>

                                        <Card className="border-none bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-2xl p-4 flex flex-col items-center gap-2 text-center shadow-sm">
                                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                                <Receipt className="h-4 w-4" />
                                            </div>
                                            <span className="text-[10px] text-slate-400 dark:text-gray-400 uppercase font-extrabold tracking-wider">Valor Space</span>
                                            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                                                {subscription?.saas_apps?.price_monthly
                                                    ? (subscription.saas_apps.price_monthly / 100).toLocaleString('es-CO', {
                                                        style: 'currency',
                                                        currency: 'USD',
                                                        minimumFractionDigits: 0
                                                    }) + ' / mes'
                                                    : '$0 / mes'}
                                            </span>
                                        </Card>
                                    </div>

                                    <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-2xl p-5 space-y-3 shadow-sm">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400">Beneficios del Plan</h3>
                                        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                                            {(displayApp.features || ["Gestión Completa", "Soporte Prioritario", "Multi-Agente", "Personalización"]).map((feature: string, i: number) => (
                                                <div key={i} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-gray-200">
                                                    <div className="h-4 w-4 rounded-full bg-brand-pink/10 text-brand-pink flex items-center justify-center shrink-0">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                    </div>
                                                    <span className="truncate" title={feature}>{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {isBypass && (
                                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex gap-3 items-center">
                                            <div className="p-1.5 bg-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
                                                <AlertCircle className="h-4 w-4" />
                                            </div>
                                            <p className="font-semibold leading-relaxed">Tu organización tiene un beneficio de <strong>Cortesía</strong>. Sin cobros automáticos activos.</p>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="billing" className="space-y-4 mt-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400">Historial de Transacciones</h3>
                                        <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs font-semibold text-slate-600 dark:text-gray-300 border-gray-200 dark:border-white/10">
                                            <Download className="h-3.5 w-3.5 mr-1.5" />
                                            Exportar
                                        </Button>
                                    </div>

                                    <div className="rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden bg-white/40 dark:bg-white/5 backdrop-blur-xl">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-b border-gray-100 dark:border-white/5 hover:bg-transparent">
                                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400">Fecha</TableHead>
                                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400">Concepto</TableHead>
                                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400">Monto</TableHead>
                                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400">Estado</TableHead>
                                                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400">Recibo</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody className="text-xs">
                                                {isLoadingHistory ? (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center py-8 text-slate-400">Cargando transacciones...</TableCell>
                                                    </TableRow>
                                                ) : history.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center py-8 text-slate-400">No hay pagos registrados.</TableCell>
                                                    </TableRow>
                                                ) : history.map((row: any) => (
                                                    <TableRow key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5">
                                                        <TableCell className="font-medium text-slate-500 dark:text-gray-400">
                                                            {format(parseISO(row.created_at), 'dd MMM, yyyy', { locale: es })}
                                                        </TableCell>
                                                        <TableCell className="font-bold text-slate-900 dark:text-white">
                                                            {row.metadata?.concept || 'Suscripción'}
                                                        </TableCell>
                                                        <TableCell className="font-bold text-slate-900 dark:text-white">
                                                            {(row.amount_in_cents / 100).toLocaleString('es-CO', { style: 'currency', currency: 'USD' })}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none rounded-lg">
                                                                {row.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-xl text-slate-400 hover:text-brand-pink hover:bg-brand-pink/10"
                                                                onClick={() => setSelectedTransaction(row)}
                                                            >
                                                                <Receipt className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* Footer */}
                        <div className="p-4 px-8 border-t border-gray-100 dark:border-white/5 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between gap-3">
                            <Button
                                variant="ghost"
                                className="text-slate-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-xl h-10 px-4 text-xs font-semibold"
                                onClick={() => setIsOpen(false)}
                            >
                                Volver
                            </Button>
                            <Button
                                className="bg-brand-pink text-white hover:bg-brand-pink/90 font-semibold text-xs rounded-xl h-10 px-6 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isActive ? 'Mejorar Plan' : 'Reactivar Ahora'}
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}


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
            <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl bg-white dark:bg-slate-950">
                {selectedTransaction ? (
                    <SubscriptionTicket
                        transaction={selectedTransaction}
                        organization={{ name: orgName }}
                        onClose={() => setSelectedTransaction(null)}
                    />
                ) : (
                    <>
                        <div className="relative h-28 w-full overflow-hidden flex items-center px-8" style={{
                            background: `linear-gradient(135deg, ${finalBtnColor}20 0%, ${finalBtnColor}05 100%)`
                        }}>
                            {/* Decorative Background Element */}
                            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl opacity-20" style={{ backgroundColor: finalBtnColor }}></div>

                            <div className="relative flex items-center gap-5 z-10">
                                <div className="p-3 bg-white dark:bg-white/10 rounded-[1.2rem] shadow-xl text-primary border border-white/20" style={{ color: finalBtnColor }}>
                                    <Package className="h-8 w-8" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{displayApp.name}</h2>
                                        {isActive && <Crown className="h-5 w-5 text-amber-400 fill-amber-400" />}
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-2">
                                        <span className="p-1 bg-slate-100 dark:bg-white/5 rounded-md text-[10px] uppercase tracking-widest">{orgName}</span>
                                        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                        <span className="text-[10px] uppercase tracking-widest opacity-70">Portal de Gestión</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-1">
                            <Tabs defaultValue="plan" className="w-full">
                                <div className="px-6 pt-0">
                                    <TabsList className="grid w-full grid-cols-2 bg-slate-100/50 dark:bg-white/5 p-1 rounded-2xl h-10">
                                        <TabsTrigger value="plan" className="rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                                            <Package className="h-3.5 w-3.5 mr-2" />
                                            Mi Plan
                                        </TabsTrigger>
                                        <TabsTrigger value="billing" className="rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                                            <History className="h-3.5 w-3.5 mr-2" />
                                            Facturación
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="plan" className="p-4 pt-4 focus-visible:outline-none animate-in fade-in-50 slide-in-from-bottom-2">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-3">
                                            <Card className="border-none bg-slate-50 dark:bg-white/5 rounded-2xl overflow-hidden group hover:scale-[1.02] transition-transform shadow-sm">
                                                <CardContent className="p-4 flex flex-col items-center gap-1.5">
                                                    <div className={cn(
                                                        "p-1.5 rounded-xl mb-0.5",
                                                        isActive ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                                                    )}>
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest text-center">Estatus</span>
                                                    <span className="text-[10px] sm:text-[11px] font-black text-slate-800 dark:text-white uppercase text-center">
                                                        {isBypass ? 'PRO CORTESÍA' : (isActive ? 'ACTIVO' : 'SUSPENDIDO')}
                                                    </span>
                                                </CardContent>
                                            </Card>

                                            <Card className="border-none bg-slate-50 dark:bg-white/5 rounded-2xl overflow-hidden group hover:scale-[1.02] transition-transform shadow-sm">
                                                <CardContent className="p-4 flex flex-col items-center gap-1.5">
                                                    <div className="p-1.5 rounded-xl mb-0.5 bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                                                        <Clock className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest text-center">Renovación</span>
                                                    <span className="text-[10px] sm:text-[11px] font-black text-slate-800 dark:text-white uppercase text-center">
                                                        {daysRemaining !== null ? `${daysRemaining} días` : 'Ilimitado'}
                                                    </span>
                                                </CardContent>
                                            </Card>

                                            <Card className="border-none bg-slate-50 dark:bg-white/5 rounded-2xl overflow-hidden group hover:scale-[1.02] transition-transform shadow-sm">
                                                <CardContent className="p-4 flex flex-col items-center gap-1.5">
                                                    <div className="p-1.5 rounded-xl mb-0.5 bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                                                        <Receipt className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest text-center">Valor Space</span>
                                                    <span className="text-[10px] sm:text-[11px] font-black text-slate-800 dark:text-white uppercase text-center">
                                                        {subscription?.saas_apps?.price_monthly
                                                            ? (subscription.saas_apps.price_monthly / 100).toLocaleString('es-CO', {
                                                                style: 'currency',
                                                                currency: 'USD',
                                                                minimumFractionDigits: 0
                                                            }) + ' / mes'
                                                            : '$0 / mes'}
                                                    </span>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        <div className="bg-slate-50/50 dark:bg-white/5 p-4 rounded-3xl border border-slate-100 dark:border-white/5">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Beneficios del Plan</h3>
                                            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                                                {(displayApp.features || ["Gestión Completa", "Soporte Prioritario", "Multi-Agente", "Personalización"]).map((feature: string, i: number) => (
                                                    <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                                                        <div className="h-4 w-4 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                                                        </div>
                                                        <span className="truncate" title={feature}>{feature}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {isBypass && (
                                            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex gap-3 items-center">
                                                <div className="p-1.5 bg-amber-500 rounded-md text-white shrink-0">
                                                    <AlertCircle className="h-4 w-4" />
                                                </div>
                                                <p className="font-medium leading-relaxed">Tu organización tiene un beneficio de **Cortesía**. Sin cobros automáticos activos.</p>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="billing" className="p-6 pt-4 focus-visible:outline-none animate-in fade-in-50 slide-in-from-bottom-2">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Historial de Transacciones</h3>
                                            <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                                <Download className="h-3 w-3 mr-2" />
                                                Exportar
                                            </Button>
                                        </div>

                                        <div className="rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-slate-50 dark:bg-white/5">
                                                    <TableRow>
                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Fecha</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Concepto</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Monto</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Estado</TableHead>
                                                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest h-10">Recibo</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody className="text-xs">
                                                    {isLoadingHistory ? (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="text-center py-10 text-slate-400">Cargando transacciones...</TableCell>
                                                        </TableRow>
                                                    ) : history.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="text-center py-10 text-slate-400">No hay pagos registrados.</TableCell>
                                                        </TableRow>
                                                    ) : history.map((row: any) => (
                                                        <TableRow key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                            <TableCell className="font-medium text-slate-500">
                                                                {format(parseISO(row.created_at), 'dd MMM, yyyy', { locale: es })}
                                                            </TableCell>
                                                            <TableCell className="font-bold text-slate-700 dark:text-slate-200">
                                                                {row.metadata?.concept || 'Suscripción'}
                                                            </TableCell>
                                                            <TableCell className="font-bold">
                                                                {(row.amount_in_cents / 100).toLocaleString('es-CO', { style: 'currency', currency: 'USD' })}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="text-[10px] uppercase font-bold bg-emerald-50 text-emerald-600 border-emerald-100">
                                                                    {row.status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5"
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
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        <div className="p-4 pt-3 pb-4 border-t border-slate-50 dark:border-white/10 bg-slate-50/30 dark:bg-transparent flex gap-3">
                            <Button
                                variant="ghost"
                                className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px] sm:text-xs h-10 hover:bg-slate-100 dark:hover:bg-white/5"
                                onClick={() => setIsOpen(false)}
                            >
                                Volver
                            </Button>
                            <Button
                                className="flex-1 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs h-10 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-white"
                                style={{ backgroundColor: finalBtnColor }}
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

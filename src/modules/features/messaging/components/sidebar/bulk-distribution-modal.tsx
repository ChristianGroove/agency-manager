"use client"

import { useEffect, useState } from "react"
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter, 
    DialogDescription 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
    MessageCircle, 
    Instagram, 
    MessageSquare, 
    Check, 
    Loader2, 
    Users,
    AlertCircle,
    ArrowRight,
    Sparkles
} from "lucide-react"
import { getUnassignedDistributionStats, distributeUnassignedConversations } from "@/modules/features/messaging/assignment-actions"
import { toast } from "sonner"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { cn } from "@/modules/infrastructure/utils/utils"

interface BulkDistributionModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

interface ChannelStat {
    id: string
    name: string
    type: string
    count: number
}

export function BulkDistributionModal({ open, onOpenChange, onSuccess }: BulkDistributionModalProps) {
    const { t } = useTranslation()
    const [stats, setStats] = useState<ChannelStat[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null) // 'all' or connectionId
    const [error, setError] = useState<string | null>(null)

    const fetchStats = async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await getUnassignedDistributionStats()
            if (result.success) {
                setStats(result.data || [])
            } else {
                setError(result.error || "Error")
            }
        } catch (err) {
            setError("Error de conexión")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (open) {
            fetchStats()
        }
    }, [open])

    const handleDistribute = async (connectionIds?: string[]) => {
        const id = connectionIds ? connectionIds.join(',') : 'all'
        setActionLoading(id)
        
        const toastId = toast.loading(t('sidebar.distribution.distributing') || "Asignando...")
        
        try {
            const result = await distributeUnassignedConversations(connectionIds)
            const count = result.count ?? 0
            if (result.success) {
                toast.success(t('sidebar.distribution.success', { count }) || "Repartido con éxito", { id: toastId })
                onSuccess?.()
                if (!connectionIds || connectionIds.length === stats.length) {
                    onOpenChange(false)
                } else {
                    await fetchStats()
                }
            } else {
                toast.error(result.error || "Error", { id: toastId })
            }
        } catch (err) {
            toast.error("Error crítico", { id: toastId })
        } finally {
            setActionLoading(null)
        }
    }

    const getChannelIcon = (type: string) => {
        const t = type.toLowerCase()
        if (t.includes('whatsapp')) return <MessageCircle className="h-5 w-5 text-green-500" />
        if (t.includes('instagram')) return <Instagram className="h-5 w-5 text-pink-500" />
        if (t.includes('facebook') || t.includes('messenger')) return <MessageSquare className="h-5 w-5 text-blue-500" />
        return <MessageSquare className="h-5 w-5 text-zinc-400" />
    }

    const totalUnassigned = stats.reduce((acc, curr) => acc + curr.count, 0)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-white dark:bg-zinc-950 shadow-2xl rounded-[2.5rem]">
                <DialogHeader className="p-8 pb-0">
                    <div className="flex items-center justify-between mb-2">
                        <div className="space-y-1">
                            <DialogTitle className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-brand-pink/10 flex items-center justify-center">
                                    <Sparkles className="h-6 w-6 text-brand-pink fill-brand-pink" />
                                </div>
                                {t('sidebar.distribution.title')}
                            </DialogTitle>
                            <DialogDescription className="text-sm font-bold text-muted-foreground flex items-center gap-2 px-1">
                                <Users className="h-4 w-4" />
                                {t('sidebar.distribution.subtitle', { count: totalUnassigned })}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="px-8 py-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-brand-pink/20 blur-2xl rounded-full scale-150 animate-pulse" />
                                <Loader2 className="h-12 w-12 text-brand-pink animate-spin relative z-10" />
                            </div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">{t('sidebar.distribution.syncing')}</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                            <div className="h-16 w-16 rounded-full bg-red-50 dark:bg-red-900/10 flex items-center justify-center">
                                <AlertCircle className="h-8 w-8 text-red-500" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-lg font-black text-foreground">{error}</p>
                                <Button variant="link" size="sm" onClick={fetchStats} className="text-brand-pink font-black uppercase text-xs tracking-widest">Reintentar</Button>
                            </div>
                        </div>
                    ) : stats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                            <div className="h-24 w-24 rounded-[2rem] bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center relative rotate-3">
                                <div className="absolute inset-0 bg-green-500/10 blur-3xl rounded-full" />
                                <Check className="h-12 w-12 text-zinc-300 relative z-10" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xl font-black text-foreground">{t('sidebar.distribution.no_unassigned')}</p>
                                <p className="text-xs font-bold text-muted-foreground max-w-[14rem] mx-auto opacity-60">
                                    No hay acciones manuales pendientes por ahora.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <ScrollArea className="h-[340px] -mr-4 pr-4">
                            <div className="space-y-4 pb-6">
                                {stats.map((conn) => (
                                    <div 
                                        key={conn.id}
                                        className="group relative flex items-center gap-4 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900 p-4 rounded-[1.5rem] border border-transparent hover:border-brand-pink/20 transition-all hover:shadow-2xl hover:shadow-zinc-200/50 dark:hover:shadow-none"
                                    >
                                        <div className="h-14 w-14 rounded-2xl bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm border border-zinc-100 dark:border-zinc-700 transition-transform group-hover:scale-105">
                                            {getChannelIcon(conn.type)}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <p className="text-base font-black text-foreground truncate tracking-tight">{conn.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[11px] font-black uppercase text-zinc-400 dark:text-zinc-500">
                                                    {conn.type}
                                                </span>
                                                <div className="h-1 w-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                                                <span className="text-[11px] font-bold text-brand-pink">
                                                    {conn.count} {conn.count === 1 ? 'chat' : 'chats'}
                                                </span>
                                            </div>
                                        </div>

                                        <Button 
                                            size="sm"
                                            onClick={() => handleDistribute([conn.id])}
                                            disabled={!!actionLoading}
                                            className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-brand-pink hover:text-white hover:border-brand-pink transition-all shadow-sm"
                                        >
                                            {actionLoading === conn.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    {t('sidebar.distribution.distribute')}
                                                    <ArrowRight className="ml-2 h-3 w-3" />
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>

                <DialogFooter className="p-8 pt-0 flex flex-col sm:flex-row gap-3">
                    <Button 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)}
                        className="rounded-2xl h-14 text-muted-foreground font-black text-xs uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button 
                        onClick={() => handleDistribute(stats.map(s => s.id))}
                        disabled={loading || stats.length === 0 || !!actionLoading}
                        className={cn(
                            "rounded-2xl h-14 px-8 font-black text-xs uppercase tracking-widest flex-1",
                            "bg-brand-pink text-white shadow-2xl shadow-brand-pink/20 hover:shadow-brand-pink/40 hover:-translate-y-1 active:translate-y-0 transition-all",
                            "disabled:bg-zinc-100 disabled:text-zinc-400 disabled:shadow-none disabled:translate-y-0"
                        )}
                    >
                        {actionLoading === 'all' ? (
                            <Loader2 className="h-5 w-5 animate-spin mr-3" />
                        ) : (
                            <Sparkles className="h-5 w-5 mr-3 fill-white/20" />
                        )}
                        {t('sidebar.distribution.distribute_all')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

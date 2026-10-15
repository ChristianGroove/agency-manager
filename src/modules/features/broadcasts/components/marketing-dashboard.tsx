'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
    Plus,
    Megaphone,
    Mail,
    MessageSquare,
    Smartphone,
    CheckCheck,
    Send,
    Layers,
    ChevronDown,
    TrendingUp,
} from 'lucide-react'
import { SectionHeader } from '@/components/layout/section-header'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/modules/infrastructure/utils/utils'
import { CampaignsList } from './campaigns-list'
import { getMarketingStats } from '../marketing-actions'
import { getMarketingEmailSenders } from '../marketing-email-actions'
import { getMarketingSetup, MarketingChannel } from '../marketing-preflight-actions'


const CampaignWorkspaceSheet = dynamic(() =>
    import('./campaign-workspace-sheet').then(module => module.CampaignWorkspaceSheet)
)

type SelectedCampaign = { id: string; name: string; initialChannel?: 'whatsapp' | 'email' }

export function MarketingDashboard({ initialCampaign }: { initialCampaign?: SelectedCampaign } = {}) {
    const router = useRouter()
    const [selected, setSelected] = useState<SelectedCampaign | null>(initialCampaign || null)
    const [channels, setChannels] = useState<MarketingChannel[]>([])
    const [whatsappCount, setWhatsappCount] = useState<number | null>(null)
    const [emailCount, setEmailCount] = useState<number | null>(null)
    const [canManage, setCanManage] = useState(false)
    const [canExecute, setCanExecute] = useState(false)
    const [stats, setStats] = useState<Awaited<ReturnType<typeof getMarketingStats>> | null>(null)
    const [error, setError] = useState('')
    const [revision, setRevision] = useState(0)

    useEffect(() => {
        setSelected(initialCampaign || null)
    }, [initialCampaign?.id])

    useEffect(() => {
        let current = true
        void Promise.all([getMarketingStats(), getMarketingSetup(), getMarketingEmailSenders()]).then(
            ([counts, setup, smtp]) => {
                if (!current) return
                setError(('error' in counts ? counts.error : !setup.success ? setup.error : '') || '')
                setStats('error' in counts ? null : counts)
                if (setup.success) {
                    const waChannels = setup.channels || []
                    const mailChannels = smtp.success ? smtp.channels : []
                    setWhatsappCount(waChannels.length)
                    setEmailCount(mailChannels.length)
                    setChannels([...waChannels, ...mailChannels])
                    setCanManage(setup.canManage)
                    setCanExecute(setup.canExecute)
                } else {
                    setWhatsappCount(0)
                    setEmailCount(0)
                    setChannels([])
                    setCanManage(false)
                    setCanExecute(false)
                }
            }
        ).catch(() => {
            if (current) {
                setStats(null)
                setWhatsappCount(0)
                setEmailCount(0)
                setError('No se pudo cargar el resumen de Marketing.')
            }
        })
        return () => {
            current = false
        }
    }, [revision])

    const closeCampaign = useCallback((mutated = false) => {
        setSelected(null)
        if (mutated) {
            setRevision(value => value + 1)
        }
        if (initialCampaign) router.replace('/crm/marketing', { scroll: false })
    }, [initialCampaign, router])

    const handleOpen = useCallback((id: string, name: string) => {
        setSelected({ id, name })
    }, [])

    const handleChanged = useCallback(() => {
        setRevision(v => v + 1)
    }, [])

    return (
        <div className="space-y-5 pb-8">
            <SectionHeader
                title="Campañas masivas"
                subtitle="Tu centro de envíos: audiencias, mensajes y seguimiento."
                icon={Megaphone}
                action={
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                disabled={!canManage}
                                className="h-9 rounded-xl bg-brand-pink px-4 text-xs font-bold text-white shadow-sm hover:bg-brand-pink/90 gap-1.5 cursor-pointer transition-all"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Crear Campaña</span>
                                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-72 p-1.5 rounded-xl shadow-xl border border-border/80 bg-card"
                        >
                            <DropdownMenuItem
                                disabled={whatsappCount === 0}
                                onClick={() => {
                                    setSelected({ id: '', name: '', initialChannel: 'whatsapp' })
                                }}
                                className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-muted/60 data-[disabled]:opacity-60"
                            >
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                                    <Smartphone className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5 min-w-0">
                                    <span className="font-bold text-xs text-foreground block">
                                        Campaña de WhatsApp
                                    </span>
                                    <span className="text-[11px] text-muted-foreground block leading-tight">
                                        {whatsappCount === 0
                                            ? 'Conecta un número de WhatsApp en Canales para usar esta opción'
                                            : 'Plantillas oficiales de Meta con botones y multimedia interactiva'}
                                    </span>
                                </div>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                disabled={emailCount === 0}
                                onClick={() => {
                                    setSelected({ id: '', name: '', initialChannel: 'email' })
                                }}
                                className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-muted/60 data-[disabled]:opacity-60"
                            >
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5 min-w-0">
                                    <span className="font-bold text-xs text-foreground block">
                                        Campaña de Email
                                    </span>
                                    <span className="text-[11px] text-muted-foreground block leading-tight">
                                        {emailCount === 0
                                            ? 'Verifica un SMTP corporativo en Motor de correos para usar esta opción'
                                            : 'Correos masivos vía SMTP corporativo con enlace de baja'}
                                    </span>
                                </div>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                disabled
                                className="flex items-start gap-3 p-2.5 rounded-lg opacity-60 cursor-not-allowed"
                            >
                                <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                                    <MessageSquare className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5 min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-xs text-foreground block">
                                            Campaña de SMS
                                        </span>
                                        <span className="rounded-full bg-muted-foreground/15 px-1.5 py-0.2 text-[9px] font-semibold text-muted-foreground shrink-0">
                                            Próximamente
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground block leading-tight">
                                        Mensajería directa SMS
                                    </span>
                                </div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                }
            />

            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}{' '}
                    <button className="underline" onClick={() => setRevision(v => v + 1)}>
                        Reintentar
                    </button>
                </p>
            )}



            {/* Hero KPI Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Campañas */}
                <div className="glass-card rounded-2xl p-4 border border-border/60 bg-card/60 backdrop-blur-md shadow-xs group hover:-translate-y-0.5 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-2xl font-bold tracking-tight text-foreground">
                                {stats?.totalCampaigns ?? '—'}
                            </p>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                                Campañas
                            </p>
                            <p className="text-[11px] text-muted-foreground/75 truncate mt-0.5">
                                Total registradas
                            </p>
                        </div>
                    </div>
                </div>

                {/* Card 2: Mensajes aceptados */}
                <div className="glass-card rounded-2xl p-4 border border-border/60 bg-card/60 backdrop-blur-md shadow-xs group hover:-translate-y-0.5 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                            <Send className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-2xl font-bold tracking-tight text-foreground">
                                {stats?.totalMessages ?? '—'}
                            </p>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                                Mensajes aceptados
                            </p>
                            <p className="text-[11px] text-muted-foreground/75 truncate mt-0.5">
                                WhatsApp y Correo
                            </p>
                        </div>
                    </div>
                </div>

                {/* Card 3: Mensajes entregados */}
                <div className="glass-card rounded-2xl p-4 border border-border/60 bg-card/60 backdrop-blur-md shadow-xs group hover:-translate-y-0.5 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                            <CheckCheck className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-2xl font-bold tracking-tight text-foreground">
                                {stats?.totalDelivered ?? '—'}
                            </p>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                                Entregados
                            </p>
                            <p className="text-[11px] text-muted-foreground/75 truncate mt-0.5">
                                Confirmados por red
                            </p>
                        </div>
                    </div>
                </div>

                {/* Card 4: Tasa de entrega */}
                <div className="glass-card rounded-2xl p-4 border border-border/60 bg-card/60 backdrop-blur-md shadow-xs group hover:-translate-y-0.5 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                                <p className="text-2xl font-bold tracking-tight text-foreground">
                                    {stats ? `${stats.deliveryRate}%` : '—'}
                                </p>
                                {stats && (
                                    <span
                                        className={cn(
                                            "text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0",
                                            stats.deliveryRate >= 80
                                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                                : stats.deliveryRate > 0
                                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                                : "bg-muted text-muted-foreground"
                                        )}
                                    >
                                        {stats.deliveryRate >= 80 ? 'Óptima' : stats.deliveryRate > 0 ? 'En curso' : 'Sin envíos'}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                                Tasa de entrega
                            </p>
                            <p className="text-[11px] text-muted-foreground/75 truncate mt-0.5">
                                Efectividad global
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <CampaignsList
                refresh={revision}
                channels={channels}
                canManage={canManage}
                canExecute={canExecute}
                onChanged={handleChanged}
                onOpen={handleOpen}
                suspended={!!selected}
            />

            {selected && (
                <CampaignWorkspaceSheet
                    key={selected.id || `new-${selected.initialChannel || 'whatsapp'}`}
                    campaign={selected}
                    channels={channels}
                    canManage={canManage}
                    canExecute={canExecute}
                    onClose={closeCampaign}
                />
            )}
        </div>
    )
}


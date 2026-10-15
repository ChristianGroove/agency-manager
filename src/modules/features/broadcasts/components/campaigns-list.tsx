'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
    Search,
    RefreshCw,
    ChevronRight,
    Smartphone,
    Mail,
    X,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/modules/infrastructure/utils/utils'
import { getMarketingCampaignPage } from '../marketing-workspace-actions'
import { CampaignPage, campaignStates, campaignStateLabels, campaignProgress } from '../marketing-workspace'
import { deleteCampaign, updateCampaign } from '../marketing-actions'
import type { MarketingChannel } from '../marketing-preflight-actions'

const defaults = {
    search: '',
    status: 'all' as 'all' | typeof campaignStates[number],
    channel: null as string | null
}

const formatDate = (v: string | null) =>
    v ? new Date(v).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Al confirmar, dentro del horario'

function getStatusBadge(status: string) {
    switch (status) {
        case 'active':
            return (
                <Badge variant="outline" className="border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    Activa
                </Badge>
            )
        case 'paused':
            return (
                <Badge variant="outline" className="border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-semibold gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    Pausada
                </Badge>
            )
        case 'completed':
            return (
                <Badge variant="outline" className="border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[11px] font-semibold gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    Completada
                </Badge>
            )
        case 'archived':
            return (
                <Badge variant="outline" className="border-border/60 bg-muted/40 text-muted-foreground text-[11px] font-medium">
                    Archivada
                </Badge>
            )
        default:
            return (
                <Badge variant="outline" className="border-border/60 bg-muted/30 text-muted-foreground text-[11px] font-medium">
                    Borrador
                </Badge>
            )
    }
}

export const CampaignsList = memo(function CampaignsList({
    channels = [],
    canManage = false,
    canExecute = false,
    onChanged,
    onOpen,
    suspended = false,
    refresh = 0
}: {
    channels?: MarketingChannel[];
    canManage?: boolean;
    canExecute?: boolean;
    onChanged?: () => void;
    onOpen?: (id: string, name: string) => void;
    suspended?: boolean;
    refresh?: number;
}) {
    const [draft, setDraft] = useState(defaults)
    const [filters, setFilters] = useState(defaults)
    const [cursor, setCursor] = useState<CampaignPage['next']>(null)
    const [previous, setPrevious] = useState<Array<CampaignPage['next']>>([])
    const [page, setPage] = useState<CampaignPage | null>(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [changedAt, setChangedAt] = useState<string | null>(null)
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
    const epoch = useRef(0)

    const load = useCallback(async (background = false) => {
        const request = ++epoch.current
        if (!background) setLoading(true)
        try {
            const r = await getMarketingCampaignPage({ ...filters, cursor })
            if (request !== epoch.current) return
            if (!r.success) {
                setError(r.error)
                return
            }
            setPage(r.page)
            setError('')
            setChangedAt(new Date().toLocaleTimeString())
        } catch {
            if (request === epoch.current) {
                setError('No se pudo actualizar la lista. Los datos mostrados pueden estar desactualizados.')
            }
        } finally {
            if (request === epoch.current) setLoading(false)
        }
    }, [filters, cursor])

    useEffect(() => {
        void load(!!page)
        return () => {
            epoch.current++
        }
    }, [load, refresh])

    const running = page?.rows.some(r => r.status === 'active') === true
    useEffect(() => {
        if (!running || busy || suspended) return
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') void load(true)
        }, 20000)
        return () => clearInterval(timer)
    }, [running, busy, load, suspended])

    async function remove(id: string, isDraft: boolean) {
        if (!window.confirm(isDraft ? '¿Eliminar este borrador y su diseño?' : '¿Archivar esta campaña? Su historial se conservará.')) return
        setBusy(true)
        try {
            const r = isDraft ? await deleteCampaign(id) : await updateCampaign(id, { status: 'archived' })
            if (!r.success) {
                setError(r.error || 'No se pudo completar la acción.')
                return
            }
            await load()
            onChanged?.()
        } catch {
            setError('No se pudo confirmar la acción. Actualiza antes de reintentar.')
        } finally {
            setBusy(false)
        }
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setDraft(d => ({ ...d, search: val }))
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        searchTimeout.current = setTimeout(() => {
            setCursor(null)
            setPrevious([])
            setFilters(f => ({ ...f, search: val }))
        }, 300)
    }

    const handleStatusChange = (status: string) => {
        const s = status as typeof draft.status
        setDraft(d => ({ ...d, status: s }))
        setCursor(null)
        setPrevious([])
        setFilters(f => ({ ...f, status: s }))
    }

    const handleChannelChange = (channel: string) => {
        const c = channel === 'all' ? null : channel.replace(/^smtp:/, '')
        setDraft(d => ({ ...d, channel: c }))
        setCursor(null)
        setPrevious([])
        setFilters(f => ({ ...f, channel: c }))
    }

    const applyFilter = (e?: React.FormEvent) => {
        e?.preventDefault()
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        setCursor(null)
        setPrevious([])
        setFilters({ ...draft })
    }

    return (
        <section className="space-y-3.5 rounded-2xl border border-border/60 bg-card p-4 shadow-xs transition-all">
            {/* Combobox Search + Direct Filter Bar */}
            <form
                className="flex flex-wrap items-center gap-2.5"
                onSubmit={applyFilter}
            >
                <div className="relative flex-1 min-w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Buscar campaña por nombre…"
                        className="h-9 rounded-xl bg-background pl-9 pr-8 text-xs font-medium"
                        id="campaign-search"
                        aria-label="Buscar campaña"
                        maxLength={100}
                        value={draft.search}
                        onChange={handleSearchChange}
                    />
                    {draft.search && (
                        <button
                            type="button"
                            onClick={() => {
                                setDraft(d => ({ ...d, search: '' }))
                                setCursor(null)
                                setPrevious([])
                                setFilters(f => ({ ...f, search: '' }))
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label="Limpiar búsqueda"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                <div className="w-40">
                    <Select
                        value={draft.status}
                        onValueChange={handleStatusChange}
                    >
                        <SelectTrigger aria-label="Estado de campaña" className="h-9 w-full rounded-xl bg-background text-xs font-medium">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            {campaignStates.map(s => (
                                <SelectItem key={s} value={s}>
                                    {campaignStateLabels[s]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-52">
                    <Select
                        value={draft.channel || 'all'}
                        onValueChange={handleChannelChange}
                    >
                        <SelectTrigger aria-label="Filtrar por emisor" className="h-9 w-full rounded-xl bg-background text-xs font-medium">
                            <SelectValue placeholder="Canal emisor" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los canales</SelectItem>
                            {channels.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.id.startsWith('smtp:') ? 'Email · ' : 'WhatsApp · '}{c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Hidden submit trigger for test suites */}
                <button type="submit" className="sr-only">
                    Aplicar
                </button>

                <Button
                    type="button"
                    aria-label="Actualizar campañas"
                    title="Actualizar campañas"
                    size="icon"
                    className="h-9 w-9 rounded-xl shrink-0"
                    variant="outline"
                    disabled={loading || busy}
                    onClick={() => void load()}
                >
                    <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                </Button>
            </form>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

            {/* Clean Campaigns Table */}
            <div aria-busy={loading} className="overflow-x-auto rounded-xl border border-border/60 bg-background shadow-xs">
                <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-left text-[11px] text-muted-foreground">
                        <tr>
                            {['Campaña', 'Estado', 'Emisor / inicio', 'Destinatarios', 'Mensajes', 'Acciones'].map(l => (
                                <th key={l} className="p-3 font-semibold">{l}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {page?.rows.map(r => (
                            <tr key={r.id} className="border-t border-border/50 align-middle transition-colors hover:bg-muted/30">
                                <td className="p-3">
                                    <div className="flex items-center gap-2.5">
                                        <span
                                            className={cn(
                                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                                                r.channelType === 'email'
                                                    ? "border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                                    : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                            )}
                                        >
                                            {r.channelType === 'email' ? <Mail className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                                        </span>
                                        <div className="min-w-0">
                                            {onOpen ? (
                                                <button
                                                    className="text-left text-xs font-bold text-foreground hover:text-primary focus-visible:underline transition-colors block truncate max-w-xs"
                                                    onClick={() => onOpen(r.id, r.name)}
                                                >
                                                    {r.name}
                                                </button>
                                            ) : (
                                                <Link
                                                    className="text-xs font-bold text-foreground hover:text-primary transition-colors block truncate max-w-xs"
                                                    href={`/crm/marketing/campaigns/${r.id}`}
                                                >
                                                    {r.name}
                                                </Link>
                                            )}
                                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                                                {r.channelType === 'email' ? 'Email corporativo' : 'WhatsApp Cloud'}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3">
                                    {getStatusBadge(r.status)}
                                </td>
                                <td className="p-3">
                                    <p className="text-xs font-medium text-foreground">{r.channelName || 'Sin emisor'}</p>
                                    <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDate(r.scheduledFor)}</p>
                                </td>
                                <td className="min-w-32 p-3">
                                    <p className="text-xs font-medium text-foreground">{r.recipients} inscritos</p>
                                    {r.recipients > 0 && (
                                        <>
                                            <Progress value={campaignProgress(r)} className="my-1.5 h-1" />
                                            <p className="text-[10px] text-muted-foreground">
                                                {campaignProgress(r)}% procesados · {r.failed} fallidos · {r.cancelled} cancelados
                                            </p>
                                        </>
                                    )}
                                </td>
                                <td className="p-3">
                                    <p className="whitespace-nowrap text-xs font-medium text-foreground">
                                        {r.accepted} aceptados{r.channelType !== 'email' && ` · ${r.delivered} entregados`}
                                    </p>
                                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                                        {r.channelType !== 'email' && `${r.read} leídos · `}
                                        {r.deliveryFailed} fallidos · {r.unknown} sin confirmar
                                    </p>
                                </td>
                                <td className="p-3">
                                    <div className="flex items-center gap-1">
                                        {onOpen ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
                                                onClick={() => onOpen(r.id, r.name)}
                                            >
                                                Abrir
                                                <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                asChild
                                                className="h-8 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
                                            >
                                                <Link href={`/crm/marketing/campaigns/${r.id}`}>
                                                    Abrir
                                                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                                </Link>
                                            </Button>
                                        )}
                                        {r.status === 'active' && canExecute && (
                                            <span className="px-2 text-[10px] text-muted-foreground" title="Abre la campaña y pausa los envíos para poder archivarla">
                                                Pausa para archivar
                                            </span>
                                        )}
                                        {(r.status === 'draft' ? canManage : canExecute && r.status !== 'archived' && r.status !== 'active') && (
                                            <Button
                                                variant="ghost"
                                                className="h-8 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                                                size="sm"
                                                disabled={busy || loading}
                                                onClick={() => void remove(r.id, r.status === 'draft')}
                                            >
                                                {r.status === 'draft' ? 'Eliminar' : 'Archivar'}
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!page?.rows.length && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                    {loading ? 'Cargando campañas…' : error ? 'No se pudo consultar esta página.' : 'No hay campañas para estos filtros.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination & Status Footer */}
            <div className="flex flex-wrap justify-between items-center gap-3 pt-1 text-xs text-muted-foreground">
                <p>
                    {changedAt ? `Actualizado: ${changedAt}. ` : ''}
                    La entrega incluye mensajes leídos. Procesado no equivale a entregado.
                </p>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl h-8 text-xs font-medium"
                        disabled={!previous.length || loading || busy}
                        onClick={() => {
                            setCursor(previous[previous.length - 1])
                            setPrevious(previous.slice(0, -1))
                        }}
                    >
                        Anterior
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl h-8 text-xs font-medium"
                        disabled={!page?.next || loading || busy}
                        onClick={() => {
                            if (page?.next) {
                                setPrevious([...previous, cursor])
                                setCursor(page.next)
                            }
                        }}
                    >
                        Siguiente
                    </Button>
                </div>
            </div>
        </section>
    )
})

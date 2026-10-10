'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getMarketingCampaignPage } from '../marketing-workspace-actions'
import { CampaignPage, campaignStates, campaignStateLabels, campaignProgress } from '../marketing-workspace'
import { deleteCampaign, updateCampaign } from '../marketing-actions'
import type { MarketingChannel } from '../marketing-preflight-actions'
const defaults = { search: '', status: 'all' as 'all' | typeof campaignStates[number], channel: null as string | null }
const date = (v: string | null) => v ? new Date(v).toLocaleString() : 'Al confirmar, dentro del horario'
export function CampaignsList({ channels = [], canManage = false, canExecute = false, onChanged }: { channels?: MarketingChannel[]; canManage?: boolean; canExecute?: boolean; onChanged?: () => void }) {
    const [draft, setDraft] = useState(defaults), [filters, setFilters] = useState(defaults)
    const [cursor, setCursor] = useState<CampaignPage['next']>(null), [previous, setPrevious] = useState<Array<CampaignPage['next']>>([])
    const [page, setPage] = useState<CampaignPage | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false)
    const [changedAt, setChangedAt] = useState<string | null>(null); const epoch = useRef(0)
    const load = useCallback(async (background = false) => {
        const request = ++epoch.current; if (!background) setLoading(true)
        try { const r = await getMarketingCampaignPage({ ...filters, cursor }); if (request !== epoch.current) return; if (!r.success) { setError(r.error); return } setPage(r.page); setError(''); setChangedAt(new Date().toLocaleTimeString()) }
        catch { if (request === epoch.current) setError('No se pudo actualizar la lista. Los datos mostrados pueden estar desactualizados.') }
        finally { if (request === epoch.current) setLoading(false) }
    }, [filters, cursor])
    useEffect(() => { setPage(null); void load(); return () => { epoch.current++ } }, [load])
    const running = page?.rows.some(r => r.status === 'active') === true
    useEffect(() => { if (!running || busy) return; const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(true) }, 20000); return () => clearInterval(timer) }, [running, busy, load])
    async function remove(id: string, isDraft: boolean) {
        if (!window.confirm(isDraft ? '¿Eliminar este borrador y su diseño?' : '¿Archivar esta campaña? Su historial se conservará.')) return
        setBusy(true)
        try { const r = isDraft ? await deleteCampaign(id) : await updateCampaign(id, { status: 'archived' }); if (!r.success) { setError(r.error || 'No se pudo completar la acción.'); return } await load(); onChanged?.() }
        catch { setError('No se pudo confirmar la acción. Actualiza antes de reintentar.') }
        finally { setBusy(false) }
    }
    return <section className="space-y-3">
        <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); setCursor(null); setPrevious([]); setFilters({ ...draft }) }}>
            <div className="flex-1 min-w-48"><Label htmlFor="campaign-search">Buscar campaña</Label><Input id="campaign-search" maxLength={100} value={draft.search} onChange={e => setDraft({ ...draft, search: e.target.value })} /></div>
            <div><Label>Estado</Label><Select value={draft.status} onValueChange={status => setDraft({ ...draft, status: status as typeof draft.status })}><SelectTrigger aria-label="Estado de campaña" className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{campaignStates.map(s => <SelectItem key={s} value={s}>{campaignStateLabels[s]}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Número emisor</Label><Select value={draft.channel || 'all'} onValueChange={channel => setDraft({ ...draft, channel: channel === 'all' ? null : channel })}><SelectTrigger aria-label="Filtrar por emisor" className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{channels.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <Button disabled={loading || busy}>Aplicar</Button><Button type="button" variant="outline" disabled={loading || busy} onClick={() => void load()}>Actualizar</Button>
        </form>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div aria-busy={loading} className="overflow-x-auto rounded-xl border bg-white dark:bg-zinc-900"><table className="w-full text-sm"><thead className="bg-muted/40 text-left"><tr>{['Campaña', 'Estado', 'Emisor / inicio', 'Destinatarios', 'Mensajes', 'Acciones'].map(l => <th key={l} className="p-3 font-medium">{l}</th>)}</tr></thead><tbody>
            {page?.rows.map(r => <tr key={r.id} className="border-t align-top"><td className="p-3"><Link className="font-medium hover:underline" href={`/crm/marketing/campaigns/${r.id}`}>{r.name}</Link></td><td className="p-3"><Badge variant={r.status === 'active' ? 'default' : 'secondary'}>{campaignStateLabels[r.status] || 'Estado desconocido'}</Badge></td><td className="p-3"><p>{r.channelName || 'Sin emisor'}</p><p className="text-xs text-muted-foreground mt-1">{date(r.scheduledFor)}</p></td><td className="p-3"><p>{r.recipients} inscritos</p>{r.recipients > 0 && <p className="text-xs text-muted-foreground">{campaignProgress(r)}% procesados · {r.failed} fallidos · {r.cancelled} cancelados</p>}</td><td className="p-3"><p>{r.accepted} aceptados · {r.delivered} entregados</p><p className="text-xs text-muted-foreground">{r.read} leídos · {r.deliveryFailed} fallidos · {r.unknown} sin confirmar</p></td><td className="p-3"><div className="flex gap-2"><Button variant="outline" size="sm" asChild><Link href={`/crm/marketing/campaigns/${r.id}`}>Abrir</Link></Button>{(r.status === 'draft' ? canManage : canExecute && r.status !== 'archived') && <Button variant="ghost" size="sm" disabled={busy || loading} onClick={() => void remove(r.id, r.status === 'draft')}>{r.status === 'draft' ? 'Eliminar' : 'Archivar'}</Button>}</div></td></tr>)}
            {!page?.rows.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{loading ? 'Cargando campañas…' : error ? 'No se pudo consultar esta página.' : 'No hay campañas para estos filtros.'}</td></tr>}
        </tbody></table></div>
        <div className="flex flex-wrap justify-between items-center gap-2 text-xs text-muted-foreground"><p>{changedAt ? `Actualizado: ${changedAt}. ` : ''}La entrega incluye mensajes leídos. Procesado no equivale a entregado.</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={!previous.length || loading || busy} onClick={() => { setCursor(previous[previous.length - 1]); setPrevious(previous.slice(0, -1)) }}>Anterior</Button><Button size="sm" variant="outline" disabled={!page?.next || loading || busy} onClick={() => { if (page?.next) { setPrevious([...previous, cursor]); setCursor(page.next) } }}>Siguiente</Button></div></div>
    </section>
}

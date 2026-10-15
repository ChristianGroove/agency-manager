'use client'

import { useMarketingApi } from '../marketing-client-api'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { audienceFiltersSchema } from '../marketing-contracts'
import type { AudienceReadiness } from '../marketing-preflight-actions'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RefreshCw, Users } from 'lucide-react'
import dynamic from 'next/dynamic'
import { audienceRangeIssues } from '../marketing-contracts'
import { displayLocalDateTime } from '../marketing-editor-utils'

const CampaignAssigneeFilter = dynamic(() => import('./campaign-assignee-filter').then(module => module.CampaignAssigneeFilter))
const dateFilters = [
    ['created_after', 'Creado desde'], ['created_before', 'Creado hasta'],
    ['last_activity_after', 'Última actividad desde'], ['last_activity_before', 'Última actividad hasta'],
] as const

export type RecipientFilters = z.infer<typeof audienceFiltersSchema>
export function CampaignRecipientFilters({ value, onChange, disabled, refresh = 0, channel = 'whatsapp', onReadinessChange }: { channel?: 'whatsapp' | 'email'; onReadinessChange?: (value: AudienceReadiness | null) => void;
    value: RecipientFilters; onChange: (filters: RecipientFilters) => void; disabled: boolean; refresh?: number;
}) {
    const { getAudienceReadiness } = useMarketingApi()
    const [readiness, setReadiness] = useState<AudienceReadiness | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true)
    const [revision, setRevision] = useState(0)
    const [advanced, setAdvanced] = useState(false)
    const [custom, setCustom] = useState(false)
    const hasCustom = Object.entries(value).some(([key, field]) => !['has_phone', 'has_email', 'list_id'].includes(key) && (Array.isArray(field) ? field.length > 0 : field !== undefined && field !== '' && field !== false))
    const filterKey = JSON.stringify(value)
    useEffect(() => {
        let current = true
        setLoading(true); setError(''); onReadinessChange?.(null)
        const rangeIssues = audienceRangeIssues(value)
        if (rangeIssues.length) { setLoading(false); setError(rangeIssues.join(' ')); return }
        const timer = setTimeout(() => {
            void getAudienceReadiness({ ...value, tags: value.tags?.filter(tag => tag.trim()) }, channel).then(result => {
                if (!current) return
                if (result.success) { setReadiness(result.audience); onReadinessChange?.(result.audience) } else setError(result.error)
                setLoading(false)
            }).catch(() => { if (current) { setError('No se pudo revisar la audiencia.'); setLoading(false) } })
        }, 300)
        return () => { current = false; clearTimeout(timer) }
    }, [filterKey, revision, refresh, channel, onReadinessChange])
    return <div className="space-y-3">
        <div className="rounded-xl bg-primary/[0.04] p-3 text-xs" aria-live="polite">
            <div className="flex items-center gap-3"><Users className="h-4 w-4 shrink-0 text-primary" /><div className="min-w-0 flex-1">{loading ? <p>Revisando destinatarios…</p> : error ? <p role="alert" className="text-destructive">{error}</p> : readiness && <><p className="text-lg font-semibold tabular-nums">{readiness.eligible}<span className="ml-1.5 text-xs font-normal text-muted-foreground">destinatarios</span></p><p className="mt-0.5 text-[11px] text-muted-foreground">{readiness.eligible ? 'Únicos, con autorización vigente' : 'No hay contactos autorizados en esta selección.'}</p></>}</div><Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Actualizar cantidad" title="Actualizar cantidad" disabled={loading} onClick={() => setRevision(value => value + 1)}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></Button></div>
            {!loading && !error && readiness && (readiness.missingConsent + readiness.optedOut + readiness.invalidFormat + readiness.duplicates > 0) && <details className="mt-3 border-t border-primary/10 pt-2 text-[11px] text-muted-foreground"><summary className="cursor-pointer">Ver contactos excluidos</summary><p className="mt-1 leading-relaxed">De {readiness.matched} seleccionados: {readiness.missingConsent} sin autorización, {readiness.optedOut} bajas, {readiness.invalidFormat} {channel === 'email' ? 'emails inválidos' : 'teléfonos inválidos'} y {readiness.duplicates} duplicados.</p></details>}
        </div>
        <details open={custom} onToggle={event => setCustom(event.currentTarget.open)} className="rounded-xl border border-border/60 p-3">
        <summary className="cursor-pointer text-xs font-medium">Filtrar contactos{hasCustom ? ' · filtros aplicados' : ''}</summary>
        <p className="py-3 text-xs text-muted-foreground">Vacío incluye toda la selección. Los filtros no modifican el CRM.</p>
        <div className="grid md:grid-cols-2 gap-3"><div><Label htmlFor="recipient-status">Estado del contacto · vacío para todos</Label><Input className="h-9 rounded-xl bg-background text-xs" id="recipient-status" maxLength={100} disabled={disabled} value={value.status || ''} onChange={event => onChange({ ...value, status: event.target.value })} /></div>
            <div><Label htmlFor="recipient-tags">Etiquetas · separadas por comas</Label><Input className="h-9 rounded-xl bg-background text-xs" id="recipient-tags" disabled={disabled} value={(value.tags || []).join(', ')} onChange={event => onChange({ ...value, tags: event.target.value ? event.target.value.split(',').map(tag => tag.trim()) : [] })} /></div></div>
        <p className="py-2 text-[11px] text-muted-foreground">Estado actual del CRM. Las etiquetas incluyen contactos con al menos una coincidencia.</p>
        <details open={advanced} onToggle={event => setAdvanced(event.currentTarget.open)} className="rounded-xl border border-border/60 bg-muted/20 p-3"><summary className="cursor-pointer text-xs font-medium">Filtros avanzados</summary><div className="grid md:grid-cols-2 gap-3 pt-3">
            <div><Label htmlFor="recipient-source">Origen · vacío para todos</Label><Input className="h-9 rounded-xl bg-background text-xs" id="recipient-source" maxLength={100} disabled={disabled} value={value.source || ''} onChange={event => onChange({ ...value, source: event.target.value })} /></div>
            <div><Label htmlFor="recipient-score-min">Puntaje mínimo</Label><Input className="h-9 rounded-xl bg-background text-xs" id="recipient-score-min" type="number" disabled={disabled} value={value.score_min ?? ''} onChange={event => onChange({ ...value, score_min: event.target.value ? Number(event.target.value) : undefined })} /></div>
            <div><Label htmlFor="recipient-score-max">Puntaje máximo</Label><Input className="h-9 rounded-xl bg-background text-xs" id="recipient-score-max" type="number" disabled={disabled} value={value.score_max ?? ''} onChange={event => onChange({ ...value, score_max: event.target.value ? Number(event.target.value) : undefined })} /></div>
            <label className="flex gap-2 text-sm"><input type="checkbox" disabled={disabled} checked={value.has_email === true} onChange={event => onChange({ ...value, has_email: event.target.checked })} />Solo contactos con email</label>
            <p className="col-span-full text-xs text-muted-foreground">Fechas en hora local; vacío significa sin límite.</p>
            {dateFilters.map(([key, label]) => <div key={key}><Label htmlFor={`recipient-${key}`}>{label}</Label>
                <Input className="h-9 rounded-xl bg-background text-xs" id={`recipient-${key}`} type="datetime-local" disabled={disabled} value={displayLocalDateTime(value[key])} onChange={event => {
                    if (event.target.validity.badInput) return
                    const input = event.target.value
                    if (input && !Number.isFinite(Date.parse(input))) return
                    onChange({ ...value, [key]: input ? new Date(input).toISOString() : undefined })
                }} /></div>)}
            {advanced && <div className="col-span-full"><CampaignAssigneeFilter value={value.assigned_to} disabled={disabled} onChange={id => onChange({ ...value, assigned_to: id })} /></div>}
        </div></details></details>
    </div>
}

'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { audienceFiltersSchema } from '../marketing-contracts'
import { AudienceReadiness, getAudienceReadiness } from '../marketing-preflight-actions'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import dynamic from 'next/dynamic'
import { audienceRangeIssues } from '../marketing-contracts'
import { displayLocalDateTime } from '../marketing-editor-utils'

const CampaignAssigneeFilter = dynamic(() => import('./campaign-assignee-filter').then(module => module.CampaignAssigneeFilter))
const dateFilters = [
    ['created_after', 'Creado desde'], ['created_before', 'Creado hasta'],
    ['last_activity_after', 'Última actividad desde'], ['last_activity_before', 'Última actividad hasta'],
] as const

export type RecipientFilters = z.infer<typeof audienceFiltersSchema>
export function CampaignRecipientFilters({ value, onChange, disabled, refresh = 0 }: {
    value: RecipientFilters; onChange: (filters: RecipientFilters) => void; disabled: boolean; refresh?: number;
}) {
    const [readiness, setReadiness] = useState<AudienceReadiness | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true)
    const [revision, setRevision] = useState(0)
    const [advanced, setAdvanced] = useState(false)
    useEffect(() => {
        let current = true
        setLoading(true); setError(''); setReadiness(null)
        const rangeIssues = audienceRangeIssues(value)
        if (rangeIssues.length) { setLoading(false); setError(rangeIssues.join(' ')); return }
        const timer = setTimeout(() => {
            void getAudienceReadiness({ ...value, tags: value.tags?.filter(tag => tag.trim()) }).then(result => {
                if (!current) return
                if (result.success) setReadiness(result.audience); else setError(result.error)
                setLoading(false)
            }).catch(() => { if (current) { setError('No se pudo revisar la audiencia.'); setLoading(false) } })
        }, 300)
        return () => { current = false; clearTimeout(timer) }
    }, [value, revision, refresh])
    return <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Se usan contactos del CRM. Tener su teléfono no equivale a autorización de marketing. Los filtros no seleccionan bajas ni duplicados para enviar.</p>
        <div className="grid md:grid-cols-2 gap-3"><div><Label htmlFor="recipient-status">Estado del contacto · vacío para todos</Label><Input id="recipient-status" maxLength={100} disabled={disabled} value={value.status || ''} onChange={event => onChange({ ...value, status: event.target.value })} /></div>
            <div><Label htmlFor="recipient-tags">Etiquetas · separadas por comas</Label><Input id="recipient-tags" disabled={disabled} value={(value.tags || []).join(', ')} onChange={event => onChange({ ...value, tags: event.target.value ? event.target.value.split(',').map(tag => tag.trim()) : [] })} /></div></div>
        <details open={advanced} onToggle={event => setAdvanced(event.currentTarget.open)} className="rounded-lg border p-3"><summary className="cursor-pointer text-sm">Filtros avanzados</summary><div className="grid md:grid-cols-2 gap-3 pt-3">
            <div><Label htmlFor="recipient-source">Origen · vacío para todos</Label><Input id="recipient-source" maxLength={100} disabled={disabled} value={value.source || ''} onChange={event => onChange({ ...value, source: event.target.value })} /></div>
            <div><Label htmlFor="recipient-score-min">Puntaje mínimo</Label><Input id="recipient-score-min" type="number" disabled={disabled} value={value.score_min ?? ''} onChange={event => onChange({ ...value, score_min: event.target.value ? Number(event.target.value) : undefined })} /></div>
            <div><Label htmlFor="recipient-score-max">Puntaje máximo</Label><Input id="recipient-score-max" type="number" disabled={disabled} value={value.score_max ?? ''} onChange={event => onChange({ ...value, score_max: event.target.value ? Number(event.target.value) : undefined })} /></div>
            <label className="flex gap-2 text-sm"><input type="checkbox" disabled={disabled} checked={value.has_email === true} onChange={event => onChange({ ...value, has_email: event.target.checked })} />Solo contactos con email</label>
            <p className="col-span-full text-xs text-muted-foreground">Fechas en la hora local de tu navegador. Vacío significa sin límite; los valores guardados se conservan hasta que los edites.</p>
            {dateFilters.map(([key, label]) => <div key={key}><Label htmlFor={`recipient-${key}`}>{label}</Label>
                <Input id={`recipient-${key}`} type="datetime-local" disabled={disabled} value={displayLocalDateTime(value[key])} onChange={event => {
                    if (event.target.validity.badInput) return
                    const input = event.target.value
                    if (input && !Number.isFinite(Date.parse(input))) return
                    onChange({ ...value, [key]: input ? new Date(input).toISOString() : undefined })
                }} /></div>)}
            {advanced && <div className="col-span-full"><CampaignAssigneeFilter value={value.assigned_to} disabled={disabled} onChange={id => onChange({ ...value, assigned_to: id })} /></div>}
        </div></details>
        <div className="rounded-lg bg-muted/40 p-4 text-sm" aria-live="polite">
            {loading ? <p>Revisando destinatarios…</p> : error ? <p role="alert" className="text-red-600">{error}</p> : readiness && <>
                <p className="font-semibold">{readiness.eligible} destinatarios únicos con autorización vigente</p><p className="text-xs text-muted-foreground mt-1">De {readiness.matched} contactos del filtro. Excluidos: {readiness.missingConsent} sin autorización, {readiness.optedOut} bajas, {readiness.invalidFormat} teléfonos inválidos y {readiness.duplicates} duplicados.</p>
            </>}
            <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={() => setRevision(value => value + 1)}>Revisar destinatarios</Button>
        </div>
    </div>
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getMarketingAudiencePage } from '../marketing-workspace-actions'
import { AudiencePage } from '../marketing-workspace'
import { audienceFiltersSchema } from '../marketing-contracts'
import type { RecipientFilters } from './campaign-recipient-filters'
import { createAudience } from '../marketing-actions'

export function CampaignSavedSegments({ disabled, filters, onApply }: { disabled: boolean; filters: RecipientFilters; onApply: (filters: RecipientFilters) => void }) {
    const [search, setSearch] = useState(''), [query, setQuery] = useState('')
    const [cursor, setCursor] = useState<AudiencePage['next']>(null), [page, setPage] = useState<AudiencePage | null>(null)
    const [error, setError] = useState(''), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0)
    const [name, setName] = useState(''), [saving, setSaving] = useState(false)
    const mutation = useRef(false)
    async function save() {
        if (mutation.current || disabled || !name.trim()) return
        mutation.current = true
        setSaving(true); setError('')
        try {
            const result = await createAudience({ name: name.trim(), filter_config: { ...filters, tags: filters.tags?.filter(tag => tag.trim()) } })
            if (!result.success) { setError(result.error || 'No se pudo guardar el segmento.'); return }
            setName(''); setQuery(''); setSearch(''); setCursor(null); setRevision(value => value + 1)
        } catch { setError('No se confirmó el segmento. Actualiza antes de volver a crearlo.') }
        finally { mutation.current = false; setSaving(false) }
    }
    useEffect(() => {
        let current = true; setLoading(true); setPage(null); setError('')
        void getMarketingAudiencePage({ search: query, cursor }).then(result => {
            if (!current) return
            if (result.success) setPage(result.page); else setError(result.error)
        }).catch(() => { if (current) setError('No se pudieron consultar los segmentos.') }).finally(() => { if (current) setLoading(false) })
        return () => { current = false }
    }, [query, cursor, revision])
    return <div className="space-y-3 pt-3 text-sm">
        <form className="flex gap-2" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setCursor(null); setRevision(value => value + 1) }}><Input aria-label="Buscar segmento guardado" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} /><Button variant="outline" disabled={loading}>Buscar</Button></form>
        <p className="text-xs text-muted-foreground">Usar un segmento copia sus filtros al borrador. Guardar destinatarios no modifica el segmento original.</p>
        {error && <p role="alert" className="text-red-600">{error}</p>}
        {loading ? <p>Consultando segmentos…</p> : <ul className="space-y-2">{page?.rows.map(row => <li key={row.id} className="flex justify-between items-center gap-2"><span>{row.name}</span><Button disabled={disabled || saving} variant="outline" size="sm" onClick={() => {
            const result = audienceFiltersSchema.safeParse(row.filters)
            if (!result.success) { setError('Este segmento tiene filtros antiguos que requieren revisión. No se reemplazó tu selección.'); return }
            if (!saving) { onApply(result.data); setError('') }
        }}>Usar filtros</Button></li>)}</ul>}
        {!loading && !error && !page?.rows.length && <p>No hay segmentos para esta búsqueda.</p>}
        <div className="flex gap-2"><Button variant="ghost" size="sm" disabled={!cursor || loading} onClick={() => setCursor(null)}>Volver al inicio</Button><Button variant="outline" size="sm" disabled={!page?.next || loading} onClick={() => { if (page?.next) setCursor(page.next) }}>Más segmentos</Button></div>
        <div className="flex flex-wrap gap-2 pt-3 border-t"><Input aria-label="Nombre del segmento reutilizable" disabled={disabled || saving} maxLength={160} className="flex-1" value={name} onChange={event => setName(event.target.value)} placeholder="Nombre para reutilizar estos filtros" /><Button disabled={disabled || saving || !name.trim()} variant="outline" onClick={() => void save()}>Guardar filtros como segmento</Button></div>
    </div>
}

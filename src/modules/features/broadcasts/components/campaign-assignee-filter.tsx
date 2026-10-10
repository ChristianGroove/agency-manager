'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getMarketingAssignees } from '../marketing-workspace-actions'
import type { AssigneePage } from '../marketing-workspace'

export function CampaignAssigneeFilter({ value, disabled, onChange }: {
    value?: string; disabled: boolean; onChange: (id: string | undefined) => void;
}) {
    const [search, setSearch] = useState(''), [query, setQuery] = useState('')
    const [cursor, setCursor] = useState<string | null>(null), [page, setPage] = useState<AssigneePage | null>(null)
    const [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0)
    useEffect(() => {
        let current = true
        setLoading(true); setError(''); setPage(null)
        void getMarketingAssignees({ search: query, cursor, selected: value || null }).then(result => {
            if (!current) return
            if (result.success) setPage(result.page); else setError(result.error)
        }).catch(() => { if (current) setError('No se pudieron consultar los responsables.') })
            .finally(() => { if (current) setLoading(false) })
        return () => { current = false }
    }, [query, cursor, value, revision])
    return <div className="space-y-3 rounded-lg border p-3 text-sm">
        <p className="font-medium">Responsable del contacto</p>
        <p>{!value ? 'Todos los responsables' : loading ? 'Consultando responsable guardado…'
            : page?.selected ? `${page.selected.name}${page.selected.active ? '' : ' · ya no está activo'}` : 'Responsable guardado no disponible; el filtro se conserva.'}</p>
        {value && <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange(undefined)}>Quitar filtro de responsable</Button>}
        <div className="flex gap-2"><Input aria-label="Buscar responsable por nombre" maxLength={100} value={search} onChange={event => setSearch(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); setCursor(null); setQuery(search.trim()); setRevision(v => v + 1) } }} />
            <Button type="button" variant="outline" disabled={loading} onClick={() => { setCursor(null); setQuery(search.trim()); setRevision(v => v + 1) }}>Buscar responsable</Button></div>
        {error && <p role="alert" className="text-red-600">{error}</p>}
        {!loading && <ul className="space-y-2">{page?.rows.map(person => <li key={person.id} className="flex justify-between gap-2 items-center"><span>{person.name}</span>
            <Button type="button" variant="outline" size="sm" disabled={disabled || person.id === value} aria-label={`Elegir a ${person.name}`} onClick={() => onChange(person.id)}>Elegir</Button></li>)}</ul>}
        {!loading && !error && !page?.rows.length && <p>No hay responsables para esta búsqueda.</p>}
        <div className="flex gap-2"><Button type="button" variant="ghost" size="sm" disabled={!cursor || loading} onClick={() => setCursor(null)}>Volver al inicio</Button>
            <Button type="button" variant="outline" size="sm" disabled={!page?.next || loading} onClick={() => { if (page?.next) setCursor(page.next) }}>Más responsables</Button></div>
    </div>
}

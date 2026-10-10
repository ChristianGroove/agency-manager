'use client'

import { useEffect, useState } from 'react'
import { List, Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getMarketingContactListPage } from '../marketing-workspace-actions'
import type { ContactListPage } from '../marketing-workspace'
import dynamic from 'next/dynamic'
const CampaignListAuthorization = dynamic(() => import('./campaign-list-authorization').then(module => module.CampaignListAuthorization))

export function CampaignContactLists({ value, disabled, onSelect, refresh = 0, canAuthorize = false, onAuthorized }: {
    value?: string; disabled: boolean; onSelect: (id?: string) => void; refresh?: number; canAuthorize?: boolean; onAuthorized?: (count: number) => void;
}) {
    const [authorizationOpen, setAuthorizationOpen] = useState(false)
    const [open, setOpen] = useState(false), [search, setSearch] = useState(''), [query, setQuery] = useState('')
    const [cursor, setCursor] = useState<ContactListPage['next']>(null), [page, setPage] = useState<ContactListPage | null>(null)
    const [loading, setLoading] = useState(false), [error, setError] = useState(''), [revision, setRevision] = useState(0)
    useEffect(() => {
        if (!open && !value) return
        let current = true
        setLoading(true); setError(''); setPage(null)
        void getMarketingContactListPage({ selected: value || null, search: query, cursor }).then(result => {
            if (!current) return
            if (result.success) setPage(result.page); else setError(result.error)
        }).catch(() => { if (current) setError('No se pudieron consultar las listas. Tu selección se conserva.') })
            .finally(() => { if (current) setLoading(false) })
        return () => { current = false }
    }, [value, open, query, cursor, revision, refresh])
    return <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
            <List className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{value ? page?.selected?.name || (loading ? 'Consultando lista…' : 'Lista guardada') : 'Contactos del CRM'}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{value ? 'Solo contactos de esta lista con autorización vigente.' : 'Contactos con teléfono y autorización vigente. Puedes elegir una lista importada.'}</p>
            </div>
            <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => setOpen(!open)} aria-expanded={open}>Elegir lista</Button>
        </div>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        {value && canAuthorize && <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">¿La empresa ya obtuvo el permiso fuera de Pixy?</p><Button size="sm" variant="outline" disabled={disabled} onClick={() => setAuthorizationOpen(true)}>Registrar autorización de la lista</Button></div>}
        {authorizationOpen && value && <CampaignListAuthorization key={value} listId={value} onClose={() => setAuthorizationOpen(false)} onSaved={count => { setAuthorizationOpen(false); setRevision(n => n + 1); onAuthorized?.(count) }} />}
        {!loading && !error && value && page && !page.selected && <p role="alert" className="text-xs text-destructive">La lista guardada no está disponible. Elige otra antes de enviar.</p>}
        {open && <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
            <form className="flex gap-2" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setCursor(null); setRevision(n => n + 1) }}>
                <Input aria-label="Buscar lista importada" value={search} maxLength={100} placeholder="Buscar por nombre de lista" onChange={event => setSearch(event.target.value)} />
                <Button type="submit" variant="outline" size="icon" aria-label="Buscar listas" disabled={loading}><Search className="h-4 w-4" /></Button>
            </form>
            <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => { onSelect(undefined); setOpen(false) }}>Usar contactos del CRM</Button>
            {loading ? <p role="status" className="text-xs">Consultando listas…</p> : <ul className="space-y-2">{page?.rows.map(list => <li key={list.id} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                <div><p className="text-sm font-medium">{list.name}</p><p className="text-xs text-muted-foreground">{list.contacts} contactos · {new Date(list.createdAt).toLocaleDateString()}</p></div>
                <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => { onSelect(list.id); setOpen(false) }}>{value === list.id && <Check className="mr-1 h-3 w-3" />}Usar lista</Button>
            </li>)}</ul>}
            {!loading && !error && !page?.rows.length && <p className="text-xs text-muted-foreground">No hay listas para esta búsqueda. Puedes importar una nueva.</p>}
            <div className="flex justify-between"><Button type="button" size="sm" variant="ghost" disabled={!cursor || loading} onClick={() => setCursor(null)}>Volver al inicio</Button><Button type="button" size="sm" variant="ghost" disabled={!page?.next || loading} onClick={() => { if (page?.next) setCursor(page.next) }}>Más listas</Button></div>
        </div>}
    </div>
}

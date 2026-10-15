'use client'

import { DataTable } from "@/components/ui/data-table"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { useMarketingApi } from '../marketing-client-api'

import { useRef, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, Check, CheckCircle2, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './campaign-dialog'
import { parseMarketingListFile, CONTACT_LIST_BYTE_LIMIT, ImportReview, ImportReviewRow, importReason } from '../marketing-import'


import { parseEmailListImport } from '../marketing-email-contracts'


export function CampaignImport({ onClose, onImported, channel = 'whatsapp' }: { channel?: 'whatsapp' | 'email'; onClose: () => void; onImported?: (list: { id: string; name: string }) => void }) {
    const { prepareMarketingImport, prepareMarketingContactImport, confirmMarketingImport, prepareEmailContactImport, confirmEmailContactImport } = useMarketingApi()
    const [listName, setListName] = useState('')
    const [mode, setMode] = useState<'contacts' | 'consent'>('contacts')
    const [page, setPage] = useState(0)
    const [pageSize, setPageSize] = useState(25)
    const [importedList, setImportedList] = useState<{ id: string; name: string } | null>(null)
    const [review, setReview] = useState<ImportReview | null>(null)
    const [invalid, setInvalid] = useState<ImportReviewRow[]>([])
    const [selected, setSelected] = useState<number[]>([])
    const [confirmed, setConfirmed] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState('')
    const [fileName, setFileName] = useState('')
    const epoch = useRef(0)
    const mutation = useRef(false)
    useEffect(() => () => { epoch.current++ }, [])
    async function load(file?: File) {
        if (!file || mutation.current) return
        setFileName(file.name)
        if (!listName.trim()) setListName(file.name.replace(/\.csv$/i, '').slice(0, 160))
        const request = ++epoch.current
        setBusy(true); setError(''); setResult(''); setReview(null); setInvalid([]); setSelected([]); setConfirmed(false); setPage(0)
        try {
            if (file.size > CONTACT_LIST_BYTE_LIMIT) throw new Error('El CSV supera 5 MB.')
            const parsed = channel === 'email' ? { ...parseEmailListImport(await file.text()), mode: 'contacts' as const } : parseMarketingListFile(await file.text())
            if (request !== epoch.current) return
            setMode(parsed.mode)
            setInvalid(parsed.invalid)
            if (!parsed.valid.length) { setError('Ninguna fila tiene datos válidos.'); return }
            const response = channel === 'email' ? await prepareEmailContactImport(parsed.valid) : parsed.mode === 'contacts' ? await prepareMarketingContactImport(parsed.valid) : await prepareMarketingImport(parsed.valid)
            if (request !== epoch.current) return
            if (!response.success) setError(response.error)
            else { setReview(response.review); if (parsed.mode === 'contacts') setSelected(response.review.rows.filter(row => row.eligible).map(row => row.row)) }
        } catch (failure) { if (request === epoch.current) setError(failure instanceof Error ? failure.message : 'No se pudo revisar el CSV.') }
        finally { if (request === epoch.current) setBusy(false) }
    }
    async function save() {
        if (!review || !confirmed || !selected.length || !listName.trim() || mutation.current) return
        mutation.current = true
        setBusy(true); setError('')
        try {
            const request = epoch.current
            const response = await (channel === 'email' ? confirmEmailContactImport : confirmMarketingImport)({ token: review.token, rows: selected, confirmed, listName: listName.trim(), ...(channel === 'whatsapp' && mode === 'contacts' ? { mode } : {}) })
            if (request !== epoch.current) return
            if (!response.success) { setError(response.error); return }
            if (response.result.listId && response.result.listName) setImportedList({ id: response.result.listId, name: response.result.listName })
            setResult(`Nuevos: ${response.result.created} · Existentes: ${response.result.existing}${mode === 'consent' ? ` · Autorizaciones: ${response.result.consents}` : ''}`)
        } catch { setError('No se pudo confirmar el resultado. Reintenta con la misma selección: una confirmación ya aplicada no se duplicará.') }
        finally { mutation.current = false; setBusy(false) }
    }
    const rows = [...(review?.rows || []), ...invalid].sort((a, b) => a.row - b.row)
    return <Dialog open onOpenChange={open => { if (!open && !mutation.current && !busy) onClose() }}>
        <DialogContent className="flex max-h-[92dvh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:p-0">
            <DialogHeader className="shrink-0 px-6 pb-5 pt-6 text-left">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FileSpreadsheet className="h-5 w-5" /></span><div><DialogTitle>Importar lista de contactos</DialogTitle><DialogDescription className="mt-1 text-xs">Carga tu CSV y elige qué contactos importar.</DialogDescription></div></div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 rounded-full" aria-label="Cerrar importación" disabled={busy} onClick={onClose}><X className="h-4 w-4" /></Button>
                </div>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-6 text-sm">
                {result ? <div role="status" className="rounded-2xl bg-emerald-500/5 px-5 py-8 text-center"><CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" /><h3 className="text-lg font-semibold">Tu lista está lista</h3><p className="mt-1 break-words font-medium">{importedList?.name || listName}</p><p className="mt-3 text-sm text-muted-foreground">{result}</p><p className="mt-2 text-xs text-muted-foreground">No se enviaron mensajes.</p></div> : <>
                    <div className="space-y-2"><label htmlFor="marketing-list-name" className="text-xs font-medium">Nombre de la lista</label><Input id="marketing-list-name" className="rounded-xl" value={listName} maxLength={160} disabled={busy} onChange={event => { setListName(event.target.value); setConfirmed(false) }} placeholder="Ej. Clientes interesados · octubre" /></div>
                    <label className={`relative flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03] p-5 transition-colors hover:bg-primary/[0.06] focus-within:ring-2 focus-within:ring-ring ${busy ? 'pointer-events-none opacity-60' : ''}`}>
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-sm">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : fileName ? <FileSpreadsheet className="h-5 w-5" /> : <Upload className="h-5 w-5" />}</span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{fileName || 'Seleccionar archivo CSV'}</span><span className="mt-1 block text-xs text-muted-foreground">{busy ? 'Revisando contactos…' : fileName ? 'Pulsa para cambiar el archivo' : 'Hasta 1.000 contactos · 5 MB'}</span></span>
                        <input id="marketing-csv" aria-label="Archivo CSV" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" type="file" accept=".csv,text/csv" disabled={busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void load(file) }} />
                    </label>
                    <details className="group rounded-xl bg-muted/40 px-4 py-3 text-xs"><summary className="cursor-pointer font-medium">Formato del archivo y permisos</summary><div className="mt-3 space-y-2 leading-relaxed text-muted-foreground"><p>{channel === 'email' ? 'Email obligatorio; nombre opcional.' : 'Teléfono con código de país obligatorio; nombre y email opcionales.'}</p><code className="block rounded-lg bg-background px-3 py-2 text-foreground">{channel === 'email' ? 'email,nombre' : 'telefono,nombre,email'}</code><p>Se conservan los datos existentes y las bajas. Los contactos nuevos no entran al pipeline comercial. Importar contactos no autoriza envíos; puedes registrar el permiso externo después.</p></div></details>
                    {busy && <p role="status" className="text-xs text-muted-foreground">Procesando…</p>}
                    {rows.length > 0 && <section className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Revisión del archivo</h3><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{selected.length} de {rows.length} seleccionados</span></div>
                        <div><DataTable className="w-full text-left text-xs"><caption className="sr-only">Revisión de contactos del archivo</caption>
                            <thead className="sticky top-0 z-10 bg-muted"><tr><th className="w-10 p-3"><span className="sr-only">Seleccionar</span></th><th className="py-3 pr-3 font-medium">Fila</th><th className="p-3 font-medium">Contacto</th><th className="p-3 font-medium">Estado</th></tr></thead>
                            <tbody>{rows.slice(page * pageSize, (page + 1) * pageSize).map(row => <tr key={row.row} className="border-t transition-colors hover:bg-muted/30"><td className="p-3"><input type="checkbox" className="h-4 w-4 accent-primary" aria-label={`Importar fila ${row.row}`} disabled={!row.eligible || busy} checked={selected.includes(row.row)} onChange={event => { setConfirmed(false); setSelected(event.target.checked ? [...selected, row.row] : selected.filter(id => id !== row.row)) }} /></td><td className="pr-3 tabular-nums text-muted-foreground">{row.row}</td><td className="p-3"><span className="block font-medium">{row.name}</span><span className="break-all text-muted-foreground">{row.phone}</span></td><td className="p-3"><span className={`inline-flex items-center gap-1.5 ${row.eligible ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>{row.eligible && <Check className="h-3 w-3 shrink-0" />}{importReason[row.reason] || row.reason}</span>{row.evidence && <details className="mt-1 text-muted-foreground"><summary className="cursor-pointer">Ver evidencia · fila {row.row}</summary><p>{row.source} · {row.occurredAt ? new Date(row.occurredAt).toLocaleString() : ''}</p><p className="whitespace-pre-wrap break-all">{row.evidence}</p></details>}</td></tr>)}</tbody>
                        </DataTable></div>
                        <DataTablePagination totalCount={rows.length} page={page + 1} pageSize={pageSize} onPageChange={(value) => setPage(value - 1)} onPageSizeChange={(size) => { setPageSize(size); setPage(0) }} disabled={busy} itemLabel="filas" />
                        {review && <div className="flex flex-wrap gap-1"><Button size="sm" variant="ghost" className="h-8 text-xs" disabled={busy} onClick={() => { setSelected(review.rows.filter(row => row.eligible).map(row => row.row)); setConfirmed(false) }}>Seleccionar todos los válidos</Button><Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" disabled={busy} onClick={() => { setSelected([]); setConfirmed(false) }}>Limpiar selección</Button></div>}
                    </section>}
                </>}
                {error && <p role="alert" className="rounded-xl bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
            </div>
            <footer className="shrink-0 space-y-4 border-t bg-muted/20 px-6 py-4">
                {review && !result && <label className="flex items-start gap-3 text-xs leading-relaxed"><input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-primary" checked={confirmed} disabled={busy || !selected.length} onChange={event => setConfirmed(event.target.checked)} />{mode === 'contacts' ? 'Confirmo la importación de los contactos seleccionados, sin autorizar ni enviar mensajes.' : 'He revisado las filas seleccionadas y su evidencia acredita autorización para recibir marketing de nuestra empresa.'}</label>}
                <div className="flex flex-wrap items-center justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={onClose}>{result ? 'Cerrar' : 'Cancelar'}</Button>{review && !result && <Button className="rounded-xl" disabled={busy || !confirmed || !selected.length || !listName.trim()} onClick={save}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar importación ({selected.length})</Button>}{importedList && onImported && <Button className="rounded-xl" onClick={() => { onImported(importedList); onClose() }}>Usar esta lista en la campaña<ArrowRight className="ml-2 h-4 w-4" /></Button>}</div>
            </footer>
        </DialogContent>
    </Dialog>
}

'use client'

import { useRef, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { parseMarketingImport, IMPORT_BYTE_LIMIT, ImportReview, ImportReviewRow, importReason } from '../marketing-import'
import { prepareMarketingImport, confirmMarketingImport } from '../marketing-review-actions'

export function CampaignImport({ onClose, onImported }: { onClose: () => void; onImported?: (list: { id: string; name: string }) => void }) {
    const [listName, setListName] = useState('')
    const [importedList, setImportedList] = useState<{ id: string; name: string } | null>(null)
    const [review, setReview] = useState<ImportReview | null>(null)
    const [invalid, setInvalid] = useState<ImportReviewRow[]>([])
    const [selected, setSelected] = useState<number[]>([])
    const [confirmed, setConfirmed] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState('')
    const epoch = useRef(0)
    const mutation = useRef(false)
    useEffect(() => () => { epoch.current++ }, [])
    async function load(file?: File) {
        if (!file || mutation.current) return
        if (!listName.trim()) setListName(file.name.replace(/\.csv$/i, '').slice(0, 160))
        const request = ++epoch.current
        setBusy(true); setError(''); setResult(''); setReview(null); setInvalid([]); setSelected([]); setConfirmed(false)
        try {
            if (file.size > IMPORT_BYTE_LIMIT) throw new Error('El CSV supera 1 MB.')
            const parsed = parseMarketingImport(await file.text())
            if (request !== epoch.current) return
            setInvalid(parsed.invalid)
            if (!parsed.valid.length) { setError('Ninguna fila tiene datos y evidencia válidos.'); return }
            const response = await prepareMarketingImport(parsed.valid)
            if (request !== epoch.current) return
            if (!response.success) setError(response.error)
            else setReview(response.review)
        } catch (failure) { if (request === epoch.current) setError(failure instanceof Error ? failure.message : 'No se pudo revisar el CSV.') }
        finally { if (request === epoch.current) setBusy(false) }
    }
    async function save() {
        if (!review || !confirmed || !selected.length || !listName.trim() || mutation.current) return
        mutation.current = true
        setBusy(true); setError('')
        try {
            const request = epoch.current
            const response = await confirmMarketingImport({ token: review.token, rows: selected, confirmed, listName: listName.trim() })
            if (request !== epoch.current) return
            if (!response.success) { setError(response.error); return }
            if (response.result.listId && response.result.listName) setImportedList({ id: response.result.listId, name: response.result.listName })
            setResult(`${response.result.created} contactos de marketing creados, ${response.result.existing} contactos conservados y ${response.result.consents} autorizaciones registradas. No se enviaron mensajes ni se crearon oportunidades comerciales.`)
        } catch { setError('No se pudo confirmar el resultado. Reintenta con la misma selección: una confirmación ya aplicada no se duplicará.') }
        finally { mutation.current = false; setBusy(false) }
    }
    const rows = [...(review?.rows || []), ...invalid].sort((a, b) => a.row - b.row)
    return <Dialog open onOpenChange={open => { if (!open && !mutation.current && !busy) onClose() }}>
        <DialogContent aria-labelledby="import-review-title" aria-describedby="import-review-description" className="max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader>
            <DialogTitle id="import-review-title">Importar lista de contactos</DialogTitle>
            <DialogDescription id="import-review-description">CSV de hasta 100 contactos y 1 MB. Revisión por fila; las bajas requieren una renovación independiente. Los contactos existentes conservan nombre, email, etiquetas y asignación.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
            <label htmlFor="marketing-list-name">Nombre de la lista</label><Input id="marketing-list-name" value={listName} maxLength={160} disabled={busy || !!result} onChange={event => { setListName(event.target.value); setConfirmed(false) }} placeholder="Ej. Clientes interesados · octubre" />
            <p className="text-muted-foreground">Los contactos nuevos quedan fuera del pipeline comercial. Los contactos existentes conservan su tipo y etapa.</p>
            <p>Columnas obligatorias (email puede estar vacío):</p>
            <code className="block text-xs break-all">nombre,telefono,email,origen_autorizacion,evidencia,fecha_autorizacion</code>
            <p className="text-muted-foreground">Teléfono internacional con código de país. Fecha ISO con zona horaria, por ejemplo 2026-10-01T10:00:00-05:00. La evidencia debe identificar la autorización para promociones de esta empresa.</p>
            <label htmlFor="marketing-csv">Archivo CSV</label><Input id="marketing-csv" type="file" accept=".csv,text/csv" disabled={busy || !!result} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void load(file) }} />
            {busy && <p role="status">Procesando…</p>}
            {error && <p role="alert" className="text-red-600">{error}</p>}
            {rows.length > 0 && <div className="max-h-72 overflow-auto border rounded"><table className="w-full text-left text-xs"><caption className="sr-only">Revisión de contactos del archivo</caption>
                <thead><tr><th className="p-2">Seleccionar</th><th>Fila</th><th>Contacto</th><th>Resultado de revisión</th></tr></thead>
                <tbody>{rows.map(row => <tr key={row.row} className="border-t"><td className="p-2"><input type="checkbox" aria-label={`Importar fila ${row.row}`} disabled={!row.eligible || busy || !!result} checked={selected.includes(row.row)} onChange={event => { setConfirmed(false); setSelected(event.target.checked ? [...selected, row.row] : selected.filter(id => id !== row.row)) }} /></td>
                    <td>{row.row}</td><td className="p-2">{row.name}<br />{row.phone}</td><td className="p-2">{importReason[row.reason] || row.reason}
                        {row.evidence && <details className="mt-1"><summary className="cursor-pointer">Ver evidencia · fila {row.row}</summary><p>{row.source} · {row.occurredAt ? new Date(row.occurredAt).toLocaleString() : ''}</p><p className="whitespace-pre-wrap break-all">{row.evidence}</p></details>}
                    </td></tr>)}</tbody>
            </table></div>}
            {review && !result && <><p>{selected.length} seleccionados · Revisión válida hasta {new Date(review.expiresAt).toLocaleTimeString()}. Un cambio de consentimiento o contacto obliga a revisar de nuevo.</p>
                <label className="flex gap-2"><input type="checkbox" checked={confirmed} disabled={busy || !selected.length} onChange={event => setConfirmed(event.target.checked)} />He revisado las filas seleccionadas y su evidencia acredita autorización para recibir marketing de nuestra empresa.</label>
                <Button disabled={busy || !confirmed || !selected.length || !listName.trim()} onClick={save}>Confirmar importación ({selected.length})</Button></>}
            {result && <p role="status">{result}</p>}
            {importedList && onImported && <Button onClick={() => { onImported(importedList); onClose() }}>Usar esta lista en la campaña</Button>}
            <Button variant="outline" disabled={busy} onClick={onClose}>{result ? 'Cerrar' : 'Cancelar'}</Button>
        </div></DialogContent>
    </Dialog>
}

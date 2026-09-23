import Link from 'next/link'
import { getMetaDeliveryOverview, reconcileUnknownMetaDelivery } from '@/modules/features/messaging/actions/meta-delivery'

export default async function MetaDeliveryPage({ searchParams }: { searchParams: Promise<{ resolved?: string }> }) {
    const { counts, rows } = await getMetaDeliveryOverview()
    const { resolved } = await searchParams
    return <main className="mx-auto max-w-5xl space-y-6 p-6">
        <div>
            <Link href="/platform/integrations" className="text-sm underline">← Integraciones</Link>
            <h1 className="mt-3 text-2xl font-semibold">Entregas de canales Meta</h1>
            <p className="text-sm text-muted-foreground">Pendientes del tenant actual. Los resultados inciertos nunca se reenvían automáticamente.</p>
            {resolved === '1' && <p role="status" className="mt-2 text-sm text-green-700">La conciliación se guardó con evidencia.</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
            {(['queued','sending','unknown','failed'] as const).map(status =>
                <div key={status} className="rounded-lg border p-4"><div className="text-sm capitalize">{status}</div><div className="text-2xl font-semibold">{counts[status]}</div></div>)}
        </div>
        <p className="text-sm text-muted-foreground">Se muestran los 50 casos inciertos y los 10 pendientes más antiguos. Si la cola crece o un envío permanece en «sending» más de 15 minutos, comprueba el worker Inngest.</p>
        <div className="space-y-4">
            {rows.map(row => <section key={row.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                    <div><strong className="capitalize">{row.status}</strong> · {row.channel} · destino terminado en {row.recipient.slice(-4)}</div>
                    <time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('es-CO')}</time>
                </div>
                <div className="break-all text-xs text-muted-foreground">Operación {row.id} · canal {row.connection_id}{row.error_kind ? ` · ${row.error_kind}` : ''}</div>
                {row.status === 'unknown' && <div className="space-y-3">
                    <p className="text-sm">Verifica el resultado en Meta o mediante un recibo del mismo canal. Para confirmar un envío, ingresa el ID del mensaje de Meta: el sistema exigirá que ya exista un recibo coincidente. Marca fallo solo con evidencia concreta de que Meta no recibió el mensaje.</p>
                    <form action={reconcileUnknownMetaDelivery} className="grid gap-2">
                        <input type="hidden" name="outboxId" value={row.id}/>
                        <input name="externalId" placeholder="ID de mensaje Meta (obligatorio para confirmar envío)" className="rounded border bg-background p-2 text-sm" maxLength={255}/>
                        <textarea name="evidence" required minLength={30} maxLength={2000} placeholder="Evidencia de la verificación (mínimo 30 caracteres)" className="rounded border bg-background p-2 text-sm"/>
                        <div className="flex flex-wrap gap-2">
                            <button name="outcome" value="accepted" className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Confirmar envío con recibo</button>
                            <button name="outcome" value="failed" className="rounded border px-3 py-2 text-sm">Confirmar fallo</button>
                        </div>
                    </form>
                </div>}
            </section>)}
            {rows.length === 0 && <p className="text-sm text-muted-foreground">No hay operaciones pendientes ni inciertas.</p>}
        </div>
    </main>
}

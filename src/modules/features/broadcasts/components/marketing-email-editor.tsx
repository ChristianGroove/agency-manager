'use client'
import { Mail } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function MarketingEmailEditor({ value, onChange, disabled }: { value: { subject: string; body: string }; onChange: (value: { subject: string; body: string }) => void; disabled: boolean }) {
    const preview = (text: string) => text.replace(/\{\{(nombre|empresa|email)\}\}/g, (_, key: string) => ({ nombre: 'Andrea', empresa: 'Empresa de ejemplo', email: 'andrea@example.com' })[key as 'nombre' | 'empresa' | 'email'])
    return <div className="space-y-4">
        <div className="space-y-2"><Label htmlFor="marketing-email-subject">Asunto</Label><Input id="marketing-email-subject" maxLength={200} value={value.subject} disabled={disabled} onChange={event => onChange({ ...value, subject: event.target.value })} placeholder="Una novedad para ti" /></div>
        <div className="space-y-2"><Label htmlFor="marketing-email-body">Mensaje</Label><Textarea id="marketing-email-body" className="min-h-40 rounded-xl" maxLength={20000} value={value.body} disabled={disabled} onChange={event => onChange({ ...value, body: event.target.value })} placeholder="Escribe el contenido de tu campaña…" />
            <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">Personalizar:</span>{['nombre', 'empresa', 'email'].map(field => <Button key={field} type="button" disabled={disabled} size="sm" variant="outline" className="h-7 text-xs" onClick={() => onChange({ ...value, body: value.body + `{{${field}}}` })}>{field}</Button>)}</div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border/60 bg-background"><div className="flex items-center gap-2 border-b bg-muted/20 px-4 py-3 text-xs font-semibold"><Mail className="h-4 w-4 text-primary" />Vista previa · contacto ficticio</div><div className="space-y-3 p-4"><p className="font-semibold">{preview(value.subject) || 'Tu asunto'}</p><p className="whitespace-pre-wrap break-words text-sm">{preview(value.body) || 'Tu mensaje aparecerá aquí.'}</p><p className="border-t pt-3 text-xs text-muted-foreground">Se incluirá el nombre del emisor y un enlace para dejar de recibir sus comunicaciones comerciales.</p></div></div>
        <p className="text-xs text-muted-foreground">Las variables se sustituyen con los datos del contacto. La revisión final excluirá la activación si falta alguno. Cada destinatario recibe un correo individual.</p>
    </div>
}

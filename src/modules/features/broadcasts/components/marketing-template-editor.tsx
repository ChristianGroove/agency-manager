'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getMarketingSetup, MarketingChannel } from '../marketing-preflight-actions'
import { CampaignTemplate, describeCampaignTemplate, TemplateSelection } from '../marketing-template-contract'

export function MarketingTemplateEditor({ connectionId, onConnectionChange, value, onChange }: {
    connectionId: string; onConnectionChange?: (id: string) => void;
    value: TemplateSelection | null; onChange: (selection: TemplateSelection | null) => void;
}) {
    const [channels, setChannels] = useState<MarketingChannel[]>([])
    const [templates, setTemplates] = useState<CampaignTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [retry, setRetry] = useState(0)
    useEffect(() => {
        let current = true
        setLoading(true); setError(''); setTemplates([])
        void getMarketingSetup(connectionId || undefined).then(result => {
            if (!current) return
            if (result.success) { setChannels(result.channels); setTemplates(result.templates) }
            else { setChannels([]); setError(result.error) }
            setLoading(false)
        }).catch(() => { if (current) { setError('No se pudo cargar la configuración.'); setLoading(false) } })
        return () => { current = false }
    }, [connectionId, retry])
    const template = templates.find(item => item.id === value?.template_id)
    const description = template ? describeCampaignTemplate(template) : null
    return <div className="space-y-4">
        {onConnectionChange && <div className="space-y-2">
            <Label>Número emisor de WhatsApp</Label>
            <Select value={connectionId} disabled={loading} onValueChange={id => { onChange(null); onConnectionChange(id) }}>
                <SelectTrigger aria-label="Número emisor de WhatsApp"><SelectValue placeholder="Selecciona el canal conectado" /></SelectTrigger>
                <SelectContent>{channels.map(channel => <SelectItem key={channel.id} value={channel.id}>{channel.name}</SelectItem>)}</SelectContent>
            </Select>
            {!loading && !error && !channels.length && <p className="text-sm text-muted-foreground">No hay números WhatsApp activos a los que tengas acceso.</p>}
        </div>}
        {error && <div role="alert" className="text-sm text-red-600">{error} <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div>}
        {loading && <p role="status" className="text-sm text-muted-foreground">Consultando canales y plantillas…</p>}
        <div className="space-y-2">
            <Label>Plantilla de marketing</Label>
            <Select value={value?.template_id || ''} disabled={!connectionId || loading || !!error} onValueChange={id => {
                const selected = templates.find(item => item.id === id)
                if (selected) onChange({ template_id: id, template_name: selected.name, template_language: selected.language, bindings: {} })
            }}>
                <SelectTrigger aria-label="Plantilla de marketing"><SelectValue placeholder="Selecciona una plantilla aprobada de este número" /></SelectTrigger>
                <SelectContent>{templates.map(item => <SelectItem key={item.id} value={item.id}>{item.name} · {item.language}</SelectItem>)}</SelectContent>
            </Select>
            {connectionId && !loading && !error && !templates.length && <p className="text-sm text-muted-foreground">No hay plantillas MARKETING aprobadas y sincronizadas para este número. Revísalas en Configuración → Plantillas.</p>}
            {value && !loading && !template && <p role="alert" className="text-sm text-red-600">La plantilla guardada ya no está disponible en este número. Selecciona otra.</p>}
        </div>
        {description?.issues.map(issue => <p key={issue} role="alert" className="text-sm text-amber-700">{issue}</p>)}
        {!!description?.fields.length && <p className="text-xs text-muted-foreground">Completa todas las variables. Puedes usar {'{{nombre}}'}, {'{{empresa}}'} y {'{{telefono}}'} para personalizar; la revisión señalará datos faltantes.</p>}
        {description?.fields.map(field => <div className="space-y-1" key={field.key}>
            <Label htmlFor={`binding-${field.key}`}>{field.label}</Label>
            <Input id={`binding-${field.key}`} value={value?.bindings[field.key] || ''} placeholder={field.kind === 'media' ? 'https://…' : field.kind === 'payload' ? 'Ejemplo: BAJA_PROMOCIONES' : 'Valor o variable de contacto'}
                onChange={event => { if (value) onChange({ ...value, bindings: { ...value.bindings, [field.key]: event.target.value } }) }} />
        </div>)}
        {template && <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-sm whitespace-pre-wrap">
            <p className="text-xs text-muted-foreground mb-2">Vista previa del texto · no es un envío</p>
            {template.components.find(component => component.type === 'BODY')?.text?.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
                (match, key) => value?.bindings[`body.${key}`] || match)}
        </div>}
    </div>
}

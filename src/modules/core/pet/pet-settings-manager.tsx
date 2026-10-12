'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Bot, Loader2, RotateCcw, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { DEFAULT_PET_SETTINGS, PET_SHAPES, PET_STATES, type PetSettings, type PetState } from './config'
import { getPetAdminSettings, savePetSettings } from './config-actions'
import { PetVisual } from './pet-visual'

const shapeLabels = { rectangle: 'Rectángulo', square: 'Cuadrado', circle: 'Círculo', hexagon: 'Hexágono' }
const stateLabels: Record<PetState, string> = {
    idle: 'Disponible', thinking: 'Pensando', searching: 'Buscando', listening: 'Escuchando',
    speaking: 'Hablando', working: 'Trabajando', happy: 'Éxito', error: 'Error', sleeping: 'Descansando',
}
const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const feedbackOptions = { position: 'top-center' as const }

export function PetSettingsManager() {
    const router = useRouter()
    const [settings, setSettings] = useState<PetSettings>({ ...DEFAULT_PET_SETTINGS })
    const [organizations, setOrganizations] = useState<{ id: string; name: string; slug: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [available, setAvailable] = useState(false)
    const [saving, setSaving] = useState(false)
    const [loadError, setLoadError] = useState(false)
    const [previewState, setPreviewState] = useState<PetState>('idle')

    useEffect(() => {
        let active = true
        getPetAdminSettings().then(result => {
            if (!active) return
            setSettings(result.settings)
            setOrganizations(result.organizations)
            setAvailable(result.available)
        }).catch(() => { if (active) setLoadError(true) })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [])

    const update = <K extends keyof PetSettings>(key: K, value: PetSettings[K]) => {
        setSettings(previous => ({ ...previous, [key]: value }))
    }
    const save = async () => {
        setSaving(true)
        try {
            const result = await savePetSettings(settings)
            if (!result.success) { toast.error(result.error || 'No se pudo guardar la mascota.', feedbackOptions); return }
            toast.success('Configuración de mascota actualizada.', feedbackOptions)
            router.refresh()
        } catch { toast.error('No se pudo guardar la mascota.', feedbackOptions) }
        finally { setSaving(false) }
    }

    if (loading) return <div role="status" className="flex items-center gap-2 p-6"><Loader2 className="h-4 w-4 animate-spin" />Cargando mascota…</div>
    if (loadError) return <p role="alert" className="p-4 text-sm text-destructive">No se pudo cargar la configuración de mascota. Recarga la página para reintentar.</p>

    return <Card className="mt-6">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />Mascota Pixy</CardTitle>
            <CardDescription>Acceso directo a ayuda. En otros tenants hereda los colores primario y secundario del ADN de marca.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {!available && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">La configuración todavía no está habilitada en este entorno. La mascota permanece apagada hasta completar su preparación.</p>}
            <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-5">
                    <div className="flex items-center justify-between gap-4">
                        <Label htmlFor="pet-enabled">Activar mascota</Label>
                        <Switch id="pet-enabled" checked={settings.enabled} onCheckedChange={value => update('enabled', value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pet-organization">Organización Pixy</Label>
                        <select id="pet-organization" className={selectClass} value={settings.pixyOrganizationId || ''} onChange={event => update('pixyOrganizationId', event.target.value || null)}>
                            <option value="">Selecciona una organización</option>
                            {organizations.map(org => <option key={org.id} value={org.id}>{org.name} ({org.slug})</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pet-audience">Disponibilidad</Label>
                        <select id="pet-audience" className={selectClass} value={settings.audience} onChange={event => update('audience', event.target.value as PetSettings['audience'])}>
                            <option value="pixy">Piloto: solo Pixy</option><option value="all">Todos los tenants</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pet-shape">Forma</Label>
                        <select id="pet-shape" className={selectClass} value={settings.shape} onChange={event => update('shape', event.target.value as PetSettings['shape'])}>
                            {PET_SHAPES.map(shape => <option key={shape} value={shape}>{shapeLabels[shape]}</option>)}
                        </select>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {(['color', 'trimColor', 'screenColor'] as const).map(key => <div key={key} className="space-y-2">
                            <Label htmlFor={`pet-${key}`}>{key === 'color' ? 'Carcasa Pixy' : key === 'trimColor' ? 'Detalles Pixy' : 'LEDs'}</Label>
                            <Input id={`pet-${key}`} type="color" value={settings[key]} onChange={event => update(key, event.target.value)} className="h-10 p-1" />
                        </div>)}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {(['desktopSize', 'mobileSize'] as const).map(key => <div key={key} className="space-y-2">
                            <Label htmlFor={`pet-${key}`}>{key === 'desktopSize' ? 'Tamaño escritorio' : 'Tamaño móvil'}</Label>
                            <select id={`pet-${key}`} className={selectClass} value={settings[key]} onChange={event => update(key, Number(event.target.value) as PetSettings[typeof key])}>
                                {[48, 56, 64, 80].map(size => <option key={size} value={size}>{size} px</option>)}
                            </select>
                        </div>)}
                    </div>
                </div>
                <div className="space-y-5">
                    <div className="flex min-h-48 flex-col items-center justify-center gap-6 rounded-xl border bg-muted/30 p-8">
                        <PetVisual key={`${settings.shape}:${settings.desktopSize}`} settings={settings}
                            palette={{ color: settings.color, trimColor: settings.trimColor, screenColor: settings.screenColor }}
                            state={previewState} size={settings.desktopSize} animate={previewState !== 'idle' || settings.animation === 'continuous'} />
                        <span className="text-sm text-muted-foreground">Vista previa: {stateLabels[previewState]}</span>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pet-preview-state">Estado de prueba</Label>
                        <select id="pet-preview-state" className={selectClass} value={previewState} onChange={event => setPreviewState(event.target.value as PetState)}>
                            {PET_STATES.map(state => <option key={state} value={state}>{stateLabels[state]}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2"><Label htmlFor="pet-animation">Animación</Label>
                            <select id="pet-animation" className={selectClass} value={settings.animation} onChange={event => update('animation', event.target.value as PetSettings['animation'])}>
                                <option value="off">Apagada</option><option value="contextual">Contextual</option><option value="continuous">Continua</option>
                            </select>
                        </div>
                        <div className="space-y-2"><Label htmlFor="pet-speed">Velocidad</Label>
                            <Input id="pet-speed" type="number" min={0.25} max={2} step={0.25} value={settings.speed} onChange={event => update('speed', Number(event.target.value))} />
                        </div>
                    </div>
                    {(['antenna', 'floorShadow', 'interactive', 'alertReactions'] as const).map(key => <div key={key} className="flex items-center justify-between gap-4">
                        <Label htmlFor={`pet-${key}`}>{key === 'antenna' ? 'Antena' : key === 'floorShadow' ? 'Sombra' : key === 'interactive' ? 'Seguir el cursor en toda la página' : 'Reaccionar a avisos críticos'}</Label>
                        <Switch id={`pet-${key}`} checked={settings[key]} onCheckedChange={value => update(key, value)} />
                    </div>)}
                    <p className="text-xs text-muted-foreground">La animación contextual es breve y mantiene reposo estático. La continua consume más recursos. Se respeta el movimiento reducido. El estado de prueba no se guarda.</p>
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <Button variant="outline" disabled={saving} onClick={() => setSettings({ ...DEFAULT_PET_SETTINGS, pixyOrganizationId: settings.pixyOrganizationId })}><RotateCcw className="mr-2 h-4 w-4" />Restaurar defaults</Button>
                <Button disabled={saving || !available} onClick={save}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Guardar mascota</Button>
            </div>
            <p className="text-xs text-muted-foreground">Los cambios se aplican al recargar las sesiones abiertas. Al desactivar la mascota queda un botón simple de ayuda.</p>
        </CardContent>
    </Card>
}

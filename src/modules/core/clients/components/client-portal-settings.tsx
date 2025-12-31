
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LayoutGrid, Loader2, Settings2 } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

interface ClientPortalSettingsProps {
    client: any
    onUpdate?: () => void
}

export function ClientPortalSettings({ client, onUpdate }: ClientPortalSettingsProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Parse existing settings
    const settings = client.portal_insights_settings || { override: null, access_level: 'NONE' }

    // State
    const [overrideMode, setOverrideMode] = useState<string>(
        settings.override === true ? 'force_enable' :
            settings.override === false ? 'force_disable' : 'auto'
    )
    const [accessLevel, setAccessLevel] = useState<string>(settings.access_level || 'ALL')

    const handleSave = async () => {
        setLoading(true)
        try {
            // Construct JSON
            let newSettings: any = { access_level: accessLevel }

            if (overrideMode === 'auto') {
                newSettings.override = null
            } else if (overrideMode === 'force_enable') {
                newSettings.override = true
            } else if (overrideMode === 'force_disable') {
                newSettings.override = false
            }

            const { error } = await supabase
                .from('clients')
                .update({ portal_insights_settings: newSettings })
                .eq('id', client.id)

            if (error) throw error

            toast.success("Configuración de portal actualizada")
            if (onUpdate) onUpdate()
            setOpen(false)

        } catch (error) {
            console.error(error)
            toast.error("Error al guardar configuración")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-purple-600 hover:bg-purple-50" title="Configurar Portal">
                    <Settings2 className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Configuración del Portal</DialogTitle>
                    <DialogDescription>
                        Controla el acceso y visibilidad de módulos para este cliente.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* INSIGHTS CONFIGURATION */}
                    <div className="space-y-4 border p-4 rounded-xl bg-gray-50/50">
                        <div className="flex items-center gap-2 mb-2">
                            <LayoutGrid className="h-4 w-4 text-purple-600" />
                            <h4 className="font-semibold text-sm">Visibilidad de Insights</h4>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Modo de Activación</Label>
                                <Select value={overrideMode} onValueChange={setOverrideMode}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">🤖 Automático (Según Servicios)</SelectItem>
                                        <SelectItem value="force_enable">✅ Forzar ACTIVADO</SelectItem>
                                        <SelectItem value="force_disable">🚫 Forzar DESACTIVADO</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Show Access Level ONLY if not disabled */}
                            {overrideMode !== 'force_disable' && (
                                <div className="space-y-1 animate-in slide-in-from-top-2 fade-in">
                                    <Label className="text-xs text-gray-500">
                                        {overrideMode === 'auto' ? 'Nivel de Acceso (Si se activa)' : 'Nivel de Acceso Forzado'}
                                    </Label>
                                    <Select value={accessLevel} onValueChange={setAccessLevel}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">Todo (Ads + Orgánico)</SelectItem>
                                            <SelectItem value="ADS">Solo Ads</SelectItem>
                                            <SelectItem value="ORGANIC">Solo Orgánico</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-gray-400 leading-tight pt-1">
                                        Determina qué pestañas verá el cliente cuando tenga acceso.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar Configuración"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

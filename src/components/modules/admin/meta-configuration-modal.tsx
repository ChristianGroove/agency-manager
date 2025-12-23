
"use client"

import { useState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Settings, Eye, CheckCircle2 } from "lucide-react"
import { getMetaConfig, saveMetaConfig } from "@/app/actions/admin-integrations"
import { InsightsTab } from "@/components/modules/portal/insights/insights-tab"
import { toast } from "sonner"

interface MetaConfigurationModalProps {
    client: any
    services: any[]
}

export function MetaConfigurationModal({ client, services }: MetaConfigurationModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const [config, setConfig] = useState<any>(null)
    const [activeTab, setActiveTab] = useState("connection")

    useEffect(() => {
        if (open) {
            loadConfig()
        }
    }, [open])

    const loadConfig = async () => {
        setLoading(true)
        const { config, error } = await getMetaConfig(client.id)
        if (config) {
            setConfig(config)
        }
        setLoading(false)
    }

    const handleSave = async (formData: FormData) => {
        const result = await saveMetaConfig(client.id, formData)
        if (result.success) {
            toast.success("Configuración guardada correctamente")
            loadConfig()
        } else {
            toast.error(result.error || "Error al guardar")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Settings className="w-4 h-4" />
                    Configurar Meta
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Integración Meta Insights</DialogTitle>
                    <DialogDescription>
                        Configura la conexión con Meta y gestiona la visibilidad de los datos para {client.name}.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="connection">Conexión</TabsTrigger>
                        <TabsTrigger value="settings">Ajustes</TabsTrigger>
                        <TabsTrigger value="preview">Vista Previa</TabsTrigger>
                    </TabsList>

                    <TabsContent value="connection" className="mt-4 space-y-4">
                        {loading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                        ) : (
                            <form action={handleSave} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="access_token">Access Token (System User)</Label>
                                    <Input
                                        id="access_token"
                                        name="access_token"
                                        type="password"
                                        defaultValue={config?.access_token}
                                        placeholder="EAA..."
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">Token de larga duración del System User con permisos ads_read y insights.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="ad_account_id">Ad Account ID</Label>
                                        <Input
                                            id="ad_account_id"
                                            name="ad_account_id"
                                            defaultValue={config?.ad_account_id}
                                            placeholder="act_123456789"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="page_id">Page ID</Label>
                                        <Input
                                            id="page_id"
                                            name="page_id"
                                            defaultValue={config?.page_id}
                                            placeholder="123456789"
                                        />
                                    </div>
                                </div>

                                <input type="hidden" name="show_ads" value={config?.settings?.show_ads ?? true} />
                                <input type="hidden" name="show_social" value={config?.settings?.show_social ?? true} />

                                <div className="pt-4 flex justify-between">
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" onClick={async () => {
                                            const res = await fetch('/api/integrations/meta/sync', {
                                                method: 'POST',
                                                body: JSON.stringify({ clientId: client.id })
                                            })
                                            const data = await res.json()

                                            if (res.ok) {
                                                if (data.errors && data.errors.length > 0) {
                                                    console.error("Sync errors:", data.errors)
                                                    const msg = data.errors[0].error || "Error desconocido"
                                                    toast.error(`Error: ${msg}`)
                                                } else if (data.processed === 0) {
                                                    toast.warning("No hay configuración activa para sincronizar. Asegúrate de guardar la configuración primero.")
                                                } else {
                                                    toast.success("Conexión exitosa. Datos sincronizados.")
                                                }
                                            } else {
                                                toast.error("Error de servidor al conectar")
                                            }
                                        }}>
                                            Probar Conexión
                                        </Button>
                                        <SubmitButton />
                                    </div>
                                </div>
                            </form>
                        )}
                    </TabsContent>

                    <TabsContent value="settings" className="mt-4 space-y-6">
                        {loading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                        ) : (
                            <form action={handleSave} className="space-y-6">
                                {/* Hidden fields to preserve connection data */}
                                <input type="hidden" name="access_token" value={config?.access_token || ''} />
                                <input type="hidden" name="ad_account_id" value={config?.ad_account_id || ''} />
                                <input type="hidden" name="page_id" value={config?.page_id || ''} />

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Meta Ads</Label>
                                            <p className="text-sm text-muted-foreground">Mostrar dashboard de publicidad.</p>
                                        </div>
                                        <Switch name="show_ads" defaultChecked={config?.settings?.show_ads ?? true} value="true" />
                                    </div>
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Meta Social</Label>
                                            <p className="text-sm text-muted-foreground">Mostrar dashboard orgánico (redes sociales).</p>
                                        </div>
                                        <Switch name="show_social" defaultChecked={config?.settings?.show_social ?? true} value="true" />
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <SubmitButton label="Guardar Ajustes" />
                                </div>
                            </form>
                        )}
                    </TabsContent>

                    <TabsContent value="preview" className="mt-4">
                        <Card className="bg-gray-50 border-dashed">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                                    <Eye className="w-4 h-4" />
                                    Vista previa del cliente
                                </div>
                                {/* We reuse the specific InsightsTab component */}
                                {/* Note: We might need to mock the Portal Context or Props if it depends on them heavily. */}
                                {/* Providing client and services as is. */}
                                <InsightsTab client={client} services={services} token={client.portal_short_token || client.portal_token} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}

function SubmitButton({ label = "Guardar Configuración" }: { label?: string }) {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {label}
        </Button>
    )
}

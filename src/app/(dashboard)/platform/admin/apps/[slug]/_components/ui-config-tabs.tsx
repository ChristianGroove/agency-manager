'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Loader2, Languages, ShieldCheck, Save } from 'lucide-react'
import { toast } from 'sonner'
import { 
    DynamicSpaceConfig, 
    CAPABILITY_PRESETS, 
    UICapability 
} from '@/modules/core/organizations/capabilities-registry'
import { updateAppUIConfig } from '@/modules/core/saas/app-management-actions'
import { useRouter } from 'next/navigation'

interface UIConfigTabsProps {
    appId: string
    currentConfig?: DynamicSpaceConfig
    category?: string
}

export function UIConfigTabs({ appId, currentConfig, category = 'agency' }: UIConfigTabsProps) {
    const router = useRouter()
    const [isSaving, setIsSaving] = useState(false)
    
    // Initialize config with deep merges from presets if missing
    const defaultConfig = CAPABILITY_PRESETS[category] || CAPABILITY_PRESETS.agency
    
    const [config, setConfig] = useState<DynamicSpaceConfig>({
        terminology: currentConfig?.terminology || defaultConfig.terminology,
        policies: currentConfig?.policies || defaultConfig.policies,
        management: currentConfig?.management || defaultConfig.management,
        rules: currentConfig?.rules || defaultConfig.rules,
        capabilities: currentConfig?.capabilities || defaultConfig.capabilities
    })

    const handleTerminologyChange = (key: keyof typeof config.terminology, value: string) => {
        setConfig(prev => ({
            ...prev,
            terminology: {
                ...prev.terminology,
                [key]: value
            }
        }))
    }

    const toggleCapability = (capability: UICapability) => {
        setConfig(prev => {
            const isEnabled = prev.capabilities.includes(capability)
            const newCapabilities = isEnabled 
                ? prev.capabilities.filter(c => c !== capability)
                : [...prev.capabilities, capability]
            
            return {
                ...prev,
                capabilities: newCapabilities
            }
        })
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const result = await updateAppUIConfig(appId, config)
            if (result.success) {
                toast.success('Configuración UI guardada', {
                    description: 'Los cambios de terminología y capacidades se aplicarán a todos los tenants de este Space.'
                })
                router.refresh()
            } else {
                toast.error('Error al guardar', { description: result.error })
            }
        } catch (error: any) {
            toast.error('Error crítico', { description: error.message })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Card className="border-brand-pink/20 shadow-xl shadow-brand-pink/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-xl">Configuración del Motor UI</CardTitle>
                    <CardDescription>Define el vocabulario y las funciones visuales de este Space.</CardDescription>
                </div>
                <Button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="bg-brand-pink hover:bg-brand-pink/90 text-white"
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Guardar Cambios
                </Button>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="terminology" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="terminology" className="flex items-center gap-2">
                            <Languages className="h-4 w-4" />
                            Diccionario (Vocabulario)
                        </TabsTrigger>
                        <TabsTrigger value="capabilities" className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            Capacidades (Funciones)
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="terminology" className="space-y-6 animate-in fade-in-50 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label>Nombre del Cliente (Singular)</Label>
                                    <Input 
                                        value={config.terminology.client} 
                                        onChange={(e) => handleTerminologyChange('client', e.target.value)}
                                        placeholder="Ej: Cliente, Paciente, Comensal"
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">Se usará en {`{client}`}</p>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Nombre del Cliente (Plural)</Label>
                                    <Input 
                                        value={config.terminology.clients} 
                                        onChange={(e) => handleTerminologyChange('clients', e.target.value)}
                                        placeholder="Ej: Clientes, Pacientes, Comensales"
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">Se usará en {`{clients}`}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label>Nombre del Proyecto/Entidad</Label>
                                    <Input 
                                        value={config.terminology.project} 
                                        onChange={(e) => handleTerminologyChange('project', e.target.value)}
                                        placeholder="Ej: Proyecto, Tratamiento, Reserva"
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">Se usará en {`{project}`}</p>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Nombre de la Venta/Acción</Label>
                                    <Input 
                                        value={config.terminology.sale} 
                                        onChange={(e) => handleTerminologyChange('sale', e.target.value)}
                                        placeholder="Ej: Venta, Pedido, Servicio"
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">Se usará en {`{sale}`}</p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="capabilities" className="space-y-6 animate-in fade-in-50 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                            {[
                                { id: 'crm.core', label: 'CRM Core (Visualización básica)', desc: 'Activa la gestión de contactos base.' },
                                { id: 'crm.advanced', label: 'CRM Avanzado (Marketing/Tags)', desc: 'Activa segmentación y campañas.' },
                                { id: 'crm.quotes', label: 'Modulo de Cotizaciones', desc: 'Muestra generador de PDFs y propuestas.' },
                                { id: 'billing.management', label: 'Gestión de Facturación', desc: 'Muestra historial de pagos y facturas.' },
                                { id: 'automation.engine', label: 'Motor de Automatización', desc: 'Habilita workflows dinámicos.' },
                                { id: 'hosting.management', label: 'Panel de Hosting Web', desc: 'Activa visibilidad de cuentas de servidor.' },
                                { id: 'whitelabel.branding', label: 'Marca Blanca Directa', desc: 'Permite al tenant subir su propio logo.' }
                            ].map((cap) => (
                                <div key={cap.id} className="flex items-center justify-between space-x-4 p-3 rounded-lg border border-transparent hover:border-brand-pink/10 hover:bg-brand-pink/5 transition-all">
                                    <div className="flex flex-col space-y-1">
                                        <Label className="text-sm font-semibold">{cap.label}</Label>
                                        <p className="text-xs text-muted-foreground">{cap.desc}</p>
                                    </div>
                                    <Switch 
                                        checked={config.capabilities.includes(cap.id as UICapability)}
                                        onCheckedChange={() => toggleCapability(cap.id as UICapability)}
                                    />
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}

"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Shield, CreditCard, Variable } from "lucide-react"
import { toast } from "sonner"
import { getTenantConfig, updateOrganizationConfig } from "@/modules/core/organizations/admin-actions"

interface TenantConfigurationSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    organizationId: string
    organizationName: string
}

// Capabilities that we want to expose clearly
const KNOWN_CAPABILITIES = [
    { key: 'CAN_CUSTOMIZE_IDENTITY', label: 'Personalizar Identidad', desc: 'Subir logo, colores y favicon.' },
    { key: 'CAN_CUSTOMIZE_PORTAL', label: 'Personalizar Portal', desc: 'Login page propio y eliminación de marca Pixy.' },
    { key: 'CAN_CUSTOMIZE_DOMAIN', label: 'Dominio Personalizado', desc: 'Usar dominio propio (CNAME).' },
    { key: 'CAN_VIEW_CRM', label: 'Acceso a CRM', desc: 'Módulo de gestión de leads y pipelines.' },
    { key: 'CAN_VIEW_INBOX', label: 'Acceso a Inbox', desc: 'Bandeja de entrada unificada.' }
]

export function TenantConfigurationSheet({ open, onOpenChange, organizationId, organizationName }: TenantConfigurationSheetProps) {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    // State
    const [allowDirectBilling, setAllowDirectBilling] = useState(false)
    const [capabilities, setCapabilities] = useState<Record<string, boolean>>({})

    useEffect(() => {
        if (open && organizationId) {
            loadConfig()
        }
    }, [open, organizationId])

    const loadConfig = async () => {
        setLoading(true)
        try {
            const data = await getTenantConfig(organizationId)
            if (data) {
                setAllowDirectBilling(data.allow_direct_billing ?? true) // Default true if null
                setCapabilities(data.capabilities || {})
            }
        } catch (error) {
            toast.error("Error cargando configuración")
        } finally {
            setLoading(false)
        }
    }

    const handleCapabilityChange = (key: string, checked: boolean) => {
        setCapabilities(prev => ({
            ...prev,
            [key]: checked
        }))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const result = await updateOrganizationConfig(organizationId, {
                allow_direct_billing: allowDirectBilling,
                capabilities: capabilities
            })

            if (result.success) {
                toast.success("Configuración actualizada")
                onOpenChange(false)
            } else {
                toast.error(result.error || "Error al guardar")
            }
        } catch (error) {
            toast.error("Error inesperado")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle>Configuración de Tenant</SheetTitle>
                    <SheetDescription>
                        Ajustes avanzados para {organizationName}
                    </SheetDescription>
                </SheetHeader>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <Tabs defaultValue="billing" className="mt-6">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="billing">Facturación</TabsTrigger>
                            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
                        </TabsList>

                        {/* TAB: BILLING */}
                        <TabsContent value="billing" className="space-y-6 py-4">
                            <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg bg-muted/20">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="h-4 w-4 text-gray-500" />
                                        <Label htmlFor="direct-billing" className="text-base font-medium">Compras Directas</Label>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Si está activo, el cliente verá los precios y opciones de upgrade de Pixy.
                                        <br />Si está inactivo, el cliente deberá contactar a la agencia.
                                    </p>
                                </div>
                                <Switch
                                    id="direct-billing"
                                    checked={allowDirectBilling}
                                    onCheckedChange={setAllowDirectBilling}
                                />
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                                <strong>Nota:</strong> Al desactivar esto, asegúrate de tener configurado tu propio sistema de cobro o pricing manual para este cliente.
                            </div>
                        </TabsContent>

                        {/* TAB: CAPABILITIES */}
                        <TabsContent value="capabilities" className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                            <div className="text-sm text-muted-foreground mb-4">
                                Estas opciones sobrescriben las funcionalidades base del Tier asignado.
                            </div>

                            {KNOWN_CAPABILITIES.map((cap) => (
                                <div key={cap.key} className="flex items-start space-x-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
                                    <Checkbox
                                        id={cap.key}
                                        checked={capabilities[cap.key] === true}
                                        onCheckedChange={(checked) => handleCapabilityChange(cap.key, checked as boolean)}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <label
                                            htmlFor={cap.key}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            {cap.label}
                                        </label>
                                        <p className="text-xs text-muted-foreground">
                                            {cap.desc}
                                            <span className="ml-2 font-mono text-[10px] text-gray-400">({cap.key})</span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </TabsContent>
                    </Tabs>
                )}

                <SheetFooter className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving || loading}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Configuración
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}

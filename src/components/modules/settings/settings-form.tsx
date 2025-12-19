"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { updateSettings } from "@/lib/actions/settings"
import { Loader2, Save, CreditCard, FileText, Building2, Globe } from "lucide-react"

export function SettingsForm({ initialSettings }: { initialSettings: any }) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState(initialSettings || {})

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData((prev: any) => ({ ...prev, [name]: value }))
    }

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [name]: value }))
    }

    const handleSwitchChange = (name: string, checked: boolean) => {
        setFormData((prev: any) => ({ ...prev, [name]: checked }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const result = await updateSettings(formData)
            if (result.error) {
                alert("Error al guardar: " + result.error)
            } else {
                alert("Configuración guardada correctamente")
                router.refresh()
            }
        } catch (error) {
            console.error(error)
            alert("Ocurrió un error inesperado")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Configuración</h2>
                    <p className="text-muted-foreground">Administra los datos de tu agencia y preferencias globales.</p>
                </div>
                <Button onClick={handleSubmit} disabled={isLoading} className="bg-brand-pink hover:bg-brand-pink/90">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Cambios
                </Button>
            </div>

            <Tabs defaultValue="agency" className="w-full">
                <TabsList className="grid w-full grid-cols-4 max-w-[600px]">
                    <TabsTrigger value="agency" className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Agencia</TabsTrigger>
                    <TabsTrigger value="general" className="flex items-center gap-2"><Globe className="h-4 w-4" /> General</TabsTrigger>
                    <TabsTrigger value="billing" className="flex items-center gap-2"><FileText className="h-4 w-4" /> Facturación</TabsTrigger>
                    <TabsTrigger value="payments" className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Pagos</TabsTrigger>
                </TabsList>

                {/* AGENCY TAB */}
                <TabsContent value="agency" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Identidad de la Agencia</CardTitle>
                            <CardDescription>
                                Estos datos aparecerán en tus facturas, cotizaciones y portal de clientes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="agency_name">Nombre Comercial</Label>
                                    <Input id="agency_name" name="agency_name" value={formData.agency_name || ''} onChange={handleChange} placeholder="Ej: Pixy Agency" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="agency_legal_name">Razón Social</Label>
                                    <Input id="agency_legal_name" name="agency_legal_name" value={formData.agency_legal_name || ''} onChange={handleChange} placeholder="Ej: Pixy S.A.S." />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="agency_email">Email Principal</Label>
                                    <Input id="agency_email" name="agency_email" value={formData.agency_email || ''} onChange={handleChange} placeholder="contacto@pixy.com" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="agency_phone">Teléfono / WhatsApp</Label>
                                    <Input id="agency_phone" name="agency_phone" value={formData.agency_phone || ''} onChange={handleChange} placeholder="+57 300 123 4567" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="agency_website">Sitio Web</Label>
                                    <Input id="agency_website" name="agency_website" value={formData.agency_website || ''} onChange={handleChange} placeholder="https://pixy.com" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="agency_logo_url">URL del Logo</Label>
                                    <Input id="agency_logo_url" name="agency_logo_url" value={formData.agency_logo_url || ''} onChange={handleChange} placeholder="/branding/logo.svg" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="agency_country">País</Label>
                                    <Input id="agency_country" name="agency_country" value={formData.agency_country || ''} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="agency_currency">Moneda Base</Label>
                                    <Select name="agency_currency" value={formData.agency_currency || 'COP'} onValueChange={(val) => handleSelectChange('agency_currency', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="COP">COP (Peso Colombiano)</SelectItem>
                                            <SelectItem value="USD">USD (Dólar Americano)</SelectItem>
                                            <SelectItem value="EUR">EUR (Euro)</SelectItem>
                                            <SelectItem value="MXN">MXN (Peso Mexicano)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="agency_timezone">Zona Horaria</Label>
                                    <Input id="agency_timezone" name="agency_timezone" value={formData.agency_timezone || ''} onChange={handleChange} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* GENERAL TAB */}
                <TabsContent value="general" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración Regional y Legal</CardTitle>
                            <CardDescription>
                                Define los formatos y textos legales predeterminados.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="default_language">Idioma de la App</Label>
                                    <Select name="default_language" value={formData.default_language || 'es'} onValueChange={(val) => handleSelectChange('default_language', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="es">Español</SelectItem>
                                            <SelectItem value="en">English</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="portal_language">Idioma del Portal</Label>
                                    <Select name="portal_language" value={formData.portal_language || 'es'} onValueChange={(val) => handleSelectChange('portal_language', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="es">Español</SelectItem>
                                            <SelectItem value="en">English</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="date_format">Formato de Fecha</Label>
                                    <Select name="date_format" value={formData.date_format || 'DD/MM/YYYY'} onValueChange={(val) => handleSelectChange('date_format', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
                                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
                                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="currency_format">Formato de Moneda</Label>
                                    <Select name="currency_format" value={formData.currency_format || 'es-CO'} onValueChange={(val) => handleSelectChange('currency_format', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="es-CO">Colombia ($ 1.000.000)</SelectItem>
                                            <SelectItem value="en-US">USA ($1,000,000.00)</SelectItem>
                                            <SelectItem value="es-MX">México ($ 1,000,000.00)</SelectItem>
                                            <SelectItem value="de-DE">Europa (1.000.000,00 €)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="legal_text">Texto Legal Predeterminado</Label>
                                <Textarea
                                    id="legal_text"
                                    name="legal_text"
                                    value={formData.legal_text || ''}
                                    onChange={handleChange}
                                    placeholder="Términos y condiciones que aparecerán en el pie de página de facturas y cotizaciones..."
                                    className="min-h-[100px]"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* BILLING TAB */}
                <TabsContent value="billing" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración de Facturación</CardTitle>
                            <CardDescription>
                                Controla cómo se generan las nuevas facturas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="invoice_prefix">Prefijo de Facturas</Label>
                                    <Input id="invoice_prefix" name="invoice_prefix" value={formData.invoice_prefix || 'INV-'} onChange={handleChange} placeholder="INV-" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="default_due_days">Días de Vencimiento (Default)</Label>
                                    <Input type="number" id="default_due_days" name="default_due_days" value={formData.default_due_days || 30} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="default_tax_name">Nombre del Impuesto</Label>
                                    <Input id="default_tax_name" name="default_tax_name" value={formData.default_tax_name || 'IVA'} onChange={handleChange} placeholder="IVA" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="default_tax_rate">Tasa de Impuesto (%)</Label>
                                    <Input type="number" id="default_tax_rate" name="default_tax_rate" value={formData.default_tax_rate || 0} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invoice_legal_text">Pie de Página de Factura (Legal)</Label>
                                <Textarea
                                    id="invoice_legal_text"
                                    name="invoice_legal_text"
                                    value={formData.invoice_legal_text || ''}
                                    onChange={handleChange}
                                    placeholder="Texto legal específico para facturas (ej: Resolución DIAN...)"
                                    className="min-h-[100px]"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* PAYMENTS TAB */}
                <TabsContent value="payments" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Control de Pagos en Línea</CardTitle>
                            <CardDescription>
                                Configura el comportamiento del portal de pagos y la integración con Wompi.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/20">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Habilitar Pagos en el Portal</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Si se desactiva, los clientes verán sus facturas pero no podrán pagar en línea.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.enable_portal_payments !== false}
                                        onCheckedChange={(checked) => handleSwitchChange('enable_portal_payments', checked)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Permitir Pago Múltiple</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Permite a los clientes seleccionar y pagar varias facturas en una sola transacción.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.enable_multi_invoice_payment !== false}
                                        onCheckedChange={(checked) => handleSwitchChange('enable_multi_invoice_payment', checked)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="min_payment_amount">Monto Mínimo de Pago</Label>
                                <Input type="number" id="min_payment_amount" name="min_payment_amount" value={formData.min_payment_amount || 0} onChange={handleChange} />
                                <p className="text-xs text-muted-foreground">Los pagos inferiores a este monto no permitirán checkout en línea.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="payment_pre_message">Mensaje Pre-Pago</Label>
                                    <Textarea
                                        id="payment_pre_message"
                                        name="payment_pre_message"
                                        value={formData.payment_pre_message || ''}
                                        onChange={handleChange}
                                        placeholder="Mensaje que verá el cliente antes de pagar (ej: Instrucciones adicionales)"
                                        className="min-h-[80px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="payment_success_message">Mensaje Post-Pago</Label>
                                    <Textarea
                                        id="payment_success_message"
                                        name="payment_success_message"
                                        value={formData.payment_success_message || ''}
                                        onChange={handleChange}
                                        placeholder="Mensaje de agradecimiento tras un pago exitoso"
                                        className="min-h-[80px]"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-indigo-100 bg-indigo-50/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-indigo-700">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                Estado de Integración Wompi
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-semibold text-gray-500">Ambiente:</span>
                                    <p className="font-medium">{formData.wompi_environment || 'Sandbox'}</p>
                                </div>
                                <div>
                                    <span className="font-semibold text-gray-500">Última Sincronización:</span>
                                    <p className="font-medium">{formData.wompi_last_sync ? new Date(formData.wompi_last_sync).toLocaleString() : 'N/A'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-500 mt-2">
                                        * La configuración de llaves API se maneja a través de variables de entorno por seguridad.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

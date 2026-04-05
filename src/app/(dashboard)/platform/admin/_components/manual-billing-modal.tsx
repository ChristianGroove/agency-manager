"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
    createManualPlatformInvoiceAction as createManualPlatformInvoice, 
    sendPlatformInvoiceEmailAction as sendPlatformInvoiceEmail, 
    getPlatformPaymentMethodsAction as getPlatformPaymentMethods,
    manualActivateSubscriptionAction as manualActivateSubscription 
} from "@/modules/features/billing/billing-actions"
import { getOrganizationBillingProfile } from "@/modules/core/organizations/actions"
import { generatePlatformInvoicePDF } from "@/lib/platform-pdf-generator"
import { toast } from "sonner"
import { Receipt, CheckCircle2, Loader2, Eye, Building2, ShieldCheck, Copy, Percent } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const formSchema = z.object({
    amount: z.coerce.number().min(1, "El monto debe ser mayor a 0"),
    currency: z.string().default("USD"),
    billingPeriodStart: z.string().min(1, "Requerido"),
    billingPeriodEnd: z.string().min(1, "Requerido"),
    recipientEmail: z.string().email("Email inválido"),
    notes: z.string().default(""),
    autoActivate: z.boolean().default(true),
    // Legal fields
    clientTaxId: z.string().optional(),
    clientAddress: z.string().optional(),
    clientLegalName: z.string().optional(),
    // Tax fields
    includeTax: z.boolean().default(false),
    taxRate: z.coerce.number().default(19),
})

type FormValues = z.infer<typeof formSchema>

interface ManualBillingModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    organizationId: string
    organizationName: string
    initialData?: any
}

export function ManualBillingModal({
    isOpen,
    onOpenChange,
    organizationId,
    organizationName,
    initialData
}: ManualBillingModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isPreviewing, setIsPreviewing] = useState(false)
    const [paymentMethods, setPaymentMethods] = useState<any[]>([])
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        toast.success("Copiado al portapapeles")
        setTimeout(() => setCopiedId(null), 2000)
    }

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            amount: 29,
            currency: "USD",
            billingPeriodStart: new Date().toISOString().split('T')[0],
            billingPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
            recipientEmail: "",
            notes: "",
            autoActivate: true,
            clientLegalName: "",
            includeTax: false,
            taxRate: 19,
        },
    })

    // Pre-fill if initialData (Renewal) is provided
    useEffect(() => {
        if (isOpen && initialData) {
            const amount = initialData.amount_subtotal || initialData.amount || 29
            const taxRate = initialData.tax_rate || 19
            
            // Calculate next period
            let nextStart = new Date().toISOString().split('T')[0]
            let nextEnd = new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
            
            if (initialData.billing_period_end) {
                const prevEnd = new Date(initialData.billing_period_end)
                // New start is Day after previous end
                const startDate = new Date(prevEnd)
                startDate.setDate(startDate.getDate() + 1)
                nextStart = startDate.toISOString().split('T')[0]
                
                // New end is 1 month after new start
                const endDate = new Date(startDate)
                endDate.setMonth(endDate.getMonth() + 1)
                nextEnd = endDate.toISOString().split('T')[0]
            }

            form.reset({
                amount: amount,
                currency: initialData.currency || "USD",
                billingPeriodStart: nextStart,
                billingPeriodEnd: nextEnd,
                recipientEmail: initialData.recipient_email || "",
                notes: initialData.notes || "",
                autoActivate: true,
                clientLegalName: initialData.client_legal_name || "",
                clientTaxId: initialData.client_tax_id || "",
                clientAddress: initialData.client_address || "",
                includeTax: initialData.include_tax || false,
                taxRate: taxRate,
            })
        }
    }, [isOpen, initialData, form])

    useEffect(() => {
        if (isOpen && organizationId && !initialData) {
            const loadData = async () => {
                const [profile, methods] = await Promise.all([
                    getOrganizationBillingProfile(organizationId),
                    getPlatformPaymentMethods()
                ])
                
                if (profile) {
                    form.setValue("clientTaxId", profile.tax_id || "")
                    form.setValue("clientAddress", profile.address || "")
                    form.setValue("clientLegalName", profile.legal_name || "")
                }
                setPaymentMethods(methods)
            }
            loadData()
        }
    }, [isOpen, organizationId, form])

    const handlePreview = async () => {
        setIsPreviewing(true)
        try {
            const values = form.getValues()
            
            // Calculate taxes for preview
            const amount = Number(values.amount)
            const taxRate = values.includeTax ? values.taxRate : 0
            const taxAmount = values.includeTax ? (amount * (taxRate / 100)) : 0
            const total = amount + taxAmount

            const pdfBlob = await generatePlatformInvoicePDF({
                invoice_number: "PIXY-PREVIEW",
                organization_name: organizationName,
                amount: total,
                currency: values.currency,
                billing_period: `${values.billingPeriodStart} - ${values.billingPeriodEnd}`,
                issue_date: new Date(),
                client_tax_id: values.clientTaxId,
                client_address: values.clientAddress,
                client_legal_name: values.clientLegalName,
                include_tax: values.includeTax,
                tax_rate: taxRate,
                tax_amount: taxAmount,
                amount_subtotal: amount,
                payment_methods: paymentMethods
            })
            
            const url = URL.createObjectURL(pdfBlob)
            window.open(url, '_blank')
        } catch (error) {
            toast.error("No se pudo generar la previsualización")
        } finally {
            setIsPreviewing(false)
        }
    }

    const onSubmit = async (values: FormValues) => {
        setIsSubmitting(true)
        let createdInvoice = null;
        
        try {
            // STEP 1: Calculate Taxes & Create Invoice
            const amount = Number(values.amount)
            const taxRate = values.includeTax ? values.taxRate : 0
            const taxAmount = values.includeTax ? (amount * (taxRate / 100)) : 0
            const total = amount + taxAmount

            const result = await createManualPlatformInvoice({
                organizationId,
                amount: total,
                currency: values.currency,
                billingPeriodStart: values.billingPeriodStart,
                billingPeriodEnd: values.billingPeriodEnd,
                notes: values.notes,
                clientTaxId: values.clientTaxId,
                clientAddress: values.clientAddress,
                clientLegalName: values.clientLegalName,
                includeTax: values.includeTax,
                taxRate: values.taxRate,
                taxAmount: taxAmount,
                amountSubtotal: amount,
                recipientEmail: values.recipientEmail
            })

            if (!result?.success || !result?.invoice) {
                // Now we get a descriptive error from the server instead of a generic render error
                throw new Error(result?.error || "La creación del documento falló en el servidor");
            }

            createdInvoice = result.invoice;
            toast.success(`Documento ${createdInvoice.invoice_number} creado correctamente`);

            // STEP 2: Send Email (Safe & Non-blocking)
            const emailResult = await sendPlatformInvoiceEmail(createdInvoice.id, values.recipientEmail);
            if (emailResult.success) {
                toast.success("Correo enviado al cliente");
            } else {
                // Here we show the REAL error (Resend config, domain unverified, etc.)
                toast.warning(`Factura creada (#${createdInvoice.invoice_number}) pero el correo falló: ${emailResult.error}`);
            }

            // STEP 3: Auto-Activation
            if (values.autoActivate) {
                const activationResult = await manualActivateSubscription(organizationId, { expiryDate: values.billingPeriodEnd });
                if (activationResult.success) {
                    toast.success("Vigencia de suscripción actualizada");
                } else {
                    toast.error(`Error al activar suscripción: ${activationResult.error}`);
                }
            }

            // SUCCESS EXIT (even if non-critical steps like email failed, the main document is safe)
            onOpenChange(false);
            form.reset();

        } catch (error: any) {
            console.error("Submission error:", error);
            // This now catches only network errors or true unexpected crashes, NOT application errors
            toast.error(error.message || "No se pudo procesar la solicitud. Verifica tu conexión.");
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-pink-500" />
                        Cobro de Plataforma - Pixy Spaces
                    </DialogTitle>
                    <DialogDescription>
                        Genera una cuenta de cobro legal para <strong>{organizationName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit as any)} className="flex flex-col">
                        <ScrollArea className="max-h-[65vh] px-6 py-2">
                            <div className="space-y-6 pb-6 mt-2">
                                {/* Basic Data */}
                                <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-end">
                                            <FormLabel className="text-sm font-semibold">
                                                {form.watch('includeTax') ? 'Monto Subtotal' : 'Monto'}
                                            </FormLabel>
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                {new Intl.NumberFormat('es-CO', { 
                                                    style: 'currency', 
                                                    currency: form.watch('currency'),
                                                    maximumFractionDigits: 0 
                                                }).format(Number(String(field.value).replace(/[^\d]/g, '')) || 0)}
                                            </span>
                                        </div>
                                        <FormControl>
                                            <Input 
                                                type="text" 
                                                placeholder="Ej: 1.000.000"
                                                className="bg-gray-50/50 font-mono"
                                                {...field}
                                                onChange={(e) => {
                                                    // Only allow digits, dots and commas during typing
                                                    const rawValue = e.target.value;
                                                    // Clean it for the form state: remove all non-numeric characters
                                                    // This ensures 1.000.000 becomes 1000000
                                                    const cleanValue = rawValue.replace(/[^\d]/g, '');
                                                    field.onChange(cleanValue === '' ? 0 : Number(cleanValue));
                                                }}
                                                value={field.value === 0 ? '' : field.value}
                                            />
                                        </FormControl>
                                        <FormDescription className="text-[10px] leading-tight">
                                            Escribe solo números. Evita usar puntos para decimales si es COP.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                                    <FormField
                                        control={form.control as any}
                                        name="currency"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm font-semibold">Moneda</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-gray-50/50">
                                                            <SelectValue placeholder="USD" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="USD">USD - Dólares</SelectItem>
                                                        <SelectItem value="COP">COP - Pesos Col.</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Tax Section */}
                                <div className="p-4 bg-gray-50/80 rounded-xl border border-dashed border-gray-200 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-sm font-bold flex items-center gap-2 text-slate-700">
                                                <Percent className="h-4 w-4 text-blue-500" />
                                                Incluir Impuestos (IVA)
                                            </FormLabel>
                                            <p className="text-[10px] text-muted-foreground">Activa para desglosar IVA en el PDF y cobro.</p>
                                        </div>
                                        <FormField
                                            control={form.control as any}
                                            name="includeTax"
                                            render={({ field }) => (
                                                <Switch 
                                                    checked={field.value} 
                                                    onCheckedChange={field.onChange}
                                                    className="data-[state=checked]:bg-blue-600"
                                                />
                                            )}
                                        />
                                    </div>

                                    {form.watch('includeTax') && (
                                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                                            <FormField
                                                control={form.control as any}
                                                name="taxRate"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[11px] font-semibold text-slate-600 uppercase tracking-tighter">Porcentaje (%)</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <Input 
                                                                    type="number" 
                                                                    className="bg-white pr-8 h-8 text-sm" 
                                                                    {...field} 
                                                                />
                                                                <span className="absolute right-2.5 top-1.5 text-[11px] font-bold text-slate-400">%</span>
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="flex flex-col justify-center gap-1">
                                                <div className="flex justify-between text-[11px] text-slate-500">
                                                    <span>Base:</span>
                                                    <span className="font-mono">
                                                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: form.watch('currency'), maximumFractionDigits: 0 }).format(form.watch('amount'))}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-[11px] text-blue-600 font-bold">
                                                    <span>IVA ({form.watch('taxRate')}%):</span>
                                                    <span className="font-mono">
                                                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: form.watch('currency'), maximumFractionDigits: 0 }).format(form.watch('amount') * (form.watch('taxRate') / 100))}
                                                    </span>
                                                </div>
                                                <Separator className="my-1" />
                                                <div className="flex justify-between text-[13px] text-slate-900 font-black">
                                                    <span>TOTAL:</span>
                                                    <span className="font-mono">
                                                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: form.watch('currency'), maximumFractionDigits: 0 }).format(form.watch('amount') * (1 + (form.watch('taxRate') / 100)))}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* Billing Profile Section */}
                                <div className="bg-brand-pink/5 p-5 rounded-2xl border border-brand-pink/10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-brand-pink/80 flex items-center gap-2 uppercase tracking-tight">
                                            <Building2 className="h-4 w-4" /> Datos de Facturación del Cliente
                                        </h4>
                                        <Badge variant="outline" className="text-[10px] font-normal border-brand-pink/20 text-brand-pink/60 bg-white">PERSISTENTE</Badge>
                                    </div>
                                    
                                    <FormField
                                        control={form.control as any}
                                        name="clientLegalName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[11px] font-medium text-gray-500">Razón Social / Nombre Legal</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Empresa S.A.S" className="h-9 bg-white text-sm" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control as any}
                                            name="clientTaxId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[11px] font-medium text-gray-500">NIT / Documento</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="900.123.456-1" className="h-9 bg-white text-sm" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control as any}
                                            name="clientAddress"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[11px] font-medium text-gray-500">Dirección</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Calle 10 #2-3" className="h-9 bg-white text-sm" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <p className="text-[10px] text-brand-pink/60 italic leading-tight">
                                        * Estos datos se actualizarán en el perfil de la organización automáticamente.
                                    </p>
                                </div>

                                <Separator className="opacity-50" />

                                {/* Communication & Period */}
                                <div className="space-y-4">
                                    <FormField
                                        control={form.control as any}
                                        name="recipientEmail"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold">Email de Envío</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="admin@empresa.com" className="bg-gray-50/50" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control as any}
                                            name="billingPeriodStart"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-semibold">Inicio Periodo</FormLabel>
                                                    <FormControl>
                                                        <Input type="date" {...field} className="bg-gray-50/50" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control as any}
                                            name="billingPeriodEnd"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-semibold">Fin Periodo</FormLabel>
                                                    <FormControl>
                                                        <Input type="date" {...field} className="bg-gray-50/50" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control as any}
                                        name="notes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold">Notas adicionales</FormLabel>
                                                <FormControl>
                                                    <Textarea 
                                                        placeholder="Opcional: Detalles adicionales que aparecerán en la factura" 
                                                        className="resize-none min-h-[100px] bg-gray-50/50"
                                                        {...field} 
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {paymentMethods.length > 0 && (
                                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 space-y-2">
                                        <h4 className="text-xs font-bold text-blue-700 flex items-center gap-1">
                                            <ShieldCheck className="h-3 w-3" />
                                            SE INCLUIRÁN MÉTODOS DE PAGO:
                                        </h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {paymentMethods.map((m) => (
                                                <div key={m.id} className="flex items-center justify-between p-2 bg-blue-100/50 rounded-md border border-blue-200 group">
                                                    <div className="text-[10px] text-blue-700 flex items-center gap-2 overflow-hidden">
                                                        <div className="h-1 w-1 bg-blue-400 rounded-full shrink-0" />
                                                        <div className="truncate">
                                                            <strong className="font-bold">{m.title}:</strong> {m.instructions || ''} {Object.values(m.details || {}).join(' ')}
                                                        </div>
                                                    </div>
                                                    {m.details?.account_number && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-100"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleCopy(m.details.account_number, m.id);
                                                            }}
                                                        >
                                                            {copiedId === m.id ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[9px] text-blue-500 italic mt-1">
                                            * Estos métodos se configuran globalmente en Pixy Agency.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        <DialogFooter className="p-6 bg-gray-50/50 border-t flex flex-col gap-3 sm:flex-row sm:justify-between items-center shrink-0">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={handlePreview}
                                disabled={isPreviewing || isSubmitting}
                                className="w-full sm:w-auto gap-2"
                            >
                                {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                                Previsualizar PDF
                            </Button>
                            
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    onClick={() => onOpenChange(false)}
                                    disabled={isSubmitting}
                                    className="flex-1 sm:flex-none"
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none gap-2">
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-4 w-4" />
                                            Generar y Activar
                                        </>
                                    )}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

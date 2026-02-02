"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard, Calendar, Check, Package, Zap, History, Download, ExternalLink } from "lucide-react"
import { SaasApp } from "@/modules/core/saas/app-management-actions"
import { createSubscriptionPaymentTransaction, getSubscriptionHistory } from "@/modules/core/billing/billing-actions"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { es } from "date-fns/locale"
import { format } from "date-fns"

interface SubscriptionSettingsTabProps {
    app: SaasApp | null | undefined
    allowDirectBilling?: boolean
}

// Declare global Wompi widget type
declare global {
    interface Window {
        WidgetCheckout: any
    }
}

export function SubscriptionSettingsTab({ app, allowDirectBilling }: SubscriptionSettingsTabProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [history, setHistory] = useState<any[]>([])

    // Load history on mount
    useEffect(() => {
        if (app && allowDirectBilling) {
            getSubscriptionHistory().then(setHistory)
        }
    }, [app, allowDirectBilling])

    const handlePay = async () => {
        setIsLoading(true)
        try {
            const result = await createSubscriptionPaymentTransaction() as any // Cast to any to avoid TS issues with dynamic signature

            if (!result.success) {
                toast.error("Error al iniciar la transacción")
                setIsLoading(false)
                return
            }

            console.log('[Wompi Settings] Initializing:', result)

            if (!window.WidgetCheckout) {
                toast.error("El sistema de pagos está cargando. Intenta de nuevo en unos segundos.")
                setIsLoading(false)
                return
            }

            const checkout = new window.WidgetCheckout({
                currency: result.currency,
                amountInCents: result.amountInCents,
                reference: result.reference,
                publicKey: result.publicKey,
                ...(result.signature ? { signature: { integrity: result.signature } } : {})
            })

            checkout.open((res: any) => {
                const transaction = res.transaction
                if (transaction.status === 'APPROVED') {
                    toast.success("¡Pago recibido correctamente!")
                    // Refresh history immediately
                    getSubscriptionHistory().then(setHistory)
                    // Double check in 2 seconds to ensure DB propagation
                    setTimeout(() => getSubscriptionHistory().then(setHistory), 2000)
                } else if (transaction.status === 'ERROR') {
                    toast.error("Error en la transacción: " + transaction.status_message)
                }
                setIsLoading(false)
            })

        } catch (error: any) {
            toast.error("Error inesperado: " + error.message)
            setIsLoading(false)
        }
    }

    if (!app) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Plan Actual</CardTitle>
                    <CardDescription>
                        Información sobre tu suscripción y plan actual.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center py-10">
                    <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">Sin Plan Activo</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                        Tu organización no tiene un plan asociado actualmente. Contacta a soporte para activar una suscripción.
                    </p>
                </CardContent>
            </Card>
        )
    }

    const rawPrice = app.price_monthly // || app.price if schema varies
    const priceValue = rawPrice ? Number(rawPrice) : 0

    const price = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
    }).format(isNaN(priceValue) ? 0 : priceValue)

    return (
        <div className="space-y-8">
            {/* Wompi Script */}
            <script src="https://checkout.wompi.co/widget.js" async></script>

            {/* Current Plan Card */}
            <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-2xl flex items-center gap-3">
                                {app.name}
                                <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">
                                    Activo
                                </Badge>
                            </CardTitle>
                            <CardDescription className="mt-2 text-base">
                                {app.description}
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-primary">
                                {price}
                                <span className="text-sm font-normal text-muted-foreground ml-1">/ mes</span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1 flex items-center justify-end gap-1">
                                <Calendar className="h-3 w-3" />
                                Renovación mensual
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-primary/10">
                        <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-500" />
                                Incluido en tu plan
                            </h4>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" />
                                    Acceso completo al módulo de {app.category === 'vertical' ? 'Vertical' : 'Agencia'}
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" />
                                    Soporte técnico prioritario
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" />
                                    Actualizaciones automáticas
                                </li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <div className="rounded-lg bg-background p-4 border shadow-sm">
                                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Estado de Facturación</h4>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                                        <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-green-700 dark:text-green-400">Al día</div>
                                        <div className="text-xs text-muted-foreground">Suscripción activa</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {allowDirectBilling ? (
                                    <Button className="w-full bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md transition-all hover:scale-[1.02]" onClick={handlePay} disabled={isLoading}>
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                                        Pagar Suscripción
                                    </Button>
                                ) : (
                                    <Button className="w-full" variant="secondary" disabled title="Gestionado por tu agencia">
                                        Gestionado por Agencia
                                    </Button>
                                )}
                            </div>
                            {!allowDirectBilling && (
                                <p className="text-xs text-center text-muted-foreground">
                                    La facturación de esta cuenta es gestionada por su proveedor de servicios.
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Payment History Table */}
            {allowDirectBilling && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <History className="h-5 w-5" />
                            Historial de Pagos
                        </h3>
                        {history.length > 0 && <Badge variant="outline">{history.length} pagos registrados</Badge>}
                    </div>

                    {history.length > 0 ? (
                        <div className="border rounded-lg divide-y bg-white dark:bg-white/5 dark:divide-white/10">
                            {history.map((tx) => (
                                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                                            <Check className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{tx.metadata?.concept || 'Pago de Suscripción'}</div>
                                            <div className="text-xs text-muted-foreground flex gap-2">
                                                <span>{format(new Date(tx.created_at), 'PPP', { locale: es })}</span>
                                                <span>•</span>
                                                <span className="font-mono">{tx.reference.split('-').slice(-1)[0]}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold">${(tx.amount_in_cents / 100).toLocaleString()} {tx.currency}</div>
                                        <div className="flex justify-end mt-1">
                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-green-600 border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
                                                APROBADO
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Card className="p-8 text-center border-dashed bg-muted/30">
                            <div className="mx-auto w-10 h-10 bg-muted rounded-full flex items-center justify-center mb-3">
                                <History className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <h4 className="font-medium text-sm">No hay pagos registrados</h4>
                            <p className="text-xs text-muted-foreground mt-1">Tus transacciones aprobadas aparecerán aquí.</p>
                        </Card>
                    )}
                </div>
            )}
        </div>
    )
}

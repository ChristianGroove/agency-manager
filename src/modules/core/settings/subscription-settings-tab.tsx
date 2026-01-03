"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard, Calendar, Check, Package, Zap } from "lucide-react"
import { SaasApp } from "@/modules/core/saas/app-management-actions"

interface SubscriptionSettingsTabProps {
    app: SaasApp | null
}

export function SubscriptionSettingsTab({ app }: SubscriptionSettingsTabProps) {
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

    const price = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
    }).format(Number(app.price_monthly))

    return (
        <div className="space-y-6">
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
                            {/* We could list features here if we had them structured in the DB differently.
                                For now, we can show generic info or metadata if available. */}
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" />
                                    Acceso completo al módulo {app.category}
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
                                        <div className="text-xs text-muted-foreground">Próximo cobro: --/--/----</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button variant="outline" className="w-full">
                                    Ver Facturas
                                </Button>
                                <Button className="w-full">
                                    Gestionar Pago
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Additional Options (Future expansion) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Placeholder for upgrades or addons */}
            </div>
        </div>
    )
}

"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ShieldCheck, Lock, Activity, AlertTriangle } from "lucide-react"

export function SecurityCenter() {
    return (
        <Card className="border-none shadow-none bg-transparent">
            <div className="mb-6">
                <h2 className="text-lg font-semibold tracking-tight">Centro de Seguridad</h2>
                <p className="text-sm text-muted-foreground">Monitoreo de seguridad, auditoría y políticas globales.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Firewall (Rate Limit)</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Activo</div>
                        <p className="text-xs text-muted-foreground">Global policy enforcement</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Intentos Bloqueados</CardTitle>
                        <Lock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">Últimas 24 horas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Alertas de Sistema</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">Requieren atención</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        <CardTitle>Auditoría Global</CardTitle>
                    </div>
                    <CardDescription>
                        Registro de todas las acciones administrativas críticas en el sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                        <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p>Los logs detallados de seguridad se están indexando...</p>
                    </div>
                </CardContent>
            </Card>
        </Card>
    )
}

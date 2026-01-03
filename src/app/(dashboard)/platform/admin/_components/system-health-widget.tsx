"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Bell, CheckCircle2, AlertTriangle, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ActiveBroadcastsList } from "./active-broadcasts-list"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { CreateBroadcastDialog } from "./create-broadcast-dialog"

interface SystemHealthWidgetProps {
    alerts: any[]
}

export function SystemHealthWidget({ alerts }: SystemHealthWidgetProps) {
    const isHealthy = alerts.length === 0

    return (
        <Card className="h-full border-l-4 border-l-transparent data-[status=healthy]:border-l-green-500 data-[status=warning]:border-l-amber-500 shadow-sm" data-status={isHealthy ? 'healthy' : 'warning'}>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between bg-gray-50/50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Estado del Sistema
                </CardTitle>
                <div className="flex items-center gap-2">
                    {/* Integrated Create Action */}
                    <CreateBroadcastDialog
                        trigger={
                            <Button variant="ghost" size="sm" className="h-7 text-xs px-2 hover:bg-white hover:text-indigo-600">
                                <Plus className="h-3 w-3 mr-1" />
                                Nueva Alerta
                            </Button>
                        }
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {/* Status Indicator Area */}
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`
                            h-10 w-10 rounded-full flex items-center justify-center
                            ${isHealthy ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}
                        `}>
                            {isHealthy ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-gray-900">
                                {isHealthy ? 'Sistemas Operativos' : 'Atención Requerida'}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                {isHealthy
                                    ? 'Base de datos, API y Auth funcionando correctamente.'
                                    : `${alerts.length} alertas activas afectando a usuarios.`
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {/* Active Alerts List (collapsible logic conceptually, usually scrollable here) */}
                {alerts.length > 0 && (
                    <div className="px-4 pb-4">
                        <h5 className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-1">
                            <Bell className="h-3 w-3" /> Difusiones Activas
                        </h5>
                        <ActiveBroadcastsList alerts={alerts} compact={true} />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

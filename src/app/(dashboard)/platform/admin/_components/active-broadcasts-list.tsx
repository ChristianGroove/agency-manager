"use client"

import { stopBroadcast } from "@/app/actions/admin-dashboard-actions"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { CreateBroadcastDialog } from "./create-broadcast-dialog"

interface ActiveBroadcastsListProps {
    alerts: any[]
}

export function ActiveBroadcastsList({ alerts }: ActiveBroadcastsListProps) {
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})

    const handleStop = async (id: string) => {
        if (!confirm("¿Detener esta difusión? Dejará de ser visible para los usuarios.")) return

        setLoadingMap(prev => ({ ...prev, [id]: true }))
        try {
            await stopBroadcast(id)
            toast.success("Difusión detenida")
        } catch (error: any) {
            toast.error("Error: " + error.message)
        } finally {
            setLoadingMap(prev => ({ ...prev, [id]: false }))
        }
    }

    return (
        <div className="space-y-4">
            {alerts.map((alert: any) => (
                <div key={alert.id} className={`relative group p-3 rounded border text-sm ${alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
                        alert.severity === 'warning' ? 'bg-amber-50 border-amber-200' :
                            'bg-blue-50 border-blue-200'
                    }`}>
                    <div className="font-semibold flex items-center justify-between mb-1">
                        {alert.title}
                        <span className="text-[10px] uppercase border px-1 rounded bg-white/50">{alert.severity}</span>
                    </div>
                    <p className="opacity-90 text-xs mb-2">
                        {alert.message}
                    </p>
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] opacity-75">
                            Expira: {new Date(alert.expires_at).toLocaleString()}
                        </p>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleStop(alert.id)}
                            disabled={loadingMap[alert.id]}
                        >
                            {loadingMap[alert.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                    </div>
                </div>
            ))}
            {alerts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    No hay difusiones activas
                </div>
            )}
            <div className="pt-2">
                <CreateBroadcastDialog />
            </div>
        </div>
    )
}

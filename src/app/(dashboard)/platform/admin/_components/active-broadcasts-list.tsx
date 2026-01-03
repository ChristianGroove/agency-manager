"use client"

import { stopBroadcast } from "@/modules/core/admin/actions"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { CreateBroadcastDialog } from "./create-broadcast-dialog"

interface ActiveBroadcastsListProps {
    alerts: any[]
    compact?: boolean
}

export function ActiveBroadcastsList({ alerts, compact = false }: ActiveBroadcastsListProps) {
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
        <div className="space-y-3">
            {alerts.map((alert: any) => (
                <div key={alert.id} className={`relative group p-3 rounded-lg border text-sm transition-all duration-200 hover:shadow-sm ${alert.severity === 'critical' ? 'bg-red-50 border-red-100 text-red-900' :
                    alert.severity === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-900' :
                        'bg-blue-50 border-blue-100 text-blue-900'
                    }`}>
                    <div className="font-semibold flex items-center justify-between mb-0.5">
                        <span className="truncate pr-2">{alert.title}</span>
                        {!compact && (
                            <span className="text-[10px] uppercase border px-1 rounded bg-white/50">{alert.severity}</span>
                        )}
                    </div>
                    {!compact && (
                        <p className="opacity-90 text-xs mb-2 line-clamp-2">
                            {alert.message}
                        </p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] opacity-75">
                            Expira: {new Date(alert.expires_at).toLocaleDateString()}
                        </p>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 -mr-1 text-muted-foreground/60 hover:text-destructive hover:bg-white/50"
                            onClick={() => handleStop(alert.id)}
                            disabled={loadingMap[alert.id]}
                            title="Detener Difusión"
                        >
                            {loadingMap[alert.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                    </div>
                </div>
            ))}
            {alerts.length === 0 && !compact && (
                <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg bg-gray-50/50">
                    No hay difusiones activas
                </div>
            )}
        </div>
    )
}

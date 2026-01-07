"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit2, ExternalLink, Clock, CheckCircle2 } from "lucide-react"
import { Connection, deleteConnection } from "@/modules/core/integrations/actions"
import { IntegrationProvider } from "./integration-card"
import { toast } from "sonner"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface ConnectionManagementSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    provider: IntegrationProvider | null
    connections: Connection[]
    onEdit?: (connection: Connection) => void
}

export function ConnectionManagementSheet({ open, onOpenChange, provider, connections, onEdit }: ConnectionManagementSheetProps) {
    const router = useRouter()
    const [deletingId, setDeletingId] = useState<string | null>(null)

    if (!provider) return null

    const providerConnections = connections.filter(c => c.provider_key === provider.key)

    const handleDelete = async (connectionId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta conexión? Esta acción no se puede deshacer.')) return

        setDeletingId(connectionId)
        try {
            const result = await deleteConnection(connectionId)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Conexión eliminada')
                router.refresh()
            }
        } catch (e) {
            toast.error('Error al eliminar conexión')
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#0A0A0A] border-white/10 text-white sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <provider.icon className="h-5 w-5" />
                        Gestionar {provider.name}
                    </DialogTitle>
                    <DialogDescription>
                        {providerConnections.length} conexión(es) activa(s)
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
                    {providerConnections.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No hay conexiones configuradas para este proveedor.
                        </div>
                    ) : (
                        providerConnections.map((conn) => (
                            <div
                                key={conn.id}
                                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/[0.07] transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-white truncate">
                                                {conn.connection_name}
                                            </span>
                                            <Badge
                                                variant={conn.status === 'active' ? 'default' : 'secondary'}
                                                className={conn.status === 'active'
                                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                                    : 'bg-zinc-500/20 text-zinc-400'
                                                }
                                            >
                                                {conn.status === 'active' ? (
                                                    <><CheckCircle2 className="h-3 w-3 mr-1" /> Activo</>
                                                ) : conn.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {conn.last_synced_at
                                                    ? new Date(conn.last_synced_at).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                    : 'Nunca sincronizado'
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {onEdit && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10"
                                                onClick={() => onEdit(conn)}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                                            onClick={() => handleDelete(conn.id)}
                                            disabled={deletingId === conn.id}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 hover:bg-white/5">
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

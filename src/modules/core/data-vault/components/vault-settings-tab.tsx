
"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Loader2, Shield, HardDrive, Download, Trash2, RefreshCcw, Lock } from "lucide-react"
import { createSnapshot, deleteSnapshot, restoreSnapshot, updateVaultConfig } from "../actions"
import { DataSnapshot } from "../types"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { CalendarClock } from "lucide-react"

export function VaultSettingsTab({ snapshots: initialSnapshots, initialConfig }: {
    snapshots: DataSnapshot[]
    initialConfig: { enabled: boolean, frequency: 'daily' | 'weekly' | 'monthly' }
}) {
    const [snapshots, setSnapshots] = useState(initialSnapshots)
    const [config, setConfig] = useState(initialConfig)
    const [isCreating, startCreation] = useTransition()
    const [isDeleting, startDeletion] = useTransition()
    const [isConfiguring, startConfiguring] = useTransition()

    // Config Handlers
    const handleConfigChange = (changes: Partial<typeof config>) => {
        const newConfig = { ...config, ...changes }
        setConfig(newConfig) // Optimistic

        startConfiguring(async () => {
            await updateVaultConfig(newConfig)
            toast.success("Configuración de backup actualizada")
        })
    }

    const handleCreateSnapshot = () => {
        const name = `Backup ${new Date().toLocaleDateString()}`
        startCreation(async () => {
            const result = await createSnapshot(name)
            if (result.success) {
                toast.success("Backup iniciado exitosamente")
                // In a real app we'd reload or subscribe to changes. 
                // For now, we wait for revalidatePath from server action to refresh page data if passing props from server page,
                // but since we are client component we might need router.refresh() if passing initial data.
                // Assuming parent refreshes or we Optimistically update?
                // Actually server action revalidatePath refreshes server components, but we need to see it.
                window.location.reload()
            } else {
                toast.error("Error creando backup: " + result.error)
            }
        })
    }

    const handleDelete = (id: string) => {
        if (!confirm("¿Estás seguro? Esta acción no se puede deshacer.")) return
        startDeletion(async () => {
            const res = await deleteSnapshot(id)
            if (res.success) {
                toast.success("Snapshot eliminado")
                setSnapshots(prev => prev.filter(s => s.id !== id))
            } else {
                toast.error("Error eliminando")
            }
        })
    }

    const handleRestoreDryRun = (id: string) => {
        toast.info("Validando integridad del archivo...")
        restoreSnapshot(id).then(res => {
            if (res.success) {
                toast.success(res.message)
            }
        }).catch(err => toast.error(err.message))
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                        <Shield className="h-5 w-5 text-emerald-500" />
                        Bóveda de Datos
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Gestión de snapshots y seguridad.
                    </p>
                </div>
                <Button
                    onClick={handleCreateSnapshot}
                    disabled={isCreating}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-900/20"
                >
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HardDrive className="mr-2 h-4 w-4" />}
                    Crear Backup
                </Button>
            </div>

            {/* Unified Control Center */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Main Stats Card */}
                <Card className="md:col-span-8 overflow-hidden relative border-emerald-100 dark:border-emerald-900/20 bg-gradient-to-br from-white to-emerald-50/50 dark:from-background dark:to-emerald-950/10">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Shield className="w-32 h-32 text-emerald-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <HardDrive className="h-4 w-4" /> Almacenamiento y Estado
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row gap-8 items-center">
                            {/* Storage Meter */}
                            <div className="flex-1 w-full space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Cupo Utilizado</span>
                                    <span className="font-bold font-mono">{snapshots.length} / 5</span>
                                </div>
                                <div className="h-2 w-full bg-emerald-100 dark:bg-emerald-950/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                                        style={{ width: `${(snapshots.length / 5) * 100}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    Rotación automática activa.
                                </p>
                            </div>

                            {/* Divider (Desktop) */}
                            <div className="hidden md:block w-px h-12 bg-border"></div>

                            {/* Status Info */}
                            <div className="flex-1 w-full flex justify-between md:justify-around items-center">
                                <div className="text-center">
                                    <div className="text-xs text-muted-foreground mb-1">Encriptación</div>
                                    <Badge variant="outline" className="bg-emerald-50/50 text-emerald-700 border-emerald-200 gap-1">
                                        <Lock className="h-3 w-3" /> AES-256
                                    </Badge>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs text-muted-foreground mb-1">Último Backup</div>
                                    <div className="text-sm font-medium">
                                        {snapshots[0]
                                            ? formatDistanceToNow(new Date(snapshots[0].created_at), { addSuffix: true, locale: es })
                                            : "N/A"
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Automation Card (Compact) */}
                <Card className="md:col-span-4 border-blue-100 dark:border-blue-900/30 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/10 dark:to-background">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
                            <CalendarClock className="h-4 w-4" />
                            Automatización
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="auto-backup" className="text-sm text-foreground">Backups Automáticos</Label>
                            <Switch
                                id="auto-backup"
                                checked={config.enabled}
                                onCheckedChange={(checked) => handleConfigChange({ enabled: checked })}
                                disabled={isConfiguring}
                            />
                        </div>

                        {config.enabled && (
                            <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                                <span className="text-xs text-muted-foreground ml-1">Frecuencia</span>
                                <Select
                                    value={config.frequency}
                                    onValueChange={(val: any) => handleConfigChange({ frequency: val })}
                                    disabled={isConfiguring}
                                >
                                    <SelectTrigger className="h-7 w-[110px] text-xs bg-transparent border-none shadow-none focus:ring-0 text-right">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent align="end">
                                        <SelectItem value="daily">Diaria</SelectItem>
                                        <SelectItem value="weekly">Semanal</SelectItem>
                                        <SelectItem value="monthly">Mensual</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Snapshots List (Compact) */}
            <Card>
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-medium text-sm text-muted-foreground">Historial de Puntos de Restauración</h3>
                </div>
                <div className="relative overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[40%]">Snapshot</TableHead>
                                <TableHead>Módulos</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead className="text-right">Opciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {snapshots.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground text-sm">
                                        Bóveda vacía. Crea tu primer backup para asegurar tus datos.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                snapshots.map((snap) => (
                                    <TableRow key={snap.id} className="group">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <div className="font-medium text-sm flex items-center gap-2">
                                                    {snap.name}
                                                    <StatusBadge status={snap.status} compact />
                                                </div>
                                                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{snap.id.slice(0, 8)}...</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {snap.included_modules?.length
                                                ? <Badge variant="secondary" className="text-[10px] h-5">{snap.included_modules.length} Mods</Badge>
                                                : <Badge variant="secondary" className="text-[10px] h-5">Full System</Badge>
                                            }
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(snap.created_at).toLocaleDateString()}
                                            <div className="text-[10px] opacity-70">
                                                {snap.file_size_bytes ? `${(snap.file_size_bytes / 1024).toFixed(1)} KB` : "-"}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0"
                                                    title="Validar"
                                                    onClick={() => handleRestoreDryRun(snap.id)}
                                                >
                                                    <RefreshCcw className="h-3.5 w-3.5 text-blue-500" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => handleDelete(snap.id)}
                                                    disabled={isDeleting}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    )
}

function StatusBadge({ status, compact }: { status: string, compact?: boolean }) {
    const styles = {
        pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
        processing: "bg-blue-50 text-blue-700 border-blue-200 animate-pulse",
        completed: "bg-green-50 text-green-700 border-green-200",
        failed: "bg-red-50 text-red-700 border-red-200",
        restoring: "bg-purple-50 text-purple-700 border-purple-200",
        archived: "bg-gray-50 text-gray-700 border-gray-200",
    }

    const labels: Record<string, string> = {
        pending: "Pendiente",
        processing: "Procesando",
        completed: "Listo",
        failed: "Error",
        restoring: "Restaurando",
        archived: "Archivado",
    }

    return (
        <Badge variant="outline" className={cn("border text-[10px] h-5 font-normal", styles[status as keyof typeof styles] || styles.pending)}>
            {labels[status] || status}
        </Badge>
    )
}


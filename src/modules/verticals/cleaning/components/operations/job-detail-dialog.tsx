import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CleaningJob, cancelJob } from "@/modules/verticals/cleaning/actions/job-actions"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { MapPin, User, Clock, CheckCircle, Play, FileText, Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { updateJobStatus, generateInvoiceFromJob } from "@/modules/verticals/cleaning/actions/operation-actions"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { JobForm } from "./job-form"
import { toast } from "sonner"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface JobDetailDialogProps {
    job: CleaningJob | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onUpdate: () => void
}

export function JobDetailDialog({ job, open, onOpenChange, onUpdate }: JobDetailDialogProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [showCancelAlert, setShowCancelAlert] = useState(false)

    // Reset edit mode when dialog closes or job changes
    useEffect(() => {
        if (!open) {
            setIsEditMode(false)
            setShowCancelAlert(false)
        }
    }, [open, job])

    if (!job) return null

    async function handleStatusChange(status: any) {
        setIsLoading(true)
        const res = await updateJobStatus(job!.id, status)
        if (res.success) {
            const statusText = status === 'in_progress' ? 'iniciado' : status === 'completed' ? 'completado' : 'actualizado'
            toast.success(`Trabajo ${statusText}`)
            onUpdate()
            onOpenChange(false)
        } else {
            toast.error(res.error || "Error al actualizar estado")
        }
        setIsLoading(false)
    }

    async function handleInvoice() {
        setIsLoading(true)
        const res = await generateInvoiceFromJob(job!.id)
        if (res.success && res.invoiceId) {
            toast.success("Factura creada exitosamente")
            router.push(`/invoices/${res.invoiceId}`)
        } else {
            toast.error(res.error || "Error al generar factura")
        }
        setIsLoading(false)
    }

    const handleCancelClick = () => {
        setShowCancelAlert(true)
    }

    async function confirmCancel() {
        setIsLoading(true)
        const res = await cancelJob(job!.id)
        if (res.success) {
            toast.success("Trabajo cancelado")
            onUpdate()
            onOpenChange(false)
        } else {
            toast.error("Error al cancelar")
        }
        setIsLoading(false)
        setShowCancelAlert(false)
    }

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'pending': return 'secondary'
            case 'assigned': return 'default'
            case 'in_progress': return 'destructive'
            case 'completed': return 'outline'
            case 'cancelled': return 'destructive'
            default: return 'outline'
        }
    }

    // Render Edit Form
    if (isEditMode) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Editar Trabajo</DialogTitle>
                        <DialogDescription>Modifica los detalles del servicio.</DialogDescription>
                    </DialogHeader>
                    <JobForm
                        jobToEdit={job}
                        onSuccess={() => {
                            setIsEditMode(false)
                            onUpdate()
                            // onOpenChange(false) // Optional: close or just switch back to view
                        }}
                        onCancel={() => setIsEditMode(false)}
                    />
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex justify-between items-start pr-8">
                        <div>
                            <DialogTitle className="flex items-center gap-2 mb-1">
                                {job.title}
                            </DialogTitle>
                            <Badge variant={job.status === 'completed' ? 'outline' : getStatusVariant(job.status) as any}>
                                {job.status === 'in_progress' ? 'En Curso' :
                                    job.status === 'pending' ? 'Pendiente' :
                                        job.status === 'assigned' ? 'Asignado' :
                                            job.status === 'completed' ? 'Completado' :
                                                job.status === 'cancelled' ? 'Cancelado' : job.status}
                            </Badge>
                        </div>
                        {/* Actions Top Right */}
                        {(job.status === 'pending' || job.status === 'assigned') && (
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditMode(true)}>
                                    <Pencil className="h-4 w-4 text-gray-500" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancelClick}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                            <div className="font-medium">Horario</div>
                            <div className="text-sm text-muted-foreground">
                                {format(new Date(job.start_time), "EEEE d MMMM", { locale: es })}
                                <br />
                                {format(new Date(job.start_time), "h:mm a")} - {format(new Date(job.end_time), "h:mm a")}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                            <div className="font-medium">Ubicación</div>
                            <div className="text-sm text-muted-foreground">
                                {job.location_address || "Sin dirección"}
                            </div>
                        </div>
                    </div>

                    {job.client && (
                        <div className="flex items-start gap-3">
                            <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                            <div>
                                <div className="font-medium">Cliente</div>
                                <div className="text-sm text-muted-foreground">
                                    {job.client.name}
                                </div>
                            </div>
                        </div>
                    )}

                    {job.staff ? (
                        <div className="flex items-start gap-3 bg-muted/20 p-3 rounded-md">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                {`${job.staff.first_name?.charAt(0) || ''}${job.staff.last_name?.charAt(0) || ''}`.toUpperCase()}
                            </div>
                            <div>
                                <div className="text-sm font-medium">Staff Asignado</div>
                                <div className="text-sm text-muted-foreground">{job.staff.first_name} {job.staff.last_name}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-yellow-50 text-yellow-800 p-2 rounded text-xs border border-yellow-100">
                            Sin staff asignado.
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-col gap-2 sm:gap-0">
                    <div className="flex gap-2 w-full justify-end">
                        {(job.status === 'pending' || job.status === 'assigned') && (
                            <Button onClick={() => handleStatusChange('in_progress')} disabled={isLoading}>
                                <Play className="w-4 h-4 mr-2" /> Iniciar
                            </Button>
                        )}
                        {job.status === 'in_progress' && (
                            <Button onClick={() => handleStatusChange('completed')} disabled={isLoading}>
                                <CheckCircle className="w-4 h-4 mr-2" /> Completar
                            </Button>
                        )}
                        {job.status === 'completed' && (
                            <Button onClick={handleInvoice} disabled={isLoading} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
                                <FileText className="w-4 h-4 mr-2" /> Facturar
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>

            <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción cancelará el trabajo y no se podrá revertir fácilmente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Volver</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmCancel} className="bg-red-600 hover:bg-red-700">
                            Confirmar Cancelación
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    )
}

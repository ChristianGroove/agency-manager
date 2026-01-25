"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit2, Trash2, Calendar, MapPin, User, Briefcase } from "lucide-react"
import { format } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { JobForm } from "./job-form"
import { deleteWorkOrder } from "../actions/work-order-actions"
import { toast } from "sonner"
import { WorkOrder } from "@/types"
import { useTranslation } from "@/lib/i18n/use-translation"

interface JobDetailDialogProps {
    job: WorkOrder | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onUpdate: () => void
}

export function JobDetailDialog({ job, open, onOpenChange, onUpdate }: JobDetailDialogProps) {
    const { t: originalT, locale } = useTranslation()
    const t = (key: any) => originalT(key)
    const dateLocale = locale === 'es' ? es : enUS
    const [isEditing, setIsEditing] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    if (!job) return null

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            await deleteWorkOrder(job.id)
            toast.success(t('operations.details.delete_success'))
            onUpdate()
            onOpenChange(false)
        } catch (error) {
            toast.error(t('operations.details.delete_error'))
        } finally {
            setIsDeleting(false)
        }
    }

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'pending': return 'secondary'
            case 'in_progress': return 'default'
            case 'completed': return 'outline'
            case 'cancelled': return 'destructive'
            default: return 'secondary'
        }
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            onOpenChange(val)
            if (!val) setIsEditing(false)
        }}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span>{isEditing ? t('operations.details.edit_title') : t('operations.details.title')}</span>
                        {!isEditing && (
                            <Badge variant={getStatusVariant(job.status) as any}>
                                {job.status}
                            </Badge>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {isEditing ? (
                    <JobForm
                        jobToEdit={job}
                        onSuccess={() => {
                            setIsEditing(false)
                            onUpdate()
                        }}
                        onCancel={() => setIsEditing(false)}
                    />
                ) : (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-semibold">{job.title}</h3>
                            {job.description && (
                                <p className="text-gray-500 mt-2 text-sm">{job.description}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {job.start_time && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span>
                                        {format(new Date(job.start_time), "PPP p", { locale: es })}
                                    </span>
                                </div>
                            )}
                            {job.location_address && (
                                <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    <span>{job.location_address}</span>
                                </div>
                            )}
                            {job.client && (
                                <div className="flex items-center gap-2 text-sm">
                                    <User className="h-4 w-4 text-gray-400" />
                                    <span className="font-medium">{job.client.name}</span>
                                </div>
                            )}
                            {job.service && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Briefcase className="h-4 w-4 text-gray-400" />
                                    <span>{job.service.name}</span>
                                </div>
                            )}
                        </div>

                        {job.assignee && (
                            <div className="bg-gray-50 p-3 rounded-lg flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                    {job.assignee.first_name?.[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Asignado a</p>
                                    <p className="text-sm text-gray-500">{job.assignee.first_name} {job.assignee.last_name}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between pt-4 border-t">
                            <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleDelete} disabled={isDeleting}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                            </Button>
                            <Button onClick={() => setIsEditing(true)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Editar
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

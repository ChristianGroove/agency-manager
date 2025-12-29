"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { MapPin, Clock, Calendar, CheckCircle2, Circle, AlertCircle, ChevronRight, User, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
    DrawerFooter,
    DrawerClose
} from "@/components/ui/drawer"
import { startJob, completeJob } from "@/modules/core/portal/actions"
import { toast } from "sonner"

interface Job {
    id: string
    title: string
    description: string
    start_time: string
    end_time: string
    status: string
    address_text: string
    location_type: string
    client: {
        name: string
        phone: string
        address: string
    }
}

interface WorkerPortalLayoutProps {
    staff: any
    jobs: Job[]
    settings: any
    token: string
}

export function WorkerPortalLayout({ staff, jobs: initialJobs, settings, token }: WorkerPortalLayoutProps) {
    const [jobs, setJobs] = useState<Job[]>(initialJobs)
    const [selectedJob, setSelectedJob] = useState<Job | null>(null)
    const [loadingAction, setLoadingAction] = useState(false)

    // Sort: Pending/InProgress first, then Completed/Cancelled
    const upcomingJobs = jobs.sort((a, b) => {
        const priority = { in_progress: 0, pending: 1, confirmed: 2, completed: 3, cancelled: 4 }
        return (priority[a.status as keyof typeof priority] || 99) - (priority[b.status as keyof typeof priority] || 99)
    })

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700'
            case 'in_progress': return 'bg-blue-100 text-blue-700'
            case 'cancelled': return 'bg-red-100 text-red-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    const getStatusLabel = (status: string) => {
        const labels: any = {
            pending: 'Pendiente',
            confirmed: 'Confirmado',
            in_progress: 'En Progreso',
            completed: 'Completado',
            cancelled: 'Cancelado'
        }
        return labels[status] || status
    }

    const handleStartJob = async () => {
        if (!selectedJob) return
        setLoadingAction(true)
        try {
            // Optional: Get Location
            let location = undefined
            if (navigator.geolocation) {
                try {
                    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
                    })
                    location = { lat: pos.coords.latitude, lng: pos.coords.longitude }
                } catch (e) {
                    console.log('Location access denied or timeout')
                }
            }

            const result = await startJob(token, selectedJob.id, location)
            if (result.success) {
                // Update local state
                const updatedJobs = jobs.map(j => j.id === selectedJob.id ? { ...j, status: 'in_progress' } : j)
                setJobs(updatedJobs)
                setSelectedJob(prev => prev ? { ...prev, status: 'in_progress' } : null)
                // toast.success("Trabajo iniciado")
            } else {
                alert("Error al iniciar el trabajo")
            }
        } catch (error) {
            console.error(error)
            alert("Error de conexión")
        } finally {
            setLoadingAction(false)
        }
    }

    const handleCompleteJob = async () => {
        if (!selectedJob) return
        setLoadingAction(true)
        try {
            const result = await completeJob(token, selectedJob.id)
            if (result.success) {
                const updatedJobs = jobs.map(j => j.id === selectedJob.id ? { ...j, status: 'completed' } : j)
                setJobs(updatedJobs)
                setSelectedJob(prev => prev ? { ...prev, status: 'completed' } : null)
                // toast.success("Trabajo completado")
            } else {
                alert("Error al finalizar el trabajo")
            }
        } catch (error) {
            console.error(error)
            alert("Error de conexión")
        } finally {
            setLoadingAction(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img
                        src={settings.portal_logo_url || "/branding/logo dark.svg"}
                        alt="Logo"
                        className="h-8 object-contain"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-gray-900">{staff.first_name}</p>
                        <p className="text-xs text-green-600">Activo</p>
                    </div>
                    <Avatar className="h-9 w-9 border border-gray-200">
                        <AvatarImage src={staff.avatar_url} />
                        <AvatarFallback>{staff.first_name?.[0]}</AvatarFallback>
                    </Avatar>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 max-w-md mx-auto w-full pb-20">
                <div className="mb-6 mt-2">
                    <h1 className="text-2xl font-bold text-gray-900">Mis Trabajos</h1>
                    <p className="text-gray-500">
                        {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
                    </p>
                </div>

                {upcomingJobs.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="bg-gray-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Todo listo por hoy</h3>
                        <p className="text-gray-500 mt-1">No tienes trabajos asignados pendientes.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {upcomingJobs.map((job) => (
                            <Card key={job.id}
                                className={`overflow-hidden cursor-pointer active:scale-[0.98] transition-transform ${job.status === 'in_progress' ? 'ring-2 ring-blue-500 shadow-md' : ''}`}
                                onClick={() => setSelectedJob(job)}
                            >
                                <div className={`h-1.5 w-full ${job.status === 'completed' ? 'bg-green-500' : job.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="secondary" className={getStatusColor(job.status)}>
                                            {getStatusLabel(job.status)}
                                        </Badge>
                                        <span className="text-sm font-medium text-gray-500">
                                            {format(new Date(job.start_time), 'h:mm a')}
                                        </span>
                                    </div>

                                    <h3 className="font-bold text-lg mb-1">{job.title || 'Servicio de Limpieza'}</h3>

                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{job.address_text || job.client?.address || 'Sin dirección'}</span>
                                    </div>

                                    <div className="flex items-center gap-2 pt-3 border-t">
                                        <User className="h-3.5 w-3.5 text-gray-400" />
                                        <span className="text-sm text-gray-600">{job.client?.name}</span>
                                        <ChevronRight className="h-4 w-4 text-gray-300 ml-auto" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>

            {/* Job Details Drawer */}
            <Drawer open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
                <DrawerContent>
                    <DrawerHeader className="text-left">
                        <DrawerTitle>{selectedJob?.title}</DrawerTitle>
                        <DrawerDescription>
                            {selectedJob && format(new Date(selectedJob.start_time), "EEEE, d 'de' MMMM • h:mm a", { locale: es })}
                        </DrawerDescription>
                    </DrawerHeader>

                    {selectedJob && (
                        <div className="p-4 space-y-6">
                            {/* Status */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-500">Estado</span>
                                <Badge variant="secondary" className={getStatusColor(selectedJob.status)}>
                                    {getStatusLabel(selectedJob.status)}
                                </Badge>
                            </div>

                            {/* Client Info */}
                            <div className="space-y-4">
                                <h4 className="font-medium text-gray-900 border-b pb-2">Detalles del Cliente</h4>
                                <div className="grid gap-3">
                                    <div className="flex gap-3">
                                        <User className="h-5 w-5 text-gray-400 shrink-0" />
                                        <div>
                                            <p className="font-medium">{selectedJob.client?.name}</p>
                                            <p className="text-sm text-blue-600">{selectedJob.client?.phone}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
                                        <div>
                                            <p className="font-medium">Dirección</p>
                                            <p className="text-sm text-gray-600">{selectedJob.address_text || selectedJob.client?.address}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4">
                                {selectedJob.status === 'pending' || selectedJob.status === 'confirmed' ? (
                                    <Button
                                        className="w-full text-lg h-12 bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={handleStartJob}
                                        disabled={loadingAction}
                                    >
                                        {loadingAction ? <Loader2 className="animate-spin" /> : 'Iniciar Trabajo'}
                                    </Button>
                                ) : selectedJob.status === 'in_progress' ? (
                                    <Button
                                        className="w-full text-lg h-12 bg-green-600 hover:bg-green-700 text-white"
                                        onClick={handleCompleteJob}
                                        disabled={loadingAction}
                                    >
                                        {loadingAction ? <Loader2 className="animate-spin" /> : 'Finalizar Trabajo'}
                                    </Button>
                                ) : (
                                    <Button className="w-full" variant="outline" disabled>
                                        Trabajo Completado
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    <DrawerFooter className="pt-2">
                        <DrawerClose asChild>
                            <Button variant="outline">Cerrar</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </div>
    )
}

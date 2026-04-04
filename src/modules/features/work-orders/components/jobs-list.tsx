"use client"

import { useEffect, useState } from "react"
import { WorkOrder } from "@/types"
import { getWorkOrders } from "../actions/work-order-actions"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Clock, MapPin, User, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"

export function JobsList({ viewMode = 'list' }: { viewMode?: 'list' | 'grid' }) {
    const [jobs, setJobs] = useState<WorkOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadJobs()
    }, [])

    async function loadJobs() {
        try {
            const data = await getWorkOrders()
            // Ensure we filter or handle data correctly
            setJobs(data)
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
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

    if (isLoading) {
        return <div className="p-4 text-center">Cargando trabajos...</div>
    }

    if (jobs.length === 0) {
        return (
            <div className="p-12 text-center border-2 border-dashed rounded-xl border-gray-200 bg-gray-50/50">
                <p className="text-muted-foreground">No hay trabajos asignados</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {jobs.map(job => (
                <Card key={job.id} className="p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                        <div className="bg-blue-50 p-2 rounded-full">
                            <Wrench className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900">{job.title}</h3>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                {job.start_time && (
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{format(new Date(job.start_time), "d MMM, h:mm a", { locale: es })}</span>
                                    </div>
                                )}
                                {job.location_address && (
                                    <div className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        <span className="truncate max-w-[200px]">{job.location_address}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {job.assignee && (
                            <div className="flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                                <User className="h-3 w-3" />
                                <span>{job.assignee.first_name}</span>
                            </div>
                        )}
                        <Badge variant={getStatusVariant(job.status) as any}>
                            {job.status}
                        </Badge>
                    </div>
                </Card>
            ))}
        </div>
    )
}

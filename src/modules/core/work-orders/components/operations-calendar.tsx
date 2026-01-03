"use client"

import { useEffect, useState } from "react"
import { getWorkOrders, WorkOrder } from "../actions/work-order-actions"
import { format, startOfWeek, addDays, eachDayOfInterval, isSameDay, getHours, getMinutes, differenceInMinutes, addHours } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
// Reuse the dialog we just built
import { JobDetailDialog } from "./job-detail-dialog"

export function OperationsCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [jobs, setJobs] = useState<WorkOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Dialog State
    const [selectedJob, setSelectedJob] = useState<WorkOrder | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    useEffect(() => {
        loadWeeklyJobs()
    }, [currentDate])

    async function loadWeeklyJobs() {
        setIsLoading(true)
        // Calculate start/end of the current week view
        const start = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday

        try {
            // getCleaningJobs now only takes startDate as ISO string -> Updated to object params
            const data = await getWorkOrders({ startDate: start.toISOString() })
            setJobs(data)
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekDays = eachDayOfInterval({
        start: weekStart,
        end: addDays(weekStart, 6)
    })

    // Grid Configuration
    const startHour = 8 // 8 AM
    const endHour = 19 // 7 PM
    const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
    const rowHeight = 60 // px per hour

    const getJobStyle = (job: WorkOrder) => {
        const start = new Date(job.start_time)
        const end = new Date(job.end_time)

        // Calculate position relative to startHour
        const startMinutes = (getHours(start) - startHour) * 60 + getMinutes(start)
        const top = (startMinutes / 60) * rowHeight

        const duration = differenceInMinutes(end, start)
        const height = (duration / 60) * rowHeight

        return {
            top: `${top}px`,
            height: `${height}px`,
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-gray-100 border-gray-200 text-gray-700'
            case 'assigned': return 'bg-blue-100 border-blue-200 text-blue-700'
            case 'in_progress': return 'bg-orange-100 border-orange-200 text-orange-700'
            case 'completed': return 'bg-green-100 border-green-200 text-green-700'
            default: return 'bg-gray-100'
        }
    }

    const handleJobClick = (job: WorkOrder) => {
        setSelectedJob(job)
        setDialogOpen(true)
    }

    return (
        <div className="flex flex-col h-[600px] border rounded-lg bg-white overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium capitalize">
                        {format(weekStart, 'MMMM yyyy', { locale: es })}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            <div className="flex flex-1 overflow-auto">
                {/* Time Column */}
                <div className="w-16 flex-none border-r bg-muted/5 sticky left-0 z-10">
                    <div className="h-10 border-b bg-muted/10 sticky top-0 z-20"></div> {/* Header spacer */}
                    {hours.map(hour => (
                        <div key={hour} className="h-[60px] border-b text-xs text-muted-foreground text-right pr-2 pt-2 relative">
                            <span className="-top-2.5 relative">{hour}:00</span>
                        </div>
                    ))}
                </div>

                {/* Days Columns */}
                <div className="flex flex-1 min-w-[800px]">
                    {weekDays.map(day => (
                        <div key={day.toISOString()} className="flex-1 min-w-[120px] flex flex-col border-r last:border-r-0">
                            {/* Header */}
                            <div className={cn(
                                "h-10 border-b flex items-center justify-center text-sm font-medium sticky top-0 bg-white z-10",
                                isSameDay(day, new Date()) && "bg-blue-50 text-blue-600"
                            )}>
                                {format(day, 'EEE d', { locale: es })}
                            </div>

                            {/* Grid Body */}
                            <div className="relative flex-1 bg-white">
                                {/* Grid Lines */}
                                {hours.map(hour => (
                                    <div key={hour} className="h-[60px] border-b border-dashed border-gray-100"></div>
                                ))}

                                {/* Jobs Overlay */}
                                {jobs
                                    .filter(job => isSameDay(new Date(job.start_time), day))
                                    .map(job => (
                                        <div
                                            key={job.id}
                                            onClick={() => handleJobClick(job)}
                                            className={cn(
                                                "absolute inset-x-1 rounded px-2 py-1 text-xs font-medium cursor-pointer border overflow-hidden transition-all hover:brightness-95 hover:z-10 hover:shadow-sm",
                                                getStatusColor(job.status)
                                            )}
                                            style={getJobStyle(job)}
                                        >
                                            <div className="truncate font-bold">{job.title}</div>
                                            <div className="truncate opacity-80">
                                                {format(new Date(job.start_time), 'h:mm')} - {format(new Date(job.end_time), 'h:mm')}
                                            </div>
                                            {job.client && (
                                                <div className="truncate mt-0.5 opacity-70 font-normal">
                                                    {job.client.name}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <JobDetailDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                job={selectedJob}
                onUpdate={() => loadWeeklyJobs()}
            />
        </div>
    )
}

"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle, Clock, MapPin, Search, User, CheckCircle2, XCircle, Camera, Download } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/modules/infrastructure/utils/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { StaffManagement } from './staff-management'
import { PayrollDashboard } from './payroll-dashboard'
import { Staff } from '../../actions'
import { SectionHeader } from '@/components/layout/section-header'
import { Shield, Activity, DollarSign, Filter, Calendar as CalendarIcon, Store } from 'lucide-react'
import { MagicStatCard } from '@/modules/core/dashboard/widgets/smart-cards/magic-stat-card'

interface AttendanceDashboardProps {
    logs: any[]
    staff: (Staff & { location: { name: string } | null })[]
    locations: any[]
    shifts: any[]
}

export function AttendanceDashboard({ logs: initialLogs, staff: initialStaff, locations, shifts: initialShifts }: AttendanceDashboardProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [logs, setLogs] = useState(initialLogs)
    const [filterLocationId, setFilterLocationId] = useState<string>('all')
    const [filterDate, setFilterDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

    const filteredLogs = logs.filter(log => {
        // Search Term
        const staffName = `${log.staff?.first_name || ''} ${log.staff?.last_name || ''}`.toLowerCase()
        const locationName = (log.location?.name || '').toLowerCase()
        const term = searchTerm.toLowerCase()
        const matchesSearch = staffName.includes(term) || locationName.includes(term)

        // Location Filter
        const matchesLocation = filterLocationId === 'all' || log.location_id === filterLocationId

        // Date Filter (timestamp is ISO string from DB)
        const logDate = format(new Date(log.timestamp), 'yyyy-MM-dd')
        const matchesDate = !filterDate || logDate === filterDate

        return matchesSearch && matchesLocation && matchesDate
    })

    // Group logs by Day + Staff -> Lifecycle
    const lifecycles = React.useMemo(() => {
        const groups: Record<string, any[]> = {}
        filteredLogs.forEach(log => {
            const dateStr = format(new Date(log.timestamp), 'yyyy-MM-dd')
            const key = `${log.staff_id}_${dateStr}`
            if (!groups[key]) groups[key] = []
            groups[key].push(log)
        })

        return Object.values(groups).map(dayLogs => {
            // Sort by timestamp asc so entry is first
            const sorted = dayLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            const staff = sorted[0].staff
            const dateStr = format(new Date(sorted[0].timestamp), 'yyyy-MM-dd')
            const shiftType = staff?.shift_type || 'split'

            const firstEntry = sorted.find(l => l.type === 'check_in')
            const lastExit = sorted.find(l => l.type === 'check_out')

            // Worked hours calculation (approx, naive)
            let workedHours = 0
            if (firstEntry && lastExit) {
                workedHours = (new Date(lastExit.timestamp).getTime() - new Date(firstEntry.timestamp).getTime()) / (1000 * 60 * 60)
            }

            const expectedMarks = shiftType === 'continuous' ? 2 : 4
            const isComplete = sorted.length >= expectedMarks

            return {
                id: `${staff?.id}_${dateStr}`,
                staff,
                date: new Date(sorted[0].timestamp),
                shiftType,
                logs: sorted,
                workedHours,
                isComplete,
                expectedMarks
            }
        }).sort((a, b) => b.date.getTime() - a.date.getTime())
    }, [filteredLogs])

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'check_in': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Entrada</Badge>
            case 'check_out': return <Badge className="bg-red-100 text-red-700 hover:bg-red-200">Salida</Badge>
            case 'break_start': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">Inicio Break</Badge>
            case 'break_end': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">Fin Break</Badge>
            default: return <Badge>{type}</Badge>
        }
    }

    const getFraudBadges = (fraudFlags: string[]) => {
        if (!fraudFlags || fraudFlags.length === 0) return null
        return (
            <div className="flex gap-1 flex-wrap">
                {fraudFlags.map((flag, i) => (
                    <Badge key={i} variant="destructive" className="text-[10px] uppercase font-bold px-1.5 py-0">
                        {flag.includes('out_of_geofence') ? 'GEOFENCE' :
                            flag.includes('accuracy') ? 'GPS_DEBIL' :
                                flag.includes('no_gps') ? 'SIN_GPS' : 'ALERTA'}
                    </Badge>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header Global */}
            <SectionHeader
                title="Control de Asistencia"
                subtitle="Monitorea las entradas y salidas de tu equipo en tiempo real con validación Zero-Trust."
                icon={Shield}
                action={
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="hidden md:flex rounded-xl px-6 border-dashed border-slate-300 dark:border-zinc-700">
                            <Download className="w-4 h-4 mr-2" /> Exportar CSV
                        </Button>
                    </div>
                }
            />

            <Tabs defaultValue="lifecycles" className="w-full space-y-8">
                <TabsList className="bg-white dark:bg-zinc-900 p-1 rounded-xl border border-gray-100 dark:border-white/10 h-auto">
                    <TabsTrigger value="lifecycles" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-white/10 font-bold">
                        <Activity className="w-4 h-4 mr-2" /> Turnos (Monitor)
                    </TabsTrigger>

                    <TabsTrigger value="staff" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-white/10 font-bold">
                        <User className="w-4 h-4 mr-2" /> Colaboradores
                    </TabsTrigger>

                    <TabsTrigger value="payroll" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 font-bold transition-all">
                        <DollarSign className="w-4 h-4 mr-2" /> Nómina y Extras
                    </TabsTrigger>

                    <TabsTrigger value="reports" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-white/10 font-bold">
                        <AlertTriangle className="w-4 h-4 mr-2" /> Anomalías
                    </TabsTrigger>
                </TabsList>


                <TabsContent value="lifecycles" className="space-y-6 mt-0">
                    <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-zinc-900/50 p-4 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm">
                        <div className="flex-1 relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Filtrar por nombre..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 bg-white dark:bg-zinc-900 shadow-none border-slate-200"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <Select value={filterLocationId} onValueChange={setFilterLocationId}>
                                <SelectTrigger className="w-[180px] bg-white dark:bg-zinc-900 border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                        <SelectValue placeholder="Todas las sedes" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las sedes</SelectItem>
                                    {locations.map(loc => (
                                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-slate-400" />
                            <Input
                                type="date"
                                value={filterDate}
                                onChange={e => setFilterDate(e.target.value)}
                                className="w-[160px] bg-white dark:bg-zinc-900 border-slate-200"
                            />
                        </div>
                        {(searchTerm || filterLocationId !== 'all' || filterDate !== format(new Date(), 'yyyy-MM-dd')) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setSearchTerm(''); setFilterLocationId('all'); setFilterDate(format(new Date(), 'yyyy-MM-dd')) }}
                                className="text-xs text-slate-500 hover:text-red-500 transition-colors"
                            >
                                Limpiar
                            </Button>
                        )}
                    </div>

                    {lifecycles.map(cycle => (
                        <Card key={cycle.id} className="overflow-hidden border-slate-200 dark:border-slate-800 hover:border-slate-300 transition-colors">
                            <div className={`h-1.5 w-full ${cycle.isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <div className="flex flex-col md:flex-row items-center p-4 gap-4 bg-white dark:bg-slate-950">
                                {/* Informacción Staff */}
                                <div className="flex-1 min-w-[200px]">
                                    <h4 className="font-bold text-slate-900 dark:text-white leading-tight underline decoration-indigo-500/30 underline-offset-4">
                                        {cycle.staff?.first_name} {cycle.staff?.last_name}
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                                        {format(cycle.date, "EEEE, d 'de' MMMM", { locale: es })} • <span className="capitalize">{cycle.shiftType}</span>
                                    </p>
                                </div>

                                {/* Timeline de Marcas Compacta - Distribución Equitativa y Simétrica */}
                                <div className="flex-[3] flex items-center justify-around gap-4 px-6 md:px-12 w-full overflow-visible">
                                    {cycle.logs.map((log) => (
                                        <div
                                            key={log.id}
                                            className={cn(
                                                "flex-1 flex flex-col items-center group relative max-w-[180px] min-w-[120px]",
                                                log.photo_url ? "cursor-pointer" : ""
                                            )}
                                            onClick={() => { if (log.photo_url) setSelectedPhoto(log.photo_url) }}
                                        >
                                            <div className={cn(
                                                "w-full rounded-xl overflow-hidden border transition-all shadow-sm group-hover:shadow-md group-hover:scale-[1.05] duration-200",
                                                log.photo_url ? "group-hover:ring-2 group-hover:ring-indigo-400" : "",
                                                !log.is_valid ? "ring-2 ring-red-500 ring-offset-2 dark:ring-offset-zinc-950 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "",
                                                log.type === 'check_in' ? 'bg-emerald-50/50 border-emerald-200' :
                                                    log.type === 'check_out' ? 'bg-red-50/50 border-red-200' :
                                                        log.type === 'break_start' ? 'bg-amber-50/50 border-amber-200' : 'bg-blue-50/50 border-blue-200'
                                            )}>
                                                {/* Etiqueta superior */}
                                                <div className={cn(
                                                    "py-1 px-2 text-[9px] font-black uppercase tracking-widest text-center border-b",
                                                    !log.is_valid ? 'bg-red-500 text-white border-red-600' :
                                                        log.type === 'check_in' ? 'bg-emerald-100/50 text-emerald-700 border-emerald-200' :
                                                            log.type === 'check_out' ? 'bg-red-100/50 text-red-700 border-red-200' :
                                                                log.type === 'break_start' ? 'bg-amber-100/50 text-amber-700 border-amber-200' : 'bg-blue-100/50 text-blue-700 border-blue-200'
                                                )}>
                                                    {!log.is_valid ? '⚠️ Anomalía' :
                                                        log.type === 'check_in' ? 'Entrada' : log.type === 'check_out' ? 'Salida' : log.type === 'break_start' ? 'Inic. Break' : 'Fin Break'}
                                                </div>
                                                {/* Hora principal */}
                                                <div className="py-2 text-center flex flex-col items-center">
                                                    <span className={cn(
                                                        "text-sm font-black font-mono tracking-tighter",
                                                        !log.is_valid ? 'text-red-700' :
                                                            log.type === 'check_in' ? 'text-emerald-700' :
                                                                log.type === 'check_out' ? 'text-red-700' :
                                                                    log.type === 'break_start' ? 'text-amber-700' : 'text-blue-700'
                                                    )}>
                                                        {format(new Date(log.timestamp), 'HH:mm')}
                                                    </span>
                                                    {log.distance_to_location && !log.is_valid && (
                                                        <span className="text-[8px] font-bold text-red-600 uppercase">
                                                            A {log.distance_to_location}m
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Indicador de fraude/GPS flotante enriquecido */}
                                            {!log.is_valid && (
                                                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-600 animate-pulse border-2 border-white dark:border-zinc-900 shadow-lg z-10 flex items-center justify-center">
                                                    <AlertTriangle className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Placeholders para pasos faltantes distribuidos */}
                                    {Array.from({ length: Math.max(0, cycle.expectedMarks - cycle.logs.length) }).map((_, i) => (
                                        <div key={`missing-${i}`} className="flex-1 flex flex-col items-center opacity-40 max-w-[180px] min-w-[120px]">
                                            <div className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/30 overflow-hidden">
                                                <div className="py-1 px-2 text-[9px] font-black uppercase tracking-widest text-center border-b border-dashed border-slate-300 text-slate-400">
                                                    Pendiente
                                                </div>
                                                <div className="py-2 text-center">
                                                    <span className="text-sm font-black font-mono text-slate-300 tracking-tighter">--:--</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Estadísticas */}
                                <div className="flex items-center gap-4 border-l pl-4 border-slate-100 dark:border-slate-800">
                                    <div className="text-right">
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-1">Horas</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{cycle.workedHours.toFixed(1)}h</p>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "capitalize text-[10px] px-2 py-0.5 font-black",
                                            cycle.isComplete ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                                        )}
                                    >
                                        {cycle.isComplete ? "OK" : `${cycle.logs.length}/${cycle.expectedMarks}`}
                                    </Badge>
                                </div>
                            </div>
                        </Card>
                    ))}
                    {lifecycles.length === 0 && (
                        <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 border rounded-2xl">
                            <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <h3 className="text-lg font-medium">No hay turnos registrados</h3>
                            <p className="text-sm">Las marcaciones aparecerán aquí organizadas por colaborador.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="staff">
                    <StaffManagement staff={initialStaff} locations={locations} />
                </TabsContent>

                <TabsContent value="payroll" className="space-y-6 mt-0">
                    <PayrollDashboard shifts={initialShifts} />
                </TabsContent>

                <TabsContent value="reports">
                    <div className="p-8 text-center text-slate-500">
                        <Download className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-medium">Reportes Históricos</h3>
                        <p>Los reportes avanzados y exportación Excel estarán disponibles próximamente.</p>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Modal de Previsualización de Foto (Evidencia) */}
            <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
                <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/95 border-none shadow-2xl rounded-2xl">
                    <DialogHeader className="p-4 absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent z-20 pointer-events-none">
                        <DialogTitle className="text-white flex items-center gap-2 drop-shadow-md">
                            <Camera className="w-5 h-5 font-black" /> Evidencia Asistencia
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center min-h-[500px] w-full p-4 text-white">
                        {selectedPhoto ? (
                            <img
                                src={selectedPhoto}
                                alt="Evidencia Full"
                                className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-200"
                            />
                        ) : (
                            <Activity className="w-12 h-12 animate-pulse opacity-20" />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

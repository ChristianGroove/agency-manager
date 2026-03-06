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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StaffManagement } from './staff-management'
import { Staff } from '../../actions'
import { SectionHeader } from '@/components/layout/section-header'
import { Shield } from 'lucide-react'

interface AttendanceDashboardProps {
    logs: any[]
    staff: (Staff & { location: { name: string } | null })[]
    locations: any[]
}

export function AttendanceDashboard({ logs: initialLogs, staff: initialStaff, locations }: AttendanceDashboardProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [logs, setLogs] = useState(initialLogs)

    const filteredLogs = logs.filter(log => {
        const staffName = `${log.staff?.first_name || ''} ${log.staff?.last_name || ''}`.toLowerCase()
        const locationName = (log.location?.name || '').toLowerCase()
        const term = searchTerm.toLowerCase()
        return staffName.includes(term) || locationName.includes(term)
    })

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

            <Tabs defaultValue="staff" className="w-full space-y-8">
                <TabsList className="bg-white dark:bg-zinc-900 p-1 rounded-xl border border-gray-100 dark:border-white/10 h-auto">
                    <TabsTrigger value="staff" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-white/10 font-bold">
                        <User className="w-4 h-4 mr-2" /> Colaboradores
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-white/10 font-bold">
                        <Clock className="w-4 h-4 mr-2" /> Historial
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-white/10 font-bold">
                        <AlertTriangle className="w-4 h-4 mr-2" /> Anomalías
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="logs" className="space-y-8 mt-0">

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-5 bg-white dark:bg-zinc-900/50 backdrop-blur-md border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                                    <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{logs.length}</p>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Registros Hoy</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-5 bg-white dark:bg-zinc-900/50 backdrop-blur-md border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl">
                                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-red-600 dark:text-red-500">{logs.filter(l => !l.is_valid).length}</p>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Alertas</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-5 bg-white dark:bg-zinc-900/50 backdrop-blur-md border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {new Set(logs.map(l => l.staff_id)).size} / {initialStaff.length}
                                    </p>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">En Turno</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <Card className="border-gray-100 dark:border-white/5 overflow-hidden">
                        <CardHeader className="border-b bg-slate-50/30 dark:bg-zinc-900/30 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Historial de Marcas</CardTitle>
                                    <CardDescription>Auditoría completa con validación GPS y fotográfica.</CardDescription>
                                </div>
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Buscar colaborador o sede..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="pl-9 bg-white"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="w-[80px]">Foto</TableHead>
                                        <TableHead>Colaborador</TableHead>
                                        <TableHead>Sede</TableHead>
                                        <TableHead>Acción</TableHead>
                                        <TableHead>Hora Origen (Zero-Trust)</TableHead>
                                        <TableHead>Validación GPS</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                                No hay registros de asistencia.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredLogs.map((log) => (
                                            <TableRow key={log.id} className={!log.is_valid ? "bg-red-50/50" : ""}>
                                                <TableCell>
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden border bg-slate-100 flex items-center justify-center relative group cursor-pointer">
                                                        {log.photo_url ? (
                                                            <>
                                                                <img src={log.photo_url} alt="Evidencia" className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <Search className="w-4 h-4 text-white" />
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <Camera className="w-4 h-4 text-slate-400" />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium text-slate-900">
                                                        {log.staff?.first_name} {log.staff?.last_name}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{log.staff?.role || 'Staff'}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                        {log.location?.name || 'Sede Central'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getTypeLabel(log.type)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">
                                                            {format(new Date(log.timestamp), 'h:mm a')}
                                                        </span>
                                                        <span className="text-xs text-slate-500">
                                                            {format(new Date(log.timestamp), 'dd MMM yyyy', { locale: es })}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col items-start gap-1">
                                                        {log.is_valid ? (
                                                            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                                                                <CheckCircle2 className="w-4 h-4" /> Válido
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 text-red-600 text-sm font-medium">
                                                                <AlertTriangle className="w-4 h-4" /> Irregular
                                                            </div>
                                                        )}
                                                        {getFraudBadges(log.fraud_flags)}
                                                        {log.distance_to_location !== null && log.distance_to_location !== undefined && (
                                                            <div className="text-[10px] text-slate-500 font-mono">
                                                                Distancia Sede: {log.distance_to_location}m
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="staff">
                    <StaffManagement staff={initialStaff} locations={locations} />
                </TabsContent>

                <TabsContent value="reports">
                    <div className="p-8 text-center text-slate-500">
                        <Download className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-medium">Reportes Históricos</h3>
                        <p>Los reportes avanzados y exportación Excel estarán disponibles próximamente.</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )

}

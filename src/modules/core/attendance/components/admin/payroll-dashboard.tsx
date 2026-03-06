"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Download, Search, CheckCircle2, Clock, DollarSign, Calculator } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface PayrollDashboardProps {
    shifts: any[]
}

export function PayrollDashboard({ shifts }: PayrollDashboardProps) {
    const [searchTerm, setSearchTerm] = useState('')

    const filteredShifts = shifts.filter(shift => {
        const staffName = `${shift.staff?.first_name || ''} ${shift.staff?.last_name || ''}`.toLowerCase()
        const term = searchTerm.toLowerCase()
        return staffName.includes(term)
    })

    const totalOrdinary = filteredShifts.reduce((acc, curr) => acc + (curr.ordinary_minutes || 0), 0)
    const totalExtraPending = filteredShifts.reduce((acc, curr) => acc + (curr.extra_minutes_pending || 0), 0)
    const totalExtraApproved = filteredShifts.reduce((acc, curr) => acc + (curr.extra_minutes_approved || 0), 0)

    const formatHours = (minutes: number) => {
        if (!minutes || minutes === 0) return '0h'
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        return `${h}h ${m > 0 ? m + 'm' : ''}`
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <DollarSign className="text-emerald-500 w-6 h-6" />
                        Motor de Nómina y Horas Extras
                    </h2>
                    <p className="text-slate-500 text-sm">Resumen consolidado generado por el Master Shift Controller.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar colaborador..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button variant="outline" className="shrink-0 flex items-center gap-2">
                        <Download className="w-4 h-4" /> CSV
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-5 border-emerald-100 bg-emerald-50/50 dark:bg-emerald-900/10 hover:shadow-md transition-all">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Horas Ordinarias</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white flex items-end gap-2">
                        {formatHours(totalOrdinary)}
                        <span className="text-sm font-medium text-slate-500 mb-1 font-sans font-normal">Base</span>
                    </p>
                </Card>
                <Card className="p-5 border-amber-100 bg-amber-50/50 dark:bg-amber-900/10 hover:shadow-md transition-all relative overflow-hidden">
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">Extras Generadas (Pendientes)</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white flex items-end gap-2">
                        {formatHours(totalExtraPending)}
                        <span className="text-sm font-medium text-slate-500 mb-1 font-sans font-normal">Requiere Revisión</span>
                    </p>
                </Card>
                <Card className="p-5 border-blue-100 bg-blue-50/50 dark:bg-blue-900/10 hover:shadow-md transition-all">
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-1">Extras Aprobadas</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white flex items-end gap-2">
                        {formatHours(totalExtraApproved)}
                        <span className="text-sm font-medium text-slate-500 mb-1 font-sans font-normal">Para Pago</span>
                    </p>
                </Card>
            </div>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-slate-500" /> Detalle de Turnos
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50 font-semibold">
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Colaborador</TableHead>
                                <TableHead className="text-center">T. Break</TableHead>
                                <TableHead className="text-center bg-emerald-50/50">Ordinarias</TableHead>
                                <TableHead className="text-center bg-amber-50/50">Extras</TableHead>
                                <TableHead className="text-right">Aprobación</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredShifts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                                        No hay turnos registrados que afecten nómina.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredShifts.map(shift => (
                                    <TableRow key={shift.id} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell>
                                            <div className="font-medium text-slate-900">
                                                {format(new Date(shift.date), 'dd MMM yyyy', { locale: es })}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {shift.status === 'completed' ? 'Cerrado' : 'Abierto'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{shift.staff?.first_name} {shift.staff?.last_name}</div>
                                            <div className="text-xs text-slate-400">{shift.staff?.role}</div>
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-slate-600">
                                            {formatHours(shift.total_break_minutes)}
                                        </TableCell>
                                        <TableCell className="text-center font-mono font-bold text-emerald-700 bg-emerald-50/20">
                                            {formatHours(shift.ordinary_minutes)}
                                        </TableCell>
                                        <TableCell className="text-center bg-amber-50/20">
                                            {shift.extra_minutes_pending > 0 ? (
                                                <Badge className="font-mono bg-amber-500 hover:bg-amber-600">
                                                    +{formatHours(shift.extra_minutes_pending)}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-300 font-mono">0h</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {shift.extra_minutes_pending > 0 ? (
                                                <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-8">
                                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Aprobar Extra
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Sin extras</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
    )
}

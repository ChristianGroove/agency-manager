"use client"

import React, { useMemo, useState, useEffect } from 'react'
import { MapPin, Clock, Users, ChevronRight, Activity, Smartphone, CheckCircle2, Settings, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Location } from '../actions'
import { isLocationOpenNow } from '../utils'

// Staff status for UI
export interface LocationStaffStatus {
    id: string
    name: string
    photo_url?: string
    status?: 'inside_geofence' | 'outside_geofence' | 'offline'
    role?: string
}

interface LocationCardProps {
    location: Location
    staffMembers?: LocationStaffStatus[]
    onEdit?: (loc: Location) => void
    onClick?: (loc: Location) => void
}

export function LocationCard({ location, staffMembers = [], onEdit, onClick }: LocationCardProps) {
    const [isOpen, setIsOpen] = useState(() => isLocationOpenNow(location.business_hours, location.timezone))

    useEffect(() => {
        const interval = setInterval(() => {
            setIsOpen(isLocationOpenNow(location.business_hours, location.timezone))
        }, 60000)
        return () => clearInterval(interval)
    }, [location])

    const todaySchedule = useMemo(() => {
        const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: location.timezone }).format(new Date()).toLowerCase()
        const schedule = location.business_hours?.[today as keyof typeof location.business_hours]
        if (!schedule) return 'No definido'
        if (schedule.is_closed) return 'Cerrado'
        return `${schedule.open} - ${schedule.close}`
    }, [location])

    return (
        <TooltipProvider>
            <Card
                className={cn(
                    "group relative overflow-hidden flex flex-col transition-all duration-500",
                    "bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border-slate-200/50 dark:border-white/10",
                    "hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]",
                    "hover:-translate-y-2 cursor-pointer rounded-[24px]"
                )}
                onClick={() => onClick && onClick(location)}
            >
                {/* Visual Glass Reflection Overlay */}
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

                <div className="p-6 flex-1 flex flex-col relative z-20">
                    {/* Header: Name & Status */}
                    <div className="flex justify-between items-start gap-4 mb-6">
                        <div className="space-y-1.5 min-w-0">
                            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate group-hover:text-brand-pink transition-colors">
                                {location.name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <span className="text-[13px] font-medium truncate">{location.address || 'Ubicación no establecida'}</span>
                            </div>
                        </div>

                        <Badge
                            variant={isOpen ? "outline" : "secondary"}
                            className={cn(
                                "h-7 px-3 rounded-full border-none font-bold text-[11px] uppercase tracking-wider animate-in fade-in zoom-in slide-in-from-right-2 duration-700",
                                isOpen
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20"
                                    : "bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/20"
                            )}
                        >
                            <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", isOpen ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                            {isOpen ? "En línea" : "Cerrado"}
                        </Badge>
                    </div>

                    {/* Operational Stats Grid */}
                    <div className="grid grid-cols-2 gap-2.5 mb-6">
                        <div className="bg-slate-50/50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100/50 dark:border-white/5 flex flex-col gap-1 transition-all group-hover:bg-white dark:group-hover:bg-white/10">
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                                <Clock className="w-3 h-3" /> Horarios
                            </span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                {todaySchedule}
                            </span>
                        </div>
                        <div className="bg-slate-50/50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100/50 dark:border-white/5 flex flex-col gap-1 transition-all group-hover:bg-white dark:group-hover:bg-white/10">
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                                <Smartphone className="w-3 h-3" /> Perímetro
                            </span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                {location.geofence_radius_meters}m
                            </span>
                        </div>
                    </div>

                    {/* Assigned Staff Section */}
                    <div className="space-y-3 pt-4 border-t border-slate-200/50 dark:border-white/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1 px-2 rounded-lg bg-slate-100 dark:bg-white/5 text-[10px] font-black text-slate-500 flex items-center gap-1">
                                    <Users className="w-3 h-3" /> STAFF
                                </div>
                            </div>
                            <span className="text-[11px] font-bold text-slate-400">
                                {staffMembers.length} {staffMembers.length === 1 ? 'asignado' : 'asignados'}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            {staffMembers.length > 0 ? (
                                <div className="flex -space-x-2.5 flex-1">
                                    {staffMembers.slice(0, 5).map((staff, i) => (
                                        <Tooltip key={staff.id} delayDuration={100}>
                                            <TooltipTrigger asChild>
                                                <Avatar
                                                    className={cn(
                                                        "w-11 h-11 border-none rounded-2xl shadow-sm transition-all duration-300 hover:scale-110 hover:z-20 cursor-pointer",
                                                        i === 0 ? "z-10" : "z-0"
                                                    )}
                                                >
                                                    <AvatarImage src={staff.photo_url} className="object-cover" />
                                                    <AvatarFallback className="bg-brand-pink text-white text-[10px] font-black">
                                                        {staff.name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </TooltipTrigger>
                                            <TooltipContent
                                                side="top"
                                                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200/50 dark:border-white/10 p-0 overflow-hidden shadow-2xl rounded-[20px] w-60 animate-in fade-in zoom-in duration-200"
                                            >
                                                <div className="p-4">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <Avatar className="w-12 h-12 rounded-xl border border-slate-100 dark:border-white/10 shadow-sm">
                                                            <AvatarImage src={staff.photo_url} className="object-cover" />
                                                            <AvatarFallback className="bg-brand-pink text-white text-[11px] font-black">
                                                                {staff.name.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate tracking-tight">{staff.name}</h4>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate uppercase tracking-wider">{staff.role || 'Colaborador'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/50 dark:bg-white/5 border border-slate-100/50 dark:border-white/5">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                <Activity className="w-3 h-3" /> Estado Actual
                                                            </span>
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    "text-[9px] uppercase font-black px-2 py-0 h-5 border-none rounded-lg",
                                                                    staff.status === 'inside_geofence' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                                                                        staff.status === 'outside_geofence' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                                                                            "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                                                                )}
                                                            >
                                                                {staff.status === 'inside_geofence' ? 'En Sede' :
                                                                    staff.status === 'outside_geofence' ? 'Fuera' :
                                                                        'Desconectado'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    ))}
                                    {staffMembers.length > 5 && (
                                        <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-[10px] font-black text-slate-500 z-10 transition-colors hover:bg-slate-200 dark:hover:bg-white/20">
                                            +{staffMembers.length - 5}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center gap-3 p-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/5 bg-slate-50/30 dark:bg-white/5">
                                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                        <LayoutGrid className="w-4 h-4" />
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-400">Sin personal asignado</p>
                                </div>
                            )}

                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-11 w-11 rounded-2xl text-slate-400 hover:text-brand-pink dark:hover:text-white transition-all bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 shadow-sm"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onEdit && onEdit(location)
                                }}
                            >
                                <Settings className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </TooltipProvider>
    )
}

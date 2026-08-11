"use client"

import React, { useMemo, useState, useEffect } from 'react'
import { MapPin, Clock, Users, ChevronRight, Activity, Smartphone, CheckCircle2, Settings, LayoutGrid, Trash2 } from 'lucide-react'
import { cn } from '@/modules/infrastructure/utils/utils'
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
    onDelete?: (loc: Location) => void
    onClick?: (loc: Location) => void
}

export function LocationCard({ location, staffMembers = [], onEdit, onDelete, onClick }: LocationCardProps) {
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
                    "group relative overflow-hidden flex flex-col transition-all duration-300",
                    "glass-panel bg-white/10 dark:bg-white/5 backdrop-blur-md border border-gray-200/50 dark:border-white/10",
                    "shadow-lg shadow-black/10 dark:shadow-black/20 hover:border-brand-pink/50 dark:hover:border-brand-pink/50",
                    "hover:-translate-y-1 cursor-pointer rounded-2xl"
                )}
                onClick={() => onClick && onClick(location)}
            >
                {/* Visual Glass Reflection Overlay */}
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                <div className="p-4 flex-1 flex flex-col relative z-20">
                    {/* Header: Name & Status */}
                    <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="space-y-0.5 min-w-0">
                            <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white truncate group-hover:text-brand-pink transition-all duration-300">
                                {location.name}
                            </h3>
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    <span className="text-[11px] font-bold truncate">
                                        {location.address || 'Sin dirección'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-slate-500 font-bold uppercase text-[9px] tracking-widest pl-4 opacity-70">
                                    {location.city || 'Ciudad'} • {location.state || 'Dpto'}
                                </div>
                            </div>
                        </div>

                        <Badge
                            variant={isOpen ? "outline" : "secondary"}
                            className={cn(
                                "h-6 px-2 rounded-lg border-none font-black text-[9px] uppercase tracking-tighter",
                                isOpen
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/10"
                                    : "bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/10"
                            )}
                        >
                            <div className={cn("w-1 h-1 rounded-full mr-1.5", isOpen ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                            {isOpen ? "ABIERTO" : "CERRADO"}
                        </Badge>
                    </div>

                    {/* Operational Stats Grid - More Compact */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-white/20 dark:bg-white/5 p-2 px-3 rounded-xl border border-gray-200/50 dark:border-white/5 flex flex-col gap-0.5 transition-all">
                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> TURNO HOY
                            </span>
                            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200 truncate">
                                {todaySchedule}
                            </span>
                        </div>
                        <div className="bg-white/20 dark:bg-white/5 p-2 px-3 rounded-xl border border-gray-200/50 dark:border-white/5 flex flex-col gap-0.5 transition-all">
                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                                <Smartphone className="w-2.5 h-2.5" /> GEOFENCE
                            </span>
                            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                                {location.geofence_radius_meters}m
                            </span>
                        </div>
                    </div>

                    {/* Assigned Staff Section - Compacter */}
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/5">
                        <div className="flex items-center justify-between gap-3">
                            {staffMembers.length > 0 ? (
                                <div className="flex -space-x-2 flex-1">
                                    {staffMembers.slice(0, 4).map((staff, i) => (
                                        <Tooltip key={staff.id} delayDuration={100}>
                                            <TooltipTrigger asChild>
                                                <Avatar
                                                    className={cn(
                                                        "w-8 h-8 border-2 border-white dark:border-slate-900 rounded-full shadow-sm transition-all duration-300 hover:scale-110 hover:z-20 cursor-pointer",
                                                        i === 0 ? "z-10" : "z-0"
                                                    )}
                                                >
                                                    <AvatarImage src={staff.photo_url} className="object-cover" />
                                                    <AvatarFallback className="bg-slate-200 text-slate-600 text-[8px] font-black">
                                                        {staff.name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </TooltipTrigger>
                                            <TooltipContent 
                                                side="top" 
                                                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200 dark:border-white/10 p-2 shadow-xl rounded-xl animate-in fade-in zoom-in duration-200"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight">{staff.name}</span>
                                                        <span className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">{staff.role || 'Staff'}</span>
                                                    </div>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={cn(
                                                            "text-[8px] h-4 px-1 border-none",
                                                            staff.status === 'inside_geofence' ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-slate-500"
                                                        )}
                                                    >
                                                        {staff.status === 'inside_geofence' ? 'En Sede' : 'Offline'}
                                                    </Badge>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    ))}
                                    {staffMembers.length > 4 && (
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-[8px] font-black text-slate-500 border-2 border-white dark:border-slate-900 z-10">
                                            +{staffMembers.length - 4}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest italic opacity-60">
                                    Sin personal
                                </div>
                            )}

                            <div className="flex items-center gap-1.5">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-brand-pink hover:bg-brand-pink/10 transition-all"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onEdit && onEdit(location)
                                    }}
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDelete && onDelete(location)
                                    }}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </TooltipProvider>
    )
}

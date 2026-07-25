"use client"

import React from "react"
import { User, Shield, MapPin, Calendar, CheckCircle, Star } from "lucide-react"

interface WaiterProfileViewProps {
    staff: any
    zones: any[]
    zoneAssignments: any[]
}

export function WaiterProfileView({ staff, zones, zoneAssignments }: WaiterProfileViewProps) {
    const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Mesero'
    const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

    return (
        <div className="space-y-4 pb-24">
            {/* Header Profile Card */}
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl p-6 border border-zinc-200/60 dark:border-zinc-800 shadow-sm flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-pink to-purple-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-brand-pink/20 shrink-0">
                    {initials}
                </div>
                <div className="space-y-1 min-w-0">
                    <h2 className="font-black text-lg text-zinc-900 dark:text-white truncate">
                        {fullName}
                    </h2>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 capitalize">
                            <Shield className="w-3 h-3" />
                            {staff.role || 'Mesero'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle className="w-3 h-3" />
                            Activo
                        </span>
                    </div>
                </div>
            </div>

            {/* Assigned Zones */}
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl p-5 border border-zinc-200/60 dark:border-zinc-800 shadow-sm space-y-3">
                <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-pink" />
                    Zonas Asignadas ({zoneAssignments.length})
                </h3>

                {zoneAssignments.length === 0 ? (
                    <p className="text-xs text-zinc-400">Sin zonas asignadas actualmente.</p>
                ) : (
                    <div className="space-y-2">
                        {zoneAssignments.map((assignment) => {
                            const zone = assignment.resto_zones
                            if (!zone) return null

                            return (
                                <div
                                    key={assignment.id}
                                    className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/40 dark:border-zinc-700/40"
                                >
                                    <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                                        {zone.name}
                                    </span>
                                    {assignment.is_primary && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                            Principal
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

"use client"

import React from 'react'
import { Clock, X, AlertOctagon } from 'lucide-react'
import { PortalThemeConfig } from '../types'
import { getWeeklyScheduleFormatted, evaluateStoreStatus } from '../utils/schedule-evaluator'
import { cn } from '@/modules/infrastructure/utils/utils'

export interface ScheduleModalProps {
    isOpen: boolean
    onClose: () => void
    config?: PortalThemeConfig
    isGourmet?: boolean
}

export function ScheduleModal({ isOpen, onClose, config, isGourmet }: ScheduleModalProps) {
    if (!isOpen) return null

    const weeklySchedule = getWeeklyScheduleFormatted(config)
    const storeStatus = evaluateStoreStatus(config)
    const activePrimaryColor = config?.primary_color || '#4F46E5'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div 
                className={cn(
                    "w-full max-w-md max-h-[90vh] rounded-3xl p-6 shadow-2xl relative border overflow-hidden flex flex-col space-y-4 animate-in zoom-in-95 duration-200",
                    isGourmet 
                        ? "bg-zinc-950 border-amber-500/30 text-amber-50"
                        : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-gray-900 dark:text-white"
                )}
            >
                {/* Header Ambient Glow */}
                {!isGourmet && (
                    <div 
                        className="absolute inset-x-0 top-0 h-24 pointer-events-none opacity-20 transition-opacity"
                        style={{
                            background: `linear-gradient(to bottom, ${activePrimaryColor}60 0%, ${activePrimaryColor}00 100%)`
                        }}
                    />
                )}

                {/* Top Title & Close Button */}
                <div className="flex items-center justify-between relative z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center shadow-md shrink-0",
                            isGourmet ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "bg-primary/10 text-primary"
                        )}>
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className={cn("font-black text-base leading-tight", isGourmet ? "font-serif text-amber-300" : "")}>
                                Horarios de Atención
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                                Horario semanal y turnos de apertura
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Emergency Pause Warning Banner */}
                {storeStatus.isForceClosed && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-600 dark:text-amber-400 shrink-0">
                        <AlertOctagon className="w-5 h-5 shrink-0 text-amber-500" />
                        <div>
                            <span className="font-extrabold uppercase tracking-wider block text-[10px]">PEDIDOS PAUSADOS</span>
                            <span className="opacity-90">{storeStatus.message}</span>
                        </div>
                    </div>
                )}

                {/* Schedule Items List */}
                <div className="space-y-2 max-h-[55vh] sm:max-h-[480px] overflow-y-auto pr-1 relative z-10 flex-1 scrollbar-thin">
                    {weeklySchedule.map(day => (
                        <div 
                            key={day.dayId}
                            className={cn(
                                "p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs",
                                day.isToday
                                    ? (isGourmet
                                        ? "bg-amber-500/10 border-amber-500/40 shadow-sm"
                                        : "bg-primary/5 border-primary/30 shadow-sm")
                                    : "bg-gray-50/50 dark:bg-zinc-800/40 border-gray-100 dark:border-zinc-800/60"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm min-w-[70px]">
                                    {day.dayName}
                                </span>
                                {day.isToday && (
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                                        isGourmet ? "bg-amber-500 text-zinc-950" : "bg-primary text-white"
                                    )}>
                                        Hoy
                                    </span>
                                )}
                            </div>

                            <div className="text-right">
                                {day.enabled && day.shiftsFormatted.length > 0 ? (
                                    <div className="space-y-0.5">
                                        {day.shiftsFormatted.map((shiftStr, sIdx) => (
                                            <div key={sIdx} className="font-bold text-gray-800 dark:text-zinc-200">
                                                {shiftStr}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="font-bold text-rose-500 dark:text-rose-400">
                                        Cerrado
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer button */}
                <div className="pt-2">
                    <button
                        onClick={onClose}
                        className={cn(
                            "w-full py-3 rounded-2xl font-extrabold text-xs transition-all shadow-md active:scale-98",
                            isGourmet ? "bg-amber-500 text-zinc-950 hover:bg-amber-400" : "bg-primary text-white hover:bg-primary/90"
                        )}
                        style={!isGourmet ? { backgroundColor: activePrimaryColor } : undefined}
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    )
}

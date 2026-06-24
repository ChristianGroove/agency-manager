"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/modules/core/database/supabase"
import { updateRestoOrderStatus } from "../actions"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Utensils, CheckCircle2, Clock, MapPin, Phone, User, Store } from "lucide-react"

export function KdsBoard({ orders, onStatusChange }: { orders: any[], onStatusChange: (orderId: string, newStatus: string) => Promise<void> }) {
    
    // Filter active orders
    const activeOrders = orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.kitchen_status))
    
    const pending = activeOrders.filter(o => o.kitchen_status === 'pending')
    const preparing = activeOrders.filter(o => o.kitchen_status === 'preparing')
    const ready = activeOrders.filter(o => o.kitchen_status === 'ready')

    const Column = ({ title, status, items, actionLabel, nextStatus, icon: Icon, colorClass }: any) => (
        <div className="flex flex-col bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-[2rem] p-5 h-full min-h-[70vh] shadow-sm">
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider">{title}</h2>
                </div>
                <span className="bg-white dark:bg-black/20 text-gray-700 dark:text-zinc-300 px-3 py-1 rounded-full text-sm font-bold shadow-sm border border-gray-100 dark:border-white/5">
                    {items.length}
                </span>
            </div>

            <div className="flex flex-col gap-5 overflow-y-auto -mx-2 px-2 -mt-2 pt-2 pb-20 scrollbar-modern">
                {items.map((order: any) => {
                    // Determine button gradient based on nextStatus
                    const btnGradient = status === 'pending' ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-red-500/20' 
                                      : status === 'preparing' ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/20'
                                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/20';

                    const stripColor = status === 'pending' ? 'bg-red-500' : status === 'preparing' ? 'bg-orange-500' : 'bg-green-500';

                    return (
                        <div key={order.id} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                            {/* Subtle Glow Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            
                            {/* Top Status Indicator */}
                            <div className={`absolute top-0 left-0 w-full h-1.5 ${stripColor} opacity-80`} />
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                                            <span>{format(new Date(order.created_at), "h:mm a")}</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-600" />
                                            <span className="text-brand-pink">{order.resto_mode.replace('_', ' ')}</span>
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-none mt-1">
                                            {order.resto_tables?.table_identifier || order.metadata?.table_identifier || (order.table_id ? `Mesa ${order.table_id}` : (order.leads?.name || 'Invitado'))}
                                            {order.round_number && order.round_number > 1 && (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                                    Ronda {order.round_number}
                                                </span>
                                            )}
                                        </h3>
                                    </div>
                                    <div className="text-right bg-gray-100/80 dark:bg-black/20 px-3 py-1.5 rounded-xl border border-gray-200/50 dark:border-white/5 backdrop-blur-sm">
                                        <span className="text-sm font-black text-gray-900 dark:text-white">
                                            ${order.total?.toLocaleString('es-CO')}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-5 pt-4 border-t border-gray-100 dark:border-white/10">
                                    {order.items_snapshot?.map((item: any, idx: number) => (
                                        <div key={idx} className="flex flex-col">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-brand-pink/10 text-brand-pink font-black text-sm px-2 py-0.5 rounded-md min-w-[28px] text-center">
                                                    {item.quantity}x
                                                </div>
                                                <div className="flex-1">
                                                    <span className="font-bold text-gray-800 dark:text-zinc-100 text-sm">{item.title}</span>
                                                    {item.modifiers && item.modifiers.length > 0 && (
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {item.modifiers.map((m:any, mIdx: number) => (
                                                                <span key={mIdx} className="text-[11px] font-semibold text-gray-500 bg-gray-100 dark:bg-zinc-800 dark:text-zinc-400 px-1.5 py-0.5 rounded border border-gray-200/50 dark:border-zinc-700/50">
                                                                    + {m.optionName}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {item.notes && (
                                                        <div className="text-[11px] text-orange-600 dark:text-orange-400 font-bold mt-1 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded border border-orange-100 dark:border-orange-900/30 w-fit">
                                                            {item.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {order.customer_notes && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-500 text-xs p-3 rounded-xl mb-5 font-bold border border-yellow-200 dark:border-yellow-900/50 flex items-start gap-2 shadow-sm">
                                        <span className="text-lg">📌</span>
                                        <span className="pt-0.5">{order.customer_notes}</span>
                                    </div>
                                )}

                                {nextStatus && (
                                    <button 
                                        onClick={() => onStatusChange(order.id, nextStatus)}
                                        className={`w-full py-3 rounded-xl font-black text-sm transition-all transform active:scale-95 shadow-md flex justify-center items-center gap-2 text-white ${btnGradient}`}
                                    >
                                        {status === 'ready' ? 'Entregar / Despachar' : actionLabel}
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
                
                {items.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-zinc-600 font-semibold text-sm border-2 border-dashed border-gray-200 dark:border-white/5 rounded-2xl bg-white/30 dark:bg-zinc-900/30 backdrop-blur-sm">
                        <span className="text-4xl mb-3 opacity-50">🍽️</span>
                        Sin pedidos
                    </div>
                )}
            </div>
        </div>
    )

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Column 
                title="En Espera" 
                status="pending" 
                items={pending} 
                actionLabel="Comenzar a Preparar" 
                nextStatus="preparing"
                icon={Clock}
                colorClass="text-red-500"
            />
            <Column 
                title="En Cocina" 
                status="preparing" 
                items={preparing} 
                actionLabel="Marcar Listo" 
                nextStatus="ready"
                icon={Utensils}
                colorClass="text-orange-500"
            />
            <Column 
                title="Listos" 
                status="ready" 
                items={ready} 
                actionLabel="Entregar" 
                nextStatus="completed"
                icon={CheckCircle2}
                colorClass="text-green-500"
            />
        </div>
    )
}

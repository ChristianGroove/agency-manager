"use client"

import React, { useEffect, useState } from "react"
import { useRestoCart } from "@/hooks/use-resto-cart"
import { getSessionSummary, requestBill } from "../actions/resto-session-actions"
import { Button } from "@/components/ui/button"
import { Check, Clock, CreditCard, Receipt } from "lucide-react"
import { supabase } from "@/modules/core/database/supabase"

export function RestoDineInTab({ orgId, primaryColor }: { orgId: string, primaryColor?: string }) {
    const { sessionId, tableIdentifier, clearTableContext } = useRestoCart()
    const [sessionData, setSessionData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [requestingBill, setRequestingBill] = useState(false)
    const [showBillForm, setShowBillForm] = useState(false)
    
    // Bill Form State
    const [tipPercent, setTipPercent] = useState(0.1)
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash')

    const fetchSession = async () => {
        if (!sessionId) return
        const data = await getSessionSummary(sessionId)
        setSessionData(data)
        setLoading(false)
        
        if (data && data.status === 'closed') {
            // Mesa liberada por admin, limpiar contexto
            clearTableContext()
        }
    }

    useEffect(() => {
        fetchSession()

        // Suscribirse a cambios en la sesión (por si otro en la mesa agrega algo o si admin cierra la mesa)
        if (!sessionId) return

        const channel = supabase.channel(`dinein_session_${sessionId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'resto_table_sessions',
                filter: `id=eq.${sessionId}`
            }, () => {
                fetchSession()
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'resto_orders',
                filter: `session_id=eq.${sessionId}`
            }, () => {
                fetchSession()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId])

    if (!sessionId) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full mt-20">
                <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <Check className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">¡Gracias por tu visita!</h2>
                <p className="text-gray-500 text-sm">Tu cuenta ha sido cerrada. Esperamos verte pronto.</p>
            </div>
        )
    }

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Cargando tu cuenta...</div>
    }

    if (!sessionData) {
        return <div className="p-8 text-center text-red-500">No se pudo cargar la sesión.</div>
    }

    const { resto_orders: rounds, total_accumulated, status } = sessionData
    const tipAmount = Math.round(total_accumulated * tipPercent)
    const finalTotal = total_accumulated + tipAmount

    const handleRequestBill = async () => {
        setRequestingBill(true)
        // Optimistic update
        setSessionData((prev: any) => prev ? { ...prev, status: 'payment_pending' } : prev)
        
        const res = await requestBill(sessionId, tipAmount, paymentMethod)
        if (res.success) {
            await fetchSession()
        } else {
            alert("Error: " + res.error)
            setSessionData((prev: any) => prev ? { ...prev, status: 'active' } : prev)
        }
        setRequestingBill(false)
        setShowBillForm(false)
    }

    return (
        <div className="flex flex-col w-full h-full p-4 pb-24 space-y-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-extrabold text-lg text-gray-900 dark:text-white">Rondas Pedidas</h2>
                    {status === 'payment_pending' && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 text-xs font-bold rounded-full">
                            Cuenta Pedida
                        </span>
                    )}
                </div>
                {rounds && rounds.length > 0 ? (
                    rounds.map((round: any, idx: number) => (
                        <div key={round.id} className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">Ronda {round.round_number}</span>
                                    <span className="text-xs text-gray-400"><Clock className="w-3 h-3 inline mr-1"/>{new Date(round.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <span className="font-semibold">${round.total.toLocaleString('es-CO')}</span>
                            </div>
                            
                            <ul className="space-y-2">
                                {round.items_snapshot.map((item: any, i: number) => (
                                    <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <span className="font-medium">{item.quantity}x</span>
                                        <span>{item.title}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* Badge status cocina */}
                            <div className="absolute top-0 right-0 h-full w-1">
                                {round.kitchen_status === 'pending' && <div className="h-full bg-yellow-400" />}
                                {round.kitchen_status === 'preparing' && <div className="h-full bg-blue-400" />}
                                {round.kitchen_status === 'ready' && <div className="h-full bg-green-500" />}
                                {round.kitchen_status === 'cancelled' && <div className="h-full bg-red-500" />}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-gray-500 text-sm py-4 text-center">Aún no has pedido nada.</div>
                )}
            </div>

            {/* Total Acumulado (Al final de las rondas) */}
            {rounds && rounds.length > 0 && (
                <div className="bg-gray-50 dark:bg-zinc-900/90 border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                        Total Acumulado
                    </div>
                    <div className="text-2xl font-black text-primary" style={{ color: primaryColor }}>
                        ${(total_accumulated || 0).toLocaleString('es-CO')}
                    </div>
                </div>
            )}

            {status === 'active' && !showBillForm && (
                <Button 
                    onClick={() => setShowBillForm(true)}
                    className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20"
                    style={{ backgroundColor: primaryColor }}
                >
                    <Receipt className="mr-2" /> Pedir la Cuenta
                </Button>
            )}

            {showBillForm && status === 'active' && (
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 shadow-lg space-y-6 mt-4 animate-in slide-in-from-bottom-4">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Receipt className="w-5 h-5"/> Resumen Final</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-sm mb-2 text-gray-600">Propina</h4>
                            <div className="grid grid-cols-4 gap-2">
                                {[0, 0.1, 0.15, 0.2].map((percent) => (
                                    <button
                                        key={percent}
                                        type="button"
                                        onClick={() => setTipPercent(percent)}
                                        className={`p-2 rounded-xl text-sm font-semibold border transition-all ${tipPercent === percent ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 border-transparent text-gray-500'}`}
                                    >
                                        {percent === 0 ? 'Nada' : `${percent * 100}%`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold text-sm mb-2 text-gray-600">Método de Pago</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {['cash', 'transfer'].map((method) => (
                                    <button
                                        key={method}
                                        type="button"
                                        onClick={() => setPaymentMethod(method as any)}
                                        className={`p-3 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${paymentMethod === method ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 border-transparent text-gray-500'}`}
                                    >
                                        {method === 'cash' ? '💵 Efectivo' : '🏦 Transferencia'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="border-t pt-4">
                            <div className="flex justify-between text-sm mb-1">
                                <span>Subtotal Consumo</span>
                                <span>${total_accumulated.toLocaleString('es-CO')}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-3">
                                <span>Propina</span>
                                <span>${tipAmount.toLocaleString('es-CO')}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total a Pagar</span>
                                <span className="text-primary" style={{ color: primaryColor }}>${finalTotal.toLocaleString('es-CO')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setShowBillForm(false)}>Cancelar</Button>
                        <Button 
                            className="flex-1" 
                            style={{ backgroundColor: primaryColor }}
                            onClick={handleRequestBill}
                            disabled={requestingBill}
                        >
                            {requestingBill ? 'Procesando...' : 'Confirmar'}
                        </Button>
                    </div>
                </div>
            )}

            {status === 'payment_pending' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-2xl p-6 text-center shadow-sm">
                    <Receipt className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
                    <h3 className="font-bold text-yellow-800 dark:text-yellow-200 text-lg">Cuenta Solicitada</h3>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                        Tu mesero se acercará pronto para cobrar.
                    </p>
                    <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-3 opacity-80">
                        La mesa se liberará automáticamente una vez se confirme el pago en caja.
                    </p>
                </div>
            )}
        </div>
    )
}

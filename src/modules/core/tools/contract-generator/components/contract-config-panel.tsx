"use client"

import React, { useEffect, useState } from "react"
import { useContract } from "../context/contract-context"
import { getClientsList, getServicesList } from "../actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Loader2, User, Store } from "lucide-react"

export function ContractConfigPanel() {
    const {
        selectedClientId,
        setSelectedClientId,
        selectedServiceIds,
        setSelectedServiceIds,
        isLoading: isContextLoading,
    } = useContract()

    const [clients, setClients] = useState<any[]>([])
    const [services, setServices] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function loadOptions() {
            try {
                const [clientsList, servicesList] = await Promise.all([
                    getClientsList(),
                    getServicesList()
                ])
                setClients(clientsList || [])
                setServices(servicesList || [])
            } catch (error) {
                console.error("Error loading options:", error)
            } finally {
                setIsLoading(false)
            }
        }
        loadOptions()
    }, [])

    const handleServiceToggle = (serviceId: string) => {
        setSelectedServiceIds(selectedServiceIds.includes(serviceId)
            ? selectedServiceIds.filter((id) => id !== serviceId)
            : [...selectedServiceIds, serviceId]
        )
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p className="text-sm">Cargando opciones...</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Cliente */}
            <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                    <User className="w-3 h-3 text-brand-pink" />
                    Seleccionar Cliente
                </Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 h-11">
                        <SelectValue placeholder="Buscar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                        {clients.length > 0 ? (
                            clients.map(client => (
                                <SelectItem key={client.id} value={client.id}>
                                    {client.name}
                                </SelectItem>
                            ))
                        ) : (
                            <SelectItem value="none" disabled>
                                No hay clientes disponibles
                            </SelectItem>
                        )}
                    </SelectContent>
                </Select>
            </div>

            {/* Servicios */}
            <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                    <Store className="w-3 h-3 text-brand-pink" />
                    Servicios del Catálogo
                </Label>
                <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-modern">
                    {services.length > 0 ? (
                        services.map(service => (
                            <div
                                key={service.id}
                                className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${selectedServiceIds.includes(service.id)
                                    ? "bg-brand-pink/5 border-brand-pink shadow-sm"
                                    : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                                    }`}
                                onClick={() => handleServiceToggle(service.id)}
                            >
                                <Checkbox
                                    id={`service-${service.id}`}
                                    checked={selectedServiceIds.includes(service.id)}
                                    onCheckedChange={() => handleServiceToggle(service.id)}
                                    className="mt-1 data-[state=checked]:bg-brand-pink data-[state=checked]:border-brand-pink"
                                />
                                <div className="flex-1 space-y-1">
                                    <Label
                                        htmlFor={`service-${service.id}`}
                                        className="text-xs font-bold leading-none cursor-pointer"
                                    >
                                        {service.name}
                                    </Label>
                                    <p className="text-[10px] text-gray-500 line-clamp-2 leading-tight">
                                        {service.description || "Sin descripción específica"}
                                    </p>
                                    <div className="text-[10px] font-black text-brand-pink mt-1">
                                        ${Number(service.base_price || 0).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 border-2 border-dashed border-gray-100 rounded-xl text-center">
                            <p className="text-xs text-gray-400 italic">No hay servicios en el catálogo.</p>
                        </div>
                    )}
                </div>
            </div>

            {(isContextLoading) && (
                <div className="flex items-center gap-2 text-[10px] text-brand-pink animate-pulse font-bold justify-center">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Sincronizando contrato...
                </div>
            )}
        </div>
    )
}

"use client"

import React, { useState, useEffect } from 'react'
import { Plus, X, MapPin, Clock, Search, Loader2, Globe, Navigation } from 'lucide-react'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Location, createLocation, updateLocation, BusinessHours, BusinessDay } from '../../actions'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/modules/infrastructure/utils/utils'
import dynamic from 'next/dynamic'
import { COLOMBIA_DEPARTMENTS } from '@/modules/infrastructure/data/colombia-locations'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const LocationPickerMap = dynamic(() => import('./location-picker-map'), { ssr: false })

interface LocationManagementSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    location?: Location | null // Si hay location, es Edit. Si es null, es Create.
    onSuccess?: () => void
}

const defaultDay: BusinessDay = { open: "08:00", close: "18:00", is_closed: false }
const defaultHours: BusinessHours = {
    monday: { ...defaultDay },
    tuesday: { ...defaultDay },
    wednesday: { ...defaultDay },
    thursday: { ...defaultDay },
    friday: { ...defaultDay },
    saturday: { open: "09:00", close: "14:00", is_closed: false },
    sunday: { ...defaultDay, is_closed: true },
}

const DAYS_MAP = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' },
]

export function LocationManagementSheet({ open, onOpenChange, location, onSuccess }: LocationManagementSheetProps) {
    const isEdit = !!location
    const [isLoading, setIsLoading] = useState(false)

    // Form State
    const [name, setName] = useState('')
    const [address, setAddress] = useState('')
    const [country, setCountry] = useState('Colombia')
    const [state, setState] = useState('')
    const [city, setCity] = useState('')
    const [lat, setLat] = useState(4.6097) // Default Bogota
    const [lng, setLng] = useState(-74.0817)
    const [radius, setRadius] = useState('100')
    const [isActive, setIsActive] = useState(true)
    const [businessHours, setBusinessHours] = useState<BusinessHours>(defaultHours)
    const [isSearching, setIsSearching] = useState(false)
    const [isInitialLoad, setIsInitialLoad] = useState(false)

    // Cargar datos al abrir
    useEffect(() => {
        if (open) {
            if (location) {
                setIsInitialLoad(true)
                setName(location.name)
                setAddress(location.address || '')
                setCountry(location.country || 'Colombia')
                setState(location.state || '')
                setCity(location.city || '')
                setLat(Number(location.latitude) || 4.6097)
                setLng(Number(location.longitude) || -74.0817)
                setRadius(location.geofence_radius_meters.toString())
                setIsActive(location.is_active)
                setBusinessHours(location.business_hours || defaultHours)

                // Allow state to settle, then disable the initial load flag
                setTimeout(() => setIsInitialLoad(false), 100)
            } else {
                setIsInitialLoad(false)
                // Reset form
                setName('')
                setAddress('')
                setCountry('Colombia')
                setState('')
                setCity('')
                setLat(4.6097)
                setLng(-74.0817)
                setRadius('100')
                setIsActive(true)
                setBusinessHours(defaultHours)
            }
        }
    }, [open, location])

    const handleDayToggle = (dayKey: keyof BusinessHours) => {
        setBusinessHours((prev: BusinessHours) => ({
            ...prev,
            [dayKey]: { ...prev[dayKey], is_closed: !prev[dayKey].is_closed }
        }))
    }

    const handleTimeChange = (dayKey: keyof BusinessHours, field: 'open' | 'close', value: string) => {
        setBusinessHours((prev: BusinessHours) => ({
            ...prev,
            [dayKey]: { ...prev[dayKey], [field]: value }
        }))
    }

    const handleReplicateSchedule = (sourceDay: keyof BusinessHours) => {
        const sourceData = businessHours[sourceDay]
        const newHours = { ...businessHours }
        
        Object.keys(newHours).forEach(day => {
            newHours[day as keyof BusinessHours] = { ...sourceData }
        })
        
        setBusinessHours(newHours)
        toast.success(`Horario de ${DAYS_MAP.find(d => d.key === sourceDay)?.label} replicado a toda la semana`)
    }

    const handleSearchAddress = async () => {
        if (!address.trim()) return
        setIsSearching(true)
        try {
            const query = encodeURIComponent(`${address}, ${city}, ${state}, ${country}`)
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`)
            const data = await res.json()
            if (data && data.length > 0) {
                setLat(parseFloat(data[0].lat))
                setLng(parseFloat(data[0].lon))
                toast.success("Ubicación encontrada en el mapa")
            } else {
                toast.error("No se pudo encontrar la dirección exacta")
            }
        } catch (error) {
            toast.error("Error al buscar dirección")
        } finally {
            setIsSearching(false)
        }
    }

    // Centrar mapa automáticamente al elegir ciudad
    useEffect(() => {
        const centerOnCity = async () => {
            if (!city || !state || isInitialLoad) return

            // Si ya tenemos coordenadas de una sede existente y no hemos cambiado la ciudad manualmente
            // quizás no queramos saltar, pero el usuario pidió "cuando elija una ciudad"
            // Por simplicidad y UX inmediata:
            try {
                const query = encodeURIComponent(`${city}, ${state}, ${country}`)
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`)
                const data = await res.json()
                if (data && data.length > 0) {
                    setLat(parseFloat(data[0].lat))
                    setLng(parseFloat(data[0].lon))
                }
            } catch (error) {
                console.error("Error centering on city:", error)
            }
        }

        centerOnCity()
    }, [city, state, country])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) {
            toast.error("El nombre de la sede es requerido")
            return
        }

        setIsLoading(true)

        const payload = {
            name,
            address,
            country,
            state,
            city,
            latitude: lat,
            longitude: lng,
            geofence_radius_meters: parseInt(radius) || 100,
            is_active: isActive,
            business_hours: businessHours,
            timezone: 'America/Bogota'
        }

        try {
            const res = isEdit
                ? await updateLocation(location.id, payload)
                : await createLocation(payload)

            if (res.success) {
                toast.success(isEdit ? "Sede actualizada" : "Sede creada exitosamente")
                onSuccess?.()
                onOpenChange(false)
            } else {
                toast.error(res.error || "Error al guardar sede")
            }
        } catch (error) {
            toast.error("Ocurrió un error inesperado")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0 border-l border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <SheetHeader className="p-6 border-b border-slate-100 dark:border-slate-800/60 pb-5">
                        <SheetTitle className="text-2xl font-bold tracking-tight">
                            {isEdit ? 'Editar Sede' : 'Nueva Sede'}
                        </SheetTitle>
                        <SheetDescription>
                            Configura los parámetros operativos y de geocercado para esta sucursal física.
                        </SheetDescription>
                    </SheetHeader>

                    <ScrollArea className="flex-1 px-6 py-4">
                        <div className="space-y-6 pb-20">

                            {/* Información Básica */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> Información Básica
                                </h3>

                                <div className="space-y-2">
                                    <Label htmlFor="name">Nombre de la Sede</Label>
                                    <Input
                                        id="name"
                                        placeholder="Ej: Tienda Centro comercial Andino"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="country">País</Label>
                                        <Select value={country} onValueChange={setCountry} disabled>
                                            <SelectTrigger id="country" className="bg-slate-50 border-slate-200">
                                                <SelectValue placeholder="Seleccionar país" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Colombia">Colombia</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="state">Departamento</Label>
                                        <Select value={state} onValueChange={(val) => {
                                            setState(val)
                                            setCity('') // Reset city when department changes
                                        }}>
                                            <SelectTrigger id="state">
                                                <SelectValue placeholder="Seleccionar departamento" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COLOMBIA_DEPARTMENTS.map(dept => (
                                                    <SelectItem key={dept.id} value={dept.name}>
                                                        {dept.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="city">Ciudad / Municipio</Label>
                                        <Select
                                            value={city}
                                            onValueChange={setCity}
                                            disabled={!state}
                                        >
                                            <SelectTrigger id="city">
                                                <SelectValue placeholder={state ? "Seleccionar ciudad" : "Primero elige depto."} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {state && COLOMBIA_DEPARTMENTS.find(d => d.name === state)?.cities.map(cityName => (
                                                    <SelectItem key={cityName} value={cityName}>
                                                        {cityName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="address">Dirección Física</Label>
                                        <div className="relative">
                                            <Input
                                                id="address"
                                                placeholder="Cra 11 # 82 - 71"
                                                value={address}
                                                onChange={e => setAddress(e.target.value)}
                                                className="pr-10"
                                            />
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-emerald-500"
                                                onClick={handleSearchAddress}
                                                disabled={isSearching}
                                            >
                                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Interactive Map Picker */}
                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <Label className="text-xs font-bold uppercase text-slate-400">Tracker de Ubicación & Geocerca</Label>
                                        <span className="text-[10px] text-slate-400 italic">Haz click o arrastra el pin</span>
                                    </div>
                                    <LocationPickerMap
                                        lat={lat}
                                        lng={lng}
                                        radius={parseInt(radius) || 100}
                                        onChange={(newLat, newLng) => {
                                            setLat(newLat)
                                            setLng(newLng)
                                        }}
                                    />
                                    <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1">
                                        <span>Lat: {lat.toFixed(6)}</span>
                                        <span>Lng: {lng.toFixed(6)}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                    <div className="space-y-0.5">
                                        <Label className="text-base font-semibold">Estado de la Sede</Label>
                                        <p className="text-xs text-slate-500">¿Esta sede está operando actualmente?</p>
                                    </div>
                                    <Switch
                                        checked={isActive}
                                        onCheckedChange={setIsActive}
                                    />
                                </div>
                            </div>

                            {/* Geocercado */}
                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                                    Control Anti-Fraude (Geocercado)
                                </h3>

                                <div className="space-y-2">
                                    <Label htmlFor="radius">Radio Mínimo (metros)</Label>
                                    <Input
                                        id="radius"
                                        type="number"
                                        min="10"
                                        max="5000"
                                        value={radius}
                                        onChange={e => setRadius(e.target.value)}
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        Distancia máxima permitida en metros desde las coordenadas de la sede para que un empleado pueda marcar asistencia.
                                    </p>
                                </div>
                                {/* En un futuro aquí puede ir un mapa interactivo para fijar el PIN (lat/lng) */}
                            </div>

                            {/* Horarios */}
                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Horario Comercial
                                </h3>

                                <div className="space-y-2.5">
                                    {DAYS_MAP.map(day => {
                                        const dayKey = day.key as keyof BusinessHours
                                        const schedule = businessHours[dayKey]
                                        return (
                                            <div key={day.key} className={cn(
                                                "p-4 rounded-xl border transition-all duration-300",
                                                schedule.is_closed
                                                    ? "bg-slate-50/50 border-slate-100 dark:bg-slate-900/30 dark:border-slate-800/50 opacity-60"
                                                    : "bg-white border-slate-200 dark:bg-slate-900/80 dark:border-white/5 shadow-sm"
                                            )}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <Label className={cn(
                                                            "text-sm font-bold tracking-tight",
                                                            schedule.is_closed ? "text-slate-400" : "text-slate-700 dark:text-slate-200"
                                                        )}>
                                                            {day.label}
                                                        </Label>
                                                        {!schedule.is_closed && (
                                                            <Button 
                                                                type="button"
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-6 px-2 text-[10px] text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 gap-1 rounded-full font-bold"
                                                                onClick={() => handleReplicateSchedule(dayKey)}
                                                            >
                                                                <Clock className="w-3 h-3" /> Aplicar a todos
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {schedule.is_closed ? 'Cerrado' : 'Abierto'}
                                                        </span>
                                                        <Switch
                                                            checked={!schedule.is_closed}
                                                            onCheckedChange={() => handleDayToggle(dayKey)}
                                                        />
                                                    </div>
                                                </div>

                                                {!schedule.is_closed && (
                                                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                                        <div className="space-y-1.5">
                                                            <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Apertura</Label>
                                                            <Input
                                                                type="time"
                                                                value={schedule.open}
                                                                onChange={e => handleTimeChange(dayKey, 'open', e.target.value)}
                                                                className="h-9 bg-white dark:bg-slate-950 text-sm font-medium border-slate-200"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Cierre</Label>
                                                            <Input
                                                                type="time"
                                                                value={schedule.close}
                                                                onChange={e => handleTimeChange(dayKey, 'close', e.target.value)}
                                                                className="h-9 bg-white dark:bg-slate-950 text-sm font-medium border-slate-200"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                        </div>
                    </ScrollArea>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3 mt-auto">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
                        >
                            {isLoading ? "Guardando..." : "Guardar Sede"}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    )
}

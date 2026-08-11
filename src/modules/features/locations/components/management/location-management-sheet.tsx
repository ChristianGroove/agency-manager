"use client"

import React, { useState, useEffect } from 'react'
import { Plus, X, MapPin, Clock, Search, Loader2, Globe, Navigation, CheckCircle2 } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
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
            <SheetContent 
                className="
                    sm:max-w-[600px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
                side="right"
            >
                <form onSubmit={handleSubmit} className="flex flex-col h-full bg-white dark:bg-[#0a0a0a] dark:border dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl text-slate-900 dark:text-zinc-100">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center gap-3 shrink-0 px-8 py-5 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
                        <div className="p-2.5 bg-brand-pink/10 rounded-xl text-brand-pink shrink-0">
                            <Navigation className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <SheetTitle className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                                {isEdit ? 'Editar Sede' : 'Nueva Sede'}
                            </SheetTitle>
                            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                                Configura la ubicación operativa y geocerca de tu sucursal.
                            </p>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 overflow-y-auto">
                        <div className="px-8 py-8 space-y-8 pb-12">

                            {/* Información Básica */}
                            <div className="space-y-6 bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="bg-brand-pink/10 text-brand-pink border-brand-pink/20 px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest">
                                        Identidad
                                    </Badge>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider ml-1">Nombre Comercial</Label>
                                    <Input
                                        id="name"
                                        placeholder="Ej: Tienda Centro Comercial Andino"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="h-10 rounded-xl bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 dark:text-white"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="state" className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider ml-1">Departamento</Label>
                                        <Select value={state} onValueChange={(val) => {
                                            setState(val)
                                            setCity('')
                                        }}>
                                            <SelectTrigger id="state" className="h-10 rounded-xl bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 dark:text-white">
                                                <SelectValue placeholder="Elegir..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl dark:bg-zinc-900 dark:border-zinc-800 dark:text-white">
                                                {COLOMBIA_DEPARTMENTS.map(dept => (
                                                    <SelectItem key={dept.id} value={dept.name}>
                                                        {dept.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="city" className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider ml-1">Ciudad</Label>
                                        <Select value={city} onValueChange={setCity} disabled={!state}>
                                            <SelectTrigger id="city" className="h-10 rounded-xl bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 dark:text-white">
                                                <SelectValue placeholder={state ? "Elegir..." : "Elige depto."} />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl dark:bg-zinc-900 dark:border-zinc-800 dark:text-white">
                                                {state && COLOMBIA_DEPARTMENTS.find(d => d.name === state)?.cities.map(cityName => (
                                                    <SelectItem key={cityName} value={cityName}>
                                                        {cityName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address" className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider ml-1">Dirección Física</Label>
                                    <div className="relative group">
                                        <Input
                                            id="address"
                                            placeholder="Ej: Carrera 11 # 82 - 71"
                                            value={address}
                                            onChange={e => setAddress(e.target.value)}
                                            className="h-10 pr-12 rounded-xl bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 dark:text-white"
                                        />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="absolute right-1 top-1 h-8 w-8 rounded-lg text-slate-400 hover:text-brand-pink hover:bg-brand-pink/10 dark:hover:bg-brand-pink/20 transition-colors"
                                            onClick={handleSearchAddress}
                                            disabled={isSearching}
                                        >
                                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Mapa Interactivo */}
                            <div className="space-y-4 bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className="bg-brand-pink/10 text-brand-pink border-brand-pink/20 px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest">
                                        Geolocalización
                                    </Badge>
                                    <span className="text-[10px] text-slate-400 italic">Haz click en el mapa para ajustar</span>
                                </div>
                                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-inner">
                                    <LocationPickerMap
                                        lat={lat}
                                        lng={lng}
                                        radius={parseInt(radius) || 100}
                                        onChange={(newLat, newLng) => {
                                            setLat(newLat)
                                            setLng(newLng)
                                        }}
                                    />
                                </div>
                                <div className="flex items-center gap-6 px-2">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Latitud</span>
                                        <span className="text-xs font-mono text-slate-600 dark:text-slate-300">{lat.toFixed(6)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Longitud</span>
                                        <span className="text-xs font-mono text-slate-600 dark:text-slate-300">{lng.toFixed(6)}</span>
                                    </div>
                                    <div className="flex-1 space-y-1.5 pl-4 border-l border-slate-100 dark:border-white/5">
                                        <Label htmlFor="radius" className="text-[9px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">Radio Geocerca (m)</Label>
                                        <Input
                                            id="radius"
                                            type="number"
                                            min="10"
                                            max="100000"
                                            value={radius}
                                            onChange={e => setRadius(e.target.value)}
                                            className="h-8 py-0 px-2 text-xs font-bold rounded-lg bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Estado y Horarios */}
                            <div className="space-y-6 bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold text-slate-900 dark:text-white">Operatividad</Label>
                                        <p className="text-[11px] text-slate-500 dark:text-gray-400">Activa o desactiva la sede globalmente</p>
                                    </div>
                                    <Switch
                                        checked={isActive}
                                        onCheckedChange={setIsActive}
                                    />
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="bg-brand-pink/10 text-brand-pink border-brand-pink/20 px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest">
                                            Horario Comercial
                                        </Badge>
                                    </div>

                                    <div className="grid gap-3">
                                        {DAYS_MAP.map(day => {
                                            const dayKey = day.key as keyof BusinessHours
                                            const schedule = businessHours[dayKey]
                                            return (
                                                <div key={day.key} className={cn(
                                                    "p-4 rounded-2xl border transition-all duration-300",
                                                    schedule.is_closed
                                                        ? "bg-slate-50/50 border-slate-100 dark:bg-black/20 dark:border-white/5 opacity-60"
                                                        : "bg-white border-slate-200 dark:bg-black/40 dark:border-white/10 shadow-sm"
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
                                                                    className="h-6 px-2 text-[10px] text-brand-pink hover:text-brand-pink hover:bg-brand-pink/10 dark:hover:bg-brand-pink/20 gap-1 rounded-full font-bold"
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
                                                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-300">
                                                            <div className="space-y-1.5">
                                                                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Apertura</Label>
                                                                <Input
                                                                    type="time"
                                                                    value={schedule.open}
                                                                    onChange={e => handleTimeChange(dayKey, 'open', e.target.value)}
                                                                    className="h-9 bg-white dark:bg-black/20 text-sm font-medium border-slate-200 dark:border-white/10 rounded-xl dark:text-white"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Cierre</Label>
                                                                <Input
                                                                    type="time"
                                                                    value={schedule.close}
                                                                    onChange={e => handleTimeChange(dayKey, 'close', e.target.value)}
                                                                    className="h-9 bg-white dark:bg-black/20 text-sm font-medium border-slate-200 dark:border-white/10 rounded-xl dark:text-white"
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

                        </div>
                    </ScrollArea>

                    {/* Footer */}
                    <div className="sticky bottom-0 px-8 py-4 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-t border-gray-100 dark:border-white/5 flex items-center justify-between z-20 shrink-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                            className="text-slate-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-xl h-10 px-4 text-xs font-semibold"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="bg-brand-pink text-white hover:bg-brand-pink/90 font-semibold text-xs rounded-xl h-10 px-6 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                            )}
                            {isLoading ? "Guardando..." : "Guardar Sede"}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    )
}

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
            >
                <form onSubmit={handleSubmit} className="flex flex-col h-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/20 dark:border-white/5">
                    {/* Header Premium */}
                    <div className="sticky top-0 z-20 flex items-center gap-4 shrink-0 px-8 py-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-b border-slate-100 dark:border-white/5">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400">
                            <Navigation className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <SheetTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {isEdit ? 'Editar Sede' : 'Nueva Sede'}
                            </SheetTitle>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Configura la ubicación operativa y geocerca de tu sucursal.
                            </p>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 overflow-y-auto">
                        <div className="px-8 py-8 space-y-8 pb-32">

                            {/* Información Básica */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest">
                                        Identidad
                                    </Badge>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nombre Comercial</Label>
                                    <Input
                                        id="name"
                                        placeholder="Ej: Tienda Centro Comercial Andino"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 focus:ring-emerald-500"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="state" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Departamento</Label>
                                        <Select value={state} onValueChange={(val) => {
                                            setState(val)
                                            setCity('')
                                        }}>
                                            <SelectTrigger id="state" className="h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5">
                                                <SelectValue placeholder="Elegir..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl">
                                                {COLOMBIA_DEPARTMENTS.map(dept => (
                                                    <SelectItem key={dept.id} value={dept.name}>
                                                        {dept.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="city" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Ciudad</Label>
                                        <Select value={city} onValueChange={setCity} disabled={!state}>
                                            <SelectTrigger id="city" className="h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5">
                                                <SelectValue placeholder={state ? "Elegir..." : "Elige depto."} />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl">
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
                                    <Label htmlFor="address" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Dirección Física</Label>
                                    <div className="relative group">
                                        <Input
                                            id="address"
                                            placeholder="Ej: Carrera 11 # 82 - 71"
                                            value={address}
                                            onChange={e => setAddress(e.target.value)}
                                            className="h-11 pr-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 focus:ring-emerald-500"
                                        />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="absolute right-1 top-1 h-9 w-9 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                                            onClick={handleSearchAddress}
                                            disabled={isSearching}
                                        >
                                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Mapa Interactivo */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest">
                                        Geolocalización
                                    </Badge>
                                    <span className="text-[10px] text-slate-400 italic">Haz click en el mapa para ajustar</span>
                                </div>
                                <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-white/5 shadow-inner">
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
                                        <Label htmlFor="radius" className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Radio Geocerca (m)</Label>
                                        <Input
                                            id="radius"
                                            type="number"
                                            min="10"
                                            max="100000"
                                            value={radius}
                                            onChange={e => setRadius(e.target.value)}
                                            className="h-8 py-0 px-2 text-xs font-bold rounded-lg"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Estado y Horarios */}
                            <div className="space-y-6 pt-2">
                                <div className="flex items-center justify-between p-4 rounded-3xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold text-slate-900 dark:text-white">Operatividad</Label>
                                        <p className="text-[11px] text-slate-500">Activa o desactiva la sede globalmente</p>
                                    </div>
                                    <Switch
                                        checked={isActive}
                                        onCheckedChange={setIsActive}
                                    />
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest">
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
                                                        ? "bg-slate-50/50 border-slate-100 dark:bg-slate-900/30 dark:border-slate-800/50 opacity-60"
                                                        : "bg-white border-slate-200 dark:bg-slate-900/80 dark:border-white/10 shadow-sm"
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
                                                                    className="h-6 px-2 text-[10px] text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 gap-1 rounded-full font-bold"
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
                                                                    className="h-9 bg-white dark:bg-slate-950 text-sm font-medium border-slate-200 dark:border-white/10 rounded-xl"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Cierre</Label>
                                                                <Input
                                                                    type="time"
                                                                    value={schedule.close}
                                                                    onChange={e => handleTimeChange(dayKey, 'close', e.target.value)}
                                                                    className="h-9 bg-white dark:bg-slate-950 text-sm font-medium border-slate-200 dark:border-white/10 rounded-xl"
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

                    {/* Footer Premium */}
                    <div className="sticky bottom-0 z-20 px-8 py-5 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                            className="rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px] h-11 rounded-2xl shadow-lg shadow-emerald-500/20 font-bold transition-all hover:scale-[1.02]"
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

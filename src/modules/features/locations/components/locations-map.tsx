"use client"

import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Location, StaffTracker } from '../actions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { MapPin, Users, Clock, Navigation } from 'lucide-react'

// Solución premium para iconos desaparecidos en Next.js/Leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Icono personalizado para trackers de sedes
const SedeIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="w-8 h-8 bg-emerald-500 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center text-white transform rotate-45 transition-all hover:scale-110 active:scale-95">
             <div class="transform -rotate-45"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
})

interface LocationsMapProps {
    locations: Location[]
    staffByLocation?: (locId: string) => any[]
    trackers?: StaffTracker[]
}

// Icono para Staff Trackers (Colaboradores)
const StaffIcon = L.divIcon({
    className: 'staff-div-icon',
    html: `<div class="w-10 h-10 bg-brand-pink rounded-full border-2 border-white shadow-2xl flex items-center justify-center p-0.5 overflow-hidden animate-bounce hover:animate-none transition-all">
             <div class="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-brand-pink">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
             </div>
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
})

// Helper to auto-fit bounds when locations change
function ChangeView({ bounds }: { bounds: L.LatLngBoundsExpression }) {
    const map = useMap()
    useEffect(() => {
        if (bounds && (bounds as any).length > 0) {
            // Solo ajustar si las dimensiones son razonables
            try {
                map.fitBounds(bounds, { padding: [100, 100], maxZoom: 16 })
            } catch (e) {
                console.error("Error adjusting map bounds:", e)
            }
        }
    }, [JSON.stringify(bounds), map]) // Use stringified bounds to avoid shallow comparison issues
    return null
}

export default function LocationsMap({ locations, staffByLocation, trackers = [] }: LocationsMapProps) {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) return <div className="w-full h-[600px] bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 font-medium">Cargando mapa...</div>

    // Parse and validate locations
    const validLocations = locations.filter(l => {
        const lat = parseFloat(String(l.latitude))
        const lng = parseFloat(String(l.longitude))
        return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0
    })

    const bounds: L.LatLngBoundsExpression = validLocations.map(l => [
        parseFloat(String(l.latitude)),
        parseFloat(String(l.longitude))
    ])

    const defaultCenter: L.LatLngExpression = [4.6097, -74.0817]
    const initialCenter: L.LatLngExpression = validLocations.length > 0
        ? [parseFloat(String(validLocations[0].latitude)), parseFloat(String(validLocations[0].longitude))]
        : defaultCenter

    return (
        <div className="w-full h-[600px] rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl relative">
            <MapContainer
                center={initialCenter}
                zoom={14}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" // Modern/Clean tile
                />

                {validLocations.map((loc) => {
                    const staff = staffByLocation ? staffByLocation(loc.id) : []
                    const position: L.LatLngExpression = [
                        parseFloat(String(loc.latitude)),
                        parseFloat(String(loc.longitude))
                    ]

                    return (
                        <React.Fragment key={loc.id}>
                            {/* Geofence Circle */}
                            <Circle
                                center={position}
                                radius={loc.geofence_radius_meters || 100}
                                pathOptions={{
                                    fillColor: loc.is_active ? '#10b981' : '#64748b',
                                    fillOpacity: 0.15,
                                    color: loc.is_active ? '#10b981' : '#64748b',
                                    weight: 1,
                                    dashArray: '5, 10'
                                }}
                            />

                            {/* Marker Principal (Sede) */}
                            <Marker
                                position={position}
                                icon={SedeIcon}
                                eventHandlers={{
                                    mouseover: (e) => { e.target.openPopup() },
                                    // mouseout: (e) => { e.target.closePopup() }, // Optional: keep open
                                }}
                            >
                                <Popup maxWidth={300} className="custom-popup" offset={[0, -10]}>
                                    <div className="p-1 w-64 font-sans">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-slate-900 leading-tight">{loc.name}</h4>
                                            <Badge variant={loc.is_active ? "outline" : "secondary"} className="text-[9px] uppercase">
                                                {loc.is_active ? 'Activa' : 'Inactiva'}
                                            </Badge>
                                        </div>

                                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mb-3">
                                            <MapPin className="w-3 h-3" /> {loc.address || 'Sin dirección'}
                                        </p>

                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            <div className="bg-slate-50 p-2 rounded-lg flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Radio</span>
                                                <span className="text-xs font-bold text-slate-700">{loc.geofence_radius_meters}m</span>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-lg flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Personal</span>
                                                <span className="text-xs font-bold text-slate-700">{staff.length}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Navigation className="w-3 h-3" /> {loc.city || 'Ciudad'}
                                            </span>
                                            <button className="text-[10px] font-bold text-emerald-600 hover:underline">
                                                Gestionar Sede
                                            </button>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        </React.Fragment>
                    )
                })}

                {/* Staff Trackers Layer */}
                {trackers.map((tracker) => (
                    <Marker
                        key={tracker.staff_id}
                        position={[tracker.latitude, tracker.longitude]}
                        icon={StaffIcon}
                        eventHandlers={{
                            mouseover: (e) => { e.target.openPopup() },
                        }}
                    >
                        <Popup maxWidth={250} offset={[0, -5]}>
                            <div className="p-2 w-48 font-sans">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-brand-pink/10 flex items-center justify-center text-brand-pink">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h5 className="text-xs font-black text-slate-900 leading-none">{tracker.staff_name}</h5>
                                        <span className="text-[9px] font-bold text-slate-400">Tracker Activo</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-lg space-y-1">
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-slate-400 font-bold uppercase">Estado:</span>
                                        <Badge variant="outline" className="h-4 px-1.5 text-[8px] bg-emerald-500/10 text-emerald-600 border-none font-black italic">
                                            {tracker.type === 'check_in' ? 'EN SITIO' : 'RUTINA'}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-slate-400 font-bold uppercase">Último GPS:</span>
                                        <span className="text-slate-700 font-bold">{new Date(tracker.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {validLocations.length > 0 && <ChangeView bounds={bounds} />}
            </MapContainer>

            {/* Float Legend */}
            <div className="absolute top-4 right-4 z-[400] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/20">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Referencias</h5>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                        Sede Activa
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <div className="w-3 h-3 rounded-full border border-dashed border-emerald-500 bg-emerald-500/10" />
                        Geocerca (Radio de marcación)
                    </div>
                </div>
            </div>
        </div>
    )
}

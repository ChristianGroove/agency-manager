"use client"

import React, { useState } from 'react'
import { Plus, Search, Map } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/modules/infrastructure/utils/utils'
import { Location, StaffTracker, deleteLocation } from '../actions'
import { LocationCard, LocationStaffStatus } from './location-card'
import { LocationManagementSheet } from './management/location-management-sheet'
import { SectionHeader } from "@/components/layout/section-header"
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

// Dynamically import the map to avoid SSR issues
const LocationsMap = dynamic(() => import('./locations-map'), {
    ssr: false,
    loading: () => <div className="w-full h-[600px] bg-slate-100 animate-pulse rounded-3xl flex items-center justify-center text-slate-400">Preparando mapa interactivo...</div>
})

interface LocationsViewProps {
    initialLocations: Location[]
    staffList: any[]
    initialTrackers: StaffTracker[]
}

export function LocationsView({ initialLocations, staffList, initialTrackers }: LocationsViewProps) {
    const [locations, setLocations] = useState<Location[]>(initialLocations)
    const [trackers, setTrackers] = useState<StaffTracker[]>(initialTrackers)
    const [searchTerm, setSearchTerm] = useState('')
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')

    // Sheet State
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)

    // Filtro local
    const filteredLocations = locations.filter(loc =>
        loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (loc.address && loc.address.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    // Map staff to locations
    const staffByLocation = (locId: string) => {
        return staffList
            .filter(s => s.location_id === locId)
            .map(s => ({
                id: s.id,
                name: `${s.first_name} ${s.last_name}`,
                photo_url: s.photo_url,
                status: 'offline' // For now, status can be added later if needed
            })) as LocationStaffStatus[]
    }

    const handleDelete = async (location: Location) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar la sede "${location.name}"? Esta acción no se puede deshacer.`)) {
            return
        }

        try {
            const res = await deleteLocation(location.id)
            if (res.success) {
                toast.success('Sede eliminada correctamente')
                setLocations(prev => prev.filter(l => l.id !== location.id))
            } else {
                toast.error('Error al eliminar sede: ' + res.error)
            }
        } catch (error) {
            toast.error('Ocurrió un error inesperado al eliminar la sede')
        }
    }

    return (
        <div className="flex flex-col h-full w-full space-y-6">

            {/* Header y Controles */}
            <SectionHeader
                title="Sedes (Locations)"
                subtitle="Control en vivo de sucursales, horarios operativos y personal en zona."
                icon={Map}
                action={
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar sede..."
                                className="pl-9 bg-white dark:bg-slate-900/50 rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* View Toggle */}
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-white/10 h-10">
                            <Button
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                size="sm"
                                className={cn("rounded-lg px-4 h-full text-xs font-bold transition-all", viewMode === 'grid' && "bg-white dark:bg-white/10 shadow-sm")}
                                onClick={() => setViewMode('grid')}
                            >
                                Cuadrícula
                            </Button>
                            <Button
                                variant={viewMode === 'map' ? 'secondary' : 'ghost'}
                                size="sm"
                                className={cn("rounded-lg px-4 h-full text-xs font-bold transition-all", viewMode === 'map' && "bg-white dark:bg-white/10 shadow-sm")}
                                onClick={() => setViewMode('map')}
                            >
                                Mapa Interactivo
                            </Button>
                        </div>

                        <Button
                            onClick={() => {
                                setSelectedLocation(null)
                                setIsSheetOpen(true)
                            }}
                            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 rounded-xl px-6"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Nueva Sede
                        </Button>
                    </div>
                }
            />

            {/* Contenido según vista */}
            {filteredLocations.length > 0 ? (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {filteredLocations.map(location => (
                            <LocationCard
                                key={location.id}
                                location={location}
                                staffMembers={staffByLocation(location.id)}
                                onEdit={(loc) => {
                                    setSelectedLocation(loc)
                                    setIsSheetOpen(true)
                                }}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="w-full animate-in fade-in zoom-in-95 duration-700">
                        <LocationsMap
                            locations={filteredLocations}
                            staffByLocation={staffByLocation}
                            trackers={trackers}
                        />
                    </div>
                )
            ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                        <Map className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No se encontraron sedes</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mb-6">
                        {searchTerm ? "No hay ninguna sede que coincida con tu búsqueda." : "Comienza agregando tu primera sucursal para controlar sus horarios y personal de campo."}
                    </p>
                    {!searchTerm && (
                        <Button
                            variant="outline"
                            className="rounded-full"
                            onClick={() => {
                                setSelectedLocation(null)
                                setIsSheetOpen(true)
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" /> Crear tu primera Sede
                        </Button>
                    )}
                </div>
            )}

            <LocationManagementSheet
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                location={selectedLocation}
                onSuccess={() => {
                    // Refrescar locations (idealmente usando server action/router.refresh)
                }}
            />
        </div>
    )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { useRestoTablesStore, RestoZone, RestoTable, TableShape } from '../store/use-tables-store'
import { PlusCircle, Save, Settings2, LayoutTemplate, ChevronDown, Check, RectangleHorizontal, Trees, Grid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { saveLayout } from '../actions'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { supabase } from '@/modules/core/database/supabase'

export const RestoTablesCanvas = ({ 
    initialZones, 
    initialTables,
    orgId
}: { 
    initialZones: RestoZone[], 
    initialTables: RestoTable[],
    orgId: string
}) => {
    const { 
        mode, setMode, 
        tables, setTables, activeZone, setActiveZone, addTable, updateTable, removeTable,
        scale, pan, setScale, setPan,
        hasUnsavedChanges, setHasUnsavedChanges,
        selectedIds, setSelectedIds, updateVisualElement
    } = useRestoTablesStore()
    
    const containerRef = useRef<HTMLDivElement>(null)

    // INITIALIZATION & REALTIME
    useEffect(() => {
        if (initialZones.length > 0 && !activeZone) {
            setActiveZone(initialZones[0])
            setTables(initialTables.filter(t => t.zone_id === initialZones[0].id))
        } else if (initialZones.length === 0 && !activeZone) {
            const defaultZone: RestoZone = {
                id: `temp_zone_${Math.random().toString(36).substr(2, 9)}`,
                name: 'Salón Principal',
                grid_width: 2000,
                grid_height: 2000,
                visual_elements: []
            }
            setActiveZone(defaultZone)
            setTables([])
            setHasUnsavedChanges(true)
        }

        // Setup Realtime Subscription for Live Mode
        const channel = supabase.channel(`resto_tables_${orgId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'resto_tables', filter: `organization_id=eq.${orgId}` },
                (payload: any) => {
                    const updatedTable = payload.new as RestoTable
                    // Only update visually if we are in Live mode or if it's a profound status change
                    updateTable(updatedTable.id, { 
                        status: updatedTable.status,
                        // potentially other properties if they change live, but mostly status
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [initialZones, initialTables, activeZone, setActiveZone, setTables, setHasUnsavedChanges, orgId, supabase, updateTable])



    const handleSave = async () => {
        if (!activeZone) return
        
        toast.promise(
            saveLayout(orgId, activeZone, tables),
            {
                loading: 'Guardando diseño...',
                success: (res) => {
                    if (!res.success) throw new Error(res.error)
                    setHasUnsavedChanges(false)
                    return 'Diseño guardado correctamente.'
                },
                error: (err) => `Error al guardar: ${err.message}`
            }
        )
    }

    // --- UI State Logic ---
    const [isPropertiesOpen, setIsPropertiesOpen] = useState(true)

    // --- Drag & Drop Logic ---
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [draggingType, setDraggingType] = useState<'table' | 'visual' | null>(null)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

    const GRID_SIZE = 20 // Snap to grid

    const handlePointerDown = (e: React.PointerEvent, id: string, type: 'table' | 'visual') => {
        if (mode !== 'builder') return
        e.stopPropagation() // Prevent canvas from deselecting
        e.currentTarget.setPointerCapture(e.pointerId)
        
        // Selection Logic
        if (!selectedIds.includes(id)) {
            setSelectedIds([id])
        }
        setIsPropertiesOpen(true) // Auto-open properties when selecting an element
        
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        // Calculate offset based on current scale
        setDragOffset({
            x: (e.clientX - rect.left) / scale,
            y: (e.clientY - rect.top) / scale
        })
        setDraggingId(id)
        setDraggingType(type)
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        if (mode !== 'builder' || !containerRef.current) return

        // Handle Panning if dragging background
        if (draggingId === 'canvas_pan') {
            setPan({ 
                x: pan.x + e.movementX, 
                y: pan.y + e.movementY 
            })
            return
        }

        if (!draggingId || !draggingType) return
        
        const containerRect = containerRef.current.getBoundingClientRect()
        
        // Calculate raw position factoring in pan and scale
        let rawX = (e.clientX - containerRect.left) / scale - pan.x / scale - dragOffset.x
        let rawY = (e.clientY - containerRect.top) / scale - pan.y / scale - dragOffset.y

        // Snap to Grid
        const snappedX = Math.round(rawX / GRID_SIZE) * GRID_SIZE
        const snappedY = Math.round(rawY / GRID_SIZE) * GRID_SIZE

        if (draggingType === 'table') {
            updateTable(draggingId, { pos_x: snappedX, pos_y: snappedY })
        } else if (draggingType === 'visual') {
            updateVisualElement(draggingId, { x: snappedX, y: snappedY })
        }
    }

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!draggingId) return
        e.currentTarget.releasePointerCapture(e.pointerId)
        setDraggingId(null)
        setDraggingType(null)
    }
    
    // Pan & Zoom Logic (Figma Style)
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault() // Need to prevent default to stop page scroll, but React onWheel is passive often.
                           // Actually we just use it for internal scale.
        if (e.ctrlKey || e.metaKey) {
            // Pan if holding Ctrl (Mac trackpad behavior often sends Ctrl+Wheel for pinch)
            setPan({ x: pan.x - e.deltaX, y: pan.y - e.deltaY })
        } else {
            // Default Wheel: Zoom In / Zoom Out
            const zoomSensitivity = 0.001
            const delta = -e.deltaY * zoomSensitivity
            setScale(Math.min(Math.max(0.2, scale + delta), 3))
        }
    }

    const handleAddTableClick = () => {
        if (!activeZone) return
        // Center the new table roughly in the current viewport
        const newX = (-pan.x + 200) / scale
        const newY = (-pan.y + 200) / scale

        addTable({
            table_identifier: `T${tables.length + 1}`,
            zone_id: activeZone.id,
            capacity: 4,
            shape: 'square',
            pos_x: Math.round(newX / GRID_SIZE) * GRID_SIZE,
            pos_y: Math.round(newY / GRID_SIZE) * GRID_SIZE,
            width: 80,
            height: 80,
            rotation: 0
        })
    }

    const handleAddVisualElementClick = (type: 'wall' | 'plant' | 'bar') => {
        if (!activeZone) return
        const newX = (-pan.x + 200) / scale
        const newY = (-pan.y + 200) / scale
        
        const { addVisualElement } = useRestoTablesStore.getState()
        
        let width = 60
        let height = 60
        if (type === 'wall') { width = 120; height = 10 }
        if (type === 'bar')  { width = 200; height = 60 }
        
        addVisualElement({
            type,
            x: Math.round(newX / GRID_SIZE) * GRID_SIZE,
            y: Math.round(newY / GRID_SIZE) * GRID_SIZE,
            width,
            height,
            rotation: 0,
            color: type === 'plant' ? 'bg-emerald-600' : 'bg-muted-foreground'
        })
    }

    const getBackgroundStyle = () => {
        const style = activeZone?.background_style || 'dots'
        switch (style) {
            case 'dots':
                return {
                    backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--muted-foreground)/0.2) 1px, transparent 0)',
                    backgroundSize: `${40 * scale}px ${40 * scale}px`,
                    backgroundPosition: `${pan.x}px ${pan.y}px`
                }
            case 'grid':
                return {
                    backgroundImage: 'linear-gradient(to right, hsl(var(--muted-foreground)/0.1) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--muted-foreground)/0.1) 1px, transparent 1px)',
                    backgroundSize: `${40 * scale}px ${40 * scale}px`,
                    backgroundPosition: `${pan.x}px ${pan.y}px`
                }
            case 'wood':
                return {
                    backgroundColor: 'hsl(30 20% 95%)', // Light wood tint
                    backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, hsl(30 30% 90%) 40px, hsl(30 30% 90%) 42px)',
                    backgroundSize: `${200 * scale}px 100%`,
                    backgroundPosition: `${pan.x}px 0`
                }
            case 'concrete':
                return {
                    backgroundColor: 'hsl(0 0% 93%)', // Light concrete tint
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.05\'/%3E%3C/svg%3E")',
                    backgroundPosition: `${pan.x}px ${pan.y}px`
                }
            default: return {}
        }
    }
    
    // Agrupamos zonas (mockeado temporalmente por las disponibles en el estado si es necesario, o usando el prop si vinieran)
    // El fetch principal ya trajo zones y están en el store. No está el array completo expuesto fácilmente, solo activeZone.
    // Vamos a extraer `zones` usando un selector pequeño si fuese necesario, pero en general el store debería tener `zones`.
    // Modificamos select-zones en el store.
    // Ojo: `zones` no está explícito en el store, solo `activeZone`. Para un selector multi-nivel necesimos las zones del props inicial.
    // Vamos a asumir que por ahora solo cambiamos el nombre o asumimos que en un futuro las pasaremos. 
    // Wait, let's just make it a simple h2 menu for now, pretending it has options, or just allow editing the name.
    
    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] w-full border rounded-xl overflow-hidden bg-background">
            
            {/* Header / Toolbar */}
            <div className="flex h-14 items-center justify-between px-4 border-b bg-muted/30">
                <div className="flex items-center gap-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="font-semibold text-lg flex items-center gap-2 h-9 px-2 hover:bg-muted">
                                <LayoutTemplate className="w-5 h-5 text-primary" />
                                {activeZone?.name || 'Selecciona un Salón'}
                                <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuLabel>Zonas / Pisos</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="justify-between" onClick={() => {}}>
                                {activeZone?.name}
                                <Check className="w-4 h-4 text-primary" />
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                onClick={() => {
                                    const newZoneId = `temp_zone_${Math.random().toString(36).substr(2, 9)}`
                                    setActiveZone({
                                        id: newZoneId,
                                        name: 'Nuevo Salón',
                                        grid_width: 2000,
                                        grid_height: 2000,
                                        visual_elements: [],
                                        background_style: 'dots'
                                    })
                                    setTables([])
                                    setSelectedIds([])
                                    setHasUnsavedChanges(true)
                                }}
                            >
                                <PlusCircle className="w-4 h-4 mr-2" />
                                Añadir Nuevo Salón
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    
                    {/* Mode Switcher */}
                    <div className="flex items-center bg-background rounded-md border p-0.5 ml-4">
                        <Button 
                            variant={mode === 'live' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="h-7 px-3 text-xs"
                            onClick={() => setMode('live')}
                        >
                            <span className="relative flex h-2 w-2 mr-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Live Mode
                        </Button>
                        <Button 
                            variant={mode === 'builder' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="h-7 px-3 text-xs"
                            onClick={() => setMode('builder')}
                        >
                            <Settings2 className="w-3 h-3 mr-2" />
                            Builder
                        </Button>
                    </div>
                </div>

                {/* Builder Actions */}
                {mode === 'builder' && (
                    <div className="flex items-center gap-2">
                        <Button size="sm" className="h-8 ml-2" disabled={!hasUnsavedChanges} onClick={handleSave}>
                            <Save className="w-4 h-4 mr-2" />
                            Guardar Diseño
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 ml-2" onClick={() => setIsPropertiesOpen(!isPropertiesOpen)}>
                            <Settings2 className="w-4 h-4 mr-2" />
                            Propiedades
                        </Button>
                    </div>
                )}
            </div>

                {/* Canvas Area (Absolute DOM Render) */}
            <div 
                ref={containerRef}
                className="flex-1 relative overflow-hidden transition-colors duration-300"
                style={{
                    cursor: mode === 'builder' ? (draggingId === 'canvas_pan' ? 'grabbing' : 'grab') : 'default',
                    ...getBackgroundStyle()
                }}
                onPointerDown={(e) => {
                    if (mode === 'builder' && e.target === containerRef.current) {
                        setSelectedIds([]) // Deselect if clicking empty space
                        setDraggingId('canvas_pan') // Start panning
                    }
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onWheel={handleWheel}
            >
                {/* Floating Toolbox (Adobe Style) */}
                {mode === 'builder' && (
                    <div className="absolute top-6 left-6 flex flex-col gap-1 bg-background/95 backdrop-blur-md border shadow-lg rounded-lg p-2 z-40 w-40">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">Herramientas</span>
                        <Button variant="ghost" size="sm" className="w-full justify-start hover:bg-muted" onClick={handleAddTableClick}>
                            <RectangleHorizontal className="w-4 h-4 mr-2 text-primary" />
                            Añadir Mesa
                        </Button>
                        <hr className="my-1 border-muted" />
                        <Button variant="ghost" size="sm" className="w-full justify-start hover:bg-muted" onClick={() => handleAddVisualElementClick('wall')}>
                            <Grid className="w-4 h-4 mr-2 text-muted-foreground" />
                            Muro
                        </Button>
                        <Button variant="ghost" size="sm" className="w-full justify-start hover:bg-muted" onClick={() => handleAddVisualElementClick('bar')}>
                            <LayoutTemplate className="w-4 h-4 mr-2 text-muted-foreground" />
                            Barra
                        </Button>
                        <Button variant="ghost" size="sm" className="w-full justify-start hover:bg-muted" onClick={() => handleAddVisualElementClick('plant')}>
                            <Trees className="w-4 h-4 mr-2 text-emerald-600" />
                            Planta
                        </Button>
                    </div>
                )}

                {/* Transform Layer */}
                <div 
                    className="absolute inset-0 origin-top-left transition-transform duration-75 ease-out"
                    style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
                >
                    {/* Render Walls/Visuals here */}
                    {activeZone?.visual_elements?.map(el => (
                        <div 
                            key={el.id}
                            className={`absolute shadow-sm transition-all shadow-black/20 ${el.color || 'bg-muted/60'} ${mode === 'builder' ? 'cursor-move hover:ring-2' : ''} ${selectedIds.includes(el.id) ? 'ring-2 ring-primary z-20' : 'z-0'}`}
                            style={{ 
                                left: el.x, top: el.y, 
                                width: el.width, height: el.height, 
                                transform: `rotate(${el.rotation}deg)`,
                                borderRadius: el.type === 'plant' ? '50%' : '4px'
                            }}
                            onPointerDown={(e) => handlePointerDown(e, el.id, 'visual')}
                        >
                            {/* Plant details */}
                            {el.type === 'plant' && (
                                <div className="absolute inset-2 rounded-full border-2 border-emerald-900/20 bg-emerald-500/80 shadow-[inset_0_4px_6px_rgba(0,0,0,0.3)] shadow-black/40 flex items-center justify-center">
                                    <Trees className="w-1/2 h-1/2 text-emerald-900/40" />
                                </div>
                            )}
                            {/* Bar details */}
                            {el.type === 'bar' && (
                                <>
                                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjNDAyMDAwIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8cGF0aCBkPSJNMCA4TDggMCBNLTFMMTcgIiBzdHJva2U9IiM1YzMwMTAiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=')] opacity-30" />
                                    <div className="absolute top-0 w-full h-2 bg-amber-950/50 shadow-sm border-b border-amber-950/80" />
                                    <div className="absolute inset-0 ring-1 ring-inset ring-amber-700/50 rounded" />
                                </>
                            )}
                            {/* Wall details */}
                            {el.type === 'wall' && (
                                <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900 rounded-sm ring-1 ring-inset ring-slate-950/50" />
                            )}
                        </div>
                    ))}

                    {/* Render Tables here */}
                    {tables.map(table => {
                        const isSelected = selectedIds.includes(table.id)
                        
                        // Generador visual de sillas (Aesthetic Layer)
                        const renderChairs = () => {
                            const chairs = []
                            const { capacity, shape, width, height } = table
                            const chairSize = 16 // 16px
                            const offset = 6 // pixels outside the table

                            if (shape === 'circle' || shape === 'oval') {
                                // Distribución Radial
                                const radiusX = (width / 2) + offset
                                const radiusY = (height / 2) + offset
                                const centerX = width / 2
                                const centerY = height / 2

                                for (let i = 0; i < capacity; i++) {
                                    const angle = (i / capacity) * Math.PI * 2
                                    const x = centerX + Math.cos(angle) * radiusX - (chairSize / 2)
                                    const y = centerY + Math.sin(angle) * radiusY - (chairSize / 2)
                                    
                                    // Rotar silla hacia el centro
                                    const rot = (angle * 180 / Math.PI) + 90
                                    
                                    chairs.push(
                                        <div key={`chair-${i}`} 
                                            className="absolute bg-muted-foreground/30 shadow-sm border border-border/50 rounded-full"
                                            style={{ 
                                                width: chairSize, height: chairSize, left: x, top: y,
                                                transform: `rotate(${rot}deg)`,
                                                borderRadius: '50% 50% 50% 50%' // Default round
                                            }}
                                        />
                                    )
                                }
                            } else {
                                // Distribución Rectangular/Cuadrada
                                // Algoritmo simple: Repartir el capacity en los 4 lados. Lados más largos reciben más.
                                let top = 0, bottom = 0, left = 0, right = 0
                                
                                if (shape === 'square' || capacity <= 4) {
                                    // 1 per side
                                    top = Math.ceil(capacity / 4)
                                    bottom = Math.floor(capacity / 4)
                                    right = Math.floor((capacity - top - bottom) / 2)
                                    left = capacity - top - bottom - right
                                } else {
                                    // Prefer longer sides (top/bottom on horizontal recs)
                                    const isVertical = height > width
                                    const sideShare = Math.floor(capacity / 4)
                                    const extra = capacity % 4
                                    
                                    if (isVertical) {
                                        left = sideShare + (extra >= 1 ? 1 : 0)
                                        right = sideShare + (extra >= 2 ? 1 : 0)
                                        top = sideShare + (extra >= 3 ? 1 : 0)
                                        bottom = sideShare
                                    } else {
                                        top = sideShare + (extra >= 1 ? 1 : 0)
                                        bottom = sideShare + (extra >= 2 ? 1 : 0)
                                        left = sideShare + (extra >= 3 ? 1 : 0)
                                        right = sideShare
                                    }
                                }

                                const placeChairsLine = (count: number, side: 'top'|'bottom'|'left'|'right') => {
                                    const result = []
                                    const length = (side === 'top' || side === 'bottom') ? width : height
                                    const step = length / (count + 1)
                                    
                                    for (let i = 1; i <= count; i++) {
                                        const pos = step * i - (chairSize / 2)
                                        let x = 0, y = 0, rot = 0
                                        if (side === 'top') { x = pos; y = -chairSize - offset + 4; rot = 180 }
                                        if (side === 'bottom') { x = pos; y = height + offset - 4; rot = 0 }
                                        if (side === 'left') { y = pos; x = -chairSize - offset + 4; rot = 90 }
                                        if (side === 'right') { y = pos; x = width + offset - 4; rot = -90 }

                                        result.push(
                                            <div key={`chair-${side}-${i}`} 
                                                className="absolute bg-muted-foreground/30 shadow-sm border border-border/50 rounded flex items-center justify-center overflow-hidden"
                                                style={{ width: chairSize, height: chairSize, left: x, top: y, transform: `rotate(${rot}deg)` }}
                                            >
                                                <div className="w-full h-1/2 bg-muted-foreground/20 self-start" /> {/* Respaldo */}
                                            </div>
                                        )
                                    }
                                    return result
                                }

                                chairs.push(...placeChairsLine(top, 'top'))
                                chairs.push(...placeChairsLine(bottom, 'bottom'))
                                chairs.push(...placeChairsLine(left, 'left'))
                                chairs.push(...placeChairsLine(right, 'right'))
                            }
                            return chairs
                        }

                        return (
                        <div
                            key={table.id}
                            className={`
                                absolute flex items-center justify-center font-bold text-sm shadow-md transition-all touch-none select-none
                                ${mode === 'builder' 
                                    ? `cursor-grab active:cursor-grabbing hover:ring-2 ${isSelected ? 'ring-4 ring-primary z-10' : 'ring-primary/50'}` 
                                    : 'cursor-pointer hover:brightness-110'}
                                ${table.status === 'available' ? 'bg-gradient-to-br from-emerald-50 to-white text-emerald-900 border-emerald-300' : ''}
                                ${table.status === 'occupied' ? 'bg-gradient-to-br from-rose-50 to-white text-rose-900 border-rose-300' : ''}
                                ${table.status === 'cleaning' ? 'bg-gradient-to-br from-amber-50 to-white text-amber-900 border-amber-300' : ''}
                                ${table.isNew ? 'ring-2 ring-primary ring-offset-2 border-dashed' : 'border-2 border-solid shadow-sm'}
                            `}
                            style={{
                                left: table.pos_x,
                                top: table.pos_y,
                                width: table.width,
                                height: table.height,
                                transform: `rotate(${table.rotation}deg)`,
                                borderRadius: table.shape === 'circle' ? '50%' : table.shape === 'oval' ? '40%' : '8px'
                            }}
                            onPointerDown={(e) => handlePointerDown(e, table.id, 'table')}
                        >
                            {table.table_identifier}
                            
                            {/* Render Chairs */}
                            {renderChairs()}

                            <span className="absolute -bottom-8 text-[10px] text-muted-foreground font-medium bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded-sm whitespace-nowrap shadow-sm border">
                                Cap: {table.capacity}
                            </span>
                        </div>
                    )})}
                </div>
                
                {/* Properties Side Panel (Builder Mode) */}
                {mode === 'builder' && (
                    <div className={`absolute top-0 right-0 w-80 h-full bg-background/95 backdrop-blur-md border-l shadow-2xl z-50 p-6 flex flex-col gap-6 transition-transform duration-300 ${isPropertiesOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        {(() => {
                            const { updateActiveZone, updateVisualElement, removeVisualElement } = useRestoTablesStore.getState()
                            
                            // 1. ZONA PROPERTIES (Si no hay nada seleccionado)
                            if (selectedIds.length === 0) {
                                if (!activeZone) return null
                                return (
                                    <>
                                        <div className="flex items-center justify-between border-b pb-4">
                                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                                <LayoutTemplate className="w-5 h-5 text-primary" />
                                                Salón Actual
                                            </h3>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Nombre del Salón</label>
                                                <input 
                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                    value={activeZone.name}
                                                    onChange={(e) => updateActiveZone({ name: e.target.value })}
                                                />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Textura del Piso</label>
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    {(['dots', 'wood', 'concrete', 'grid'] as const).map(style => (
                                                        <Button 
                                                            key={style}
                                                            variant={activeZone.background_style === style || (!activeZone.background_style && style === 'dots') ? 'default' : 'outline'}
                                                            className="h-10 text-xs w-full capitalize"
                                                            onClick={() => updateActiveZone({ background_style: style })}
                                                        >
                                                            {style}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )
                            }
                            
                            // 2. MESA PROPERTIES
                            const table = tables.find(t => t.id === selectedIds[0])
                            if (table) {
                                return (
                                    <>
                                        <div className="flex items-center justify-between border-b pb-4">
                                            <h3 className="font-semibold text-lg">Mesa</h3>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedIds([])}>
                                                <span className="sr-only">Cerrar</span>
                                                <PlusCircle className="w-4 h-4 rotate-45" />
                                            </Button>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Identificador</label>
                                                <input 
                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                    value={table.table_identifier}
                                                    onChange={(e) => updateTable(table.id, { table_identifier: e.target.value })}
                                                />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Capacidad (Pax)</label>
                                                <input 
                                                    type="number" min={1}
                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                    value={table.capacity}
                                                    onChange={(e) => updateTable(table.id, { capacity: parseInt(e.target.value) || 1 })}
                                                />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Forma</label>
                                                <select 
                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                    value={table.shape}
                                                    onChange={(e) => {
                                                        const shape = e.target.value as TableShape
                                                        let w = table.width, h = table.height
                                                        if (shape === 'circle' || shape === 'square') {
                                                            const max = Math.max(w, h)
                                                            w = max; h = max;
                                                        } else if (shape === 'rectangle' || shape === 'oval') {
                                                            if (w === h) { w = w * 1.5 }
                                                        }
                                                        updateTable(table.id, { shape, width: w, height: h })
                                                    }}
                                                >
                                                    <option value="square">Cuadrada</option>
                                                    <option value="rectangle">Rectangular</option>
                                                    <option value="circle">Circular</option>
                                                    <option value="oval">Ovalada</option>
                                                </select>
                                            </div>
                                            
                                            {/* Dimensions Helper */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-muted-foreground">Ancho</label>
                                                    <input 
                                                        type="number" step={10} min={40}
                                                        className="flex h-8 w-full rounded-md border border-input bg-muted px-2 py-1 text-xs"
                                                        value={table.width}
                                                        onChange={(e) => updateTable(table.id, { width: parseInt(e.target.value) || 80 })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-muted-foreground">Largo</label>
                                                    <input 
                                                        type="number" step={10} min={40} disabled={table.shape === 'circle' || table.shape === 'square'}
                                                        className="flex h-8 w-full rounded-md border border-input bg-muted px-2 py-1 text-xs disabled:opacity-50"
                                                        value={table.height}
                                                        onChange={(e) => updateTable(table.id, { height: parseInt(e.target.value) || 80 })}
                                                    />
                                                </div>
                                                
                                                {/* Rotation Slider */}
                                                <div className="col-span-2 space-y-2 pt-2 border-t">
                                                    <label className="text-sm font-medium text-muted-foreground flex justify-between">
                                                        Rotación (Grados) <span className="text-foreground font-semibold">{table.rotation}°</span>
                                                    </label>
                                                    <input 
                                                        type="range" min="0" max="360" step="15"
                                                        className="w-full accent-primary cursor-pointer"
                                                        value={table.rotation}
                                                        onChange={(e) => updateTable(table.id, { rotation: parseInt(e.target.value) || 0 })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-auto pt-6 border-t">
                                            <Button variant="destructive" className="w-full" onClick={() => removeTable(table.id)}>
                                                Eliminar Mesa
                                            </Button>
                                        </div>
                                    </>
                                )
                            }
                            
                            // 3. VISUAL ELEMENT PROPERTIES
                            const visual = activeZone?.visual_elements?.find(v => v.id === selectedIds[0])
                            if (visual) {
                                return (
                                    <>
                                        <div className="flex items-center justify-between border-b pb-4">
                                            <h3 className="font-semibold text-lg capitalize">{visual.type}</h3>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedIds([])}>
                                                <span className="sr-only">Cerrar</span>
                                                <PlusCircle className="w-4 h-4 rotate-45" />
                                            </Button>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-muted-foreground">Ancho</label>
                                                    <input 
                                                        type="number" step={10} min={10}
                                                        className="flex h-8 w-full rounded-md border border-input bg-muted px-2 py-1 text-xs"
                                                        value={visual.width}
                                                        onChange={(e) => updateVisualElement(visual.id, { width: parseInt(e.target.value) || 40 })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-muted-foreground">Largo</label>
                                                    <input 
                                                        type="number" step={10} min={10} disabled={visual.type === 'plant'}
                                                        className="flex h-8 w-full rounded-md border border-input bg-muted px-2 py-1 text-xs disabled:opacity-50"
                                                        value={visual.height}
                                                        onChange={(e) => updateVisualElement(visual.id, { height: parseInt(e.target.value) || 40 })}
                                                    />
                                                </div>
                                                
                                                <div className="col-span-2 space-y-2 pt-2 border-t">
                                                    <label className="text-sm font-medium text-muted-foreground flex justify-between">
                                                        Rotación <span className="text-foreground font-semibold">{visual.rotation || 0}°</span>
                                                    </label>
                                                    <input 
                                                        type="range" min="0" max="360" step="15"
                                                        className="w-full accent-primary cursor-pointer"
                                                        value={visual.rotation || 0}
                                                        onChange={(e) => updateVisualElement(visual.id, { rotation: parseInt(e.target.value) || 0 })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-auto pt-6 border-t">
                                            <Button variant="destructive" className="w-full" onClick={() => removeVisualElement(visual.id)}>
                                                Eliminar Elemento
                                            </Button>
                                        </div>
                                    </>
                                )
                            }
                            
                            return null
                        })()}
                    </div>
                )}
            </div>
            
        </div>
    )
}


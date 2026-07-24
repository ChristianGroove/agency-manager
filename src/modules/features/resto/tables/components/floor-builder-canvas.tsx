'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    BackgroundVariant,
    ReactFlowProvider,
    useReactFlow,
    Panel,
    Node,
    Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import TableNode, { TableNodeData } from '../nodes/TableNode'
import WallNode, { WallNodeData } from '../nodes/WallNode'
import DecorNode, { DecorNodeData, DecorType } from '../nodes/DecorNode'
import { TablePropertiesPanel } from './table-properties-panel'
import { RestoTable, RestoZone, VisualElement } from '../store/use-tables-store'
import { saveLayout, deleteZone, renameZone, updateTableStatus } from '../actions'
import { toast } from 'sonner'
import { cn } from '@/modules/infrastructure/utils/utils'
import { supabase } from '@/modules/core/database/supabase'
import { useRouter } from 'next/navigation'

import {
    Save,
    Undo2,
    Redo2,
    LayoutGrid,
    Eye,
    Pencil,
    Plus,
    Trash2,
    ZoomIn,
    ZoomOut,
    Maximize2,
    ChevronLeft,
    ChevronRight,
    Circle,
    Square,
    RectangleHorizontal,
    GripVertical,
    Check,
    X,
    MoreHorizontal,
    MapPin,
    Users,
    ClipboardList,
    Armchair,
    AlertCircle,
    Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet'

// ─── Node Types ─────────────────────────────────────────────────────────────
const nodeTypes = {
    table: TableNode,
    wall: WallNode,
    decor: DecorNode,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const makeId = (prefix: string) => `temp_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

function tablesToNodes(tables: RestoTable[], isBuilder: boolean): Node[] {
    return tables.map(t => ({
        id: t.id,
        type: 'table',
        position: { x: t.pos_x, y: t.pos_y },
        data: {
            label: t.table_identifier,
            tableIdentifier: t.table_identifier,
            capacity: t.capacity,
            shape: t.shape,
            status: t.status,
            qrToken: t.qr_token,
            isBuilder,
        } as TableNodeData,
        width: t.width || 120,
        height: t.height || 120,
        draggable: isBuilder,
        selectable: isBuilder,
        style: { width: t.width || 120, height: t.height || 120 },
    }))
}

function visualElementsToNodes(elements: VisualElement[], isBuilder: boolean): Node[] {
    return elements.map(el => {
        const isWall = el.type === 'wall'
        return {
            id: el.id,
            type: isWall ? 'wall' : 'decor',
            position: { x: el.x, y: el.y },
            data: isWall
                ? { color: el.color || '#78716c', isBuilder } as WallNodeData
                : { decorType: el.type as DecorType, isBuilder } as DecorNodeData,
            width: el.width,
            height: el.height,
            draggable: isBuilder,
            selectable: isBuilder,
            style: { width: el.width, height: el.height },
        }
    })
}

// ─── Status config ────────────────────────────────────────────────────────────
const TABLE_STATUSES = [
    { key: 'available', label: 'Disponible', color: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-600', lightBg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800' },
    { key: 'occupied',  label: 'Ocupada',    color: '#ef4444', bg: 'bg-red-500',     text: 'text-red-600',     lightBg: 'bg-red-50 dark:bg-red-950/30',     border: 'border-red-200 dark:border-red-800' },
    { key: 'reserved',  label: 'Reservada',  color: '#f59e0b', bg: 'bg-amber-500',   text: 'text-amber-600',   lightBg: 'bg-amber-50 dark:bg-amber-950/30',   border: 'border-amber-200 dark:border-amber-800' },
    { key: 'cleaning',  label: 'Limpieza',   color: '#3b82f6', bg: 'bg-blue-500',    text: 'text-blue-600',    lightBg: 'bg-blue-50 dark:bg-blue-950/30',    border: 'border-blue-200 dark:border-blue-800' },
    { key: 'billing',   label: 'Facturando', color: '#8b5cf6', bg: 'bg-violet-500',  text: 'text-violet-600',  lightBg: 'bg-violet-50 dark:bg-violet-950/30',  border: 'border-violet-200 dark:border-violet-800' },
] as const

type TableStatus = typeof TABLE_STATUSES[number]['key']

// ─── Palette items ────────────────────────────────────────────────────────────
interface PaletteItem {
    group: string
    items: {
        type: 'table' | 'wall' | 'decor'
        label: string
        icon: React.ReactNode
        defaultData: Record<string, unknown>
        defaultSize: { w: number; h: number }
        color?: string
    }[]
}

const PALETTE: PaletteItem[] = [
    {
        group: 'Mesas',
        items: [
            {
                type: 'table', label: 'Mesa 2px', icon: <Circle className="h-4 w-4 text-emerald-600" />,
                defaultData: { label: 'Mesa', tableIdentifier: 'M-?', capacity: 2, shape: 'circle', status: 'available', isBuilder: true },
                defaultSize: { w: 90, h: 90 }
            },
            {
                type: 'table', label: 'Mesa 4px', icon: <Square className="h-4 w-4 text-emerald-600" />,
                defaultData: { label: 'Mesa', tableIdentifier: 'M-?', capacity: 4, shape: 'square', status: 'available', isBuilder: true },
                defaultSize: { w: 110, h: 110 }
            },
            {
                type: 'table', label: 'Mesa 6px', icon: <RectangleHorizontal className="h-4 w-4 text-emerald-600" />,
                defaultData: { label: 'Mesa', tableIdentifier: 'M-?', capacity: 6, shape: 'rectangle', status: 'available', isBuilder: true },
                defaultSize: { w: 160, h: 100 }
            },
            {
                type: 'table', label: 'Mesa VIP', icon: <RectangleHorizontal className="h-4 w-4 text-amber-600" />,
                defaultData: { label: 'VIP', tableIdentifier: 'VIP-?', capacity: 8, shape: 'rectangle', status: 'available', isBuilder: true },
                defaultSize: { w: 200, h: 110 }
            },
            {
                type: 'table', label: 'Mesa larga', icon: <RectangleHorizontal className="h-4 w-4 text-blue-600" />,
                defaultData: { label: 'Banca', tableIdentifier: 'B-?', capacity: 12, shape: 'rectangle', status: 'available', isBuilder: true },
                defaultSize: { w: 280, h: 90 }
            },
        ]
    },
    {
        group: 'Estructura',
        items: [
            {
                type: 'wall', label: 'Muro H', icon: <RectangleHorizontal className="h-4 w-4 text-zinc-500" />,
                defaultData: { color: '#78716c', isBuilder: true },
                defaultSize: { w: 200, h: 20 }
            },
            {
                type: 'wall', label: 'Muro V', icon: <RectangleHorizontal className="h-4 w-4 text-zinc-500 rotate-90" />,
                defaultData: { color: '#78716c', isBuilder: true },
                defaultSize: { w: 20, h: 200 }
            },
        ]
    },
    {
        group: 'Ambientación',
        items: [
            {
                type: 'decor', label: 'Planta', icon: <span className="text-sm">🌿</span>,
                defaultData: { decorType: 'plant', label: 'Planta', isBuilder: true },
                defaultSize: { w: 60, h: 60 }
            },
            {
                type: 'decor', label: 'Barra', icon: <span className="text-sm">🍺</span>,
                defaultData: { decorType: 'bar', label: 'Barra', isBuilder: true },
                defaultSize: { w: 180, h: 70 }
            },
            {
                type: 'decor', label: 'Ventana', icon: <span className="text-sm">🪟</span>,
                defaultData: { decorType: 'window', label: 'Ventana', isBuilder: true },
                defaultSize: { w: 80, h: 20 }
            },
            {
                type: 'decor', label: 'Puerta', icon: <span className="text-sm">🚪</span>,
                defaultData: { decorType: 'door', label: 'Puerta', isBuilder: true },
                defaultSize: { w: 60, h: 20 }
            },
            {
                type: 'decor', label: 'Cocina', icon: <span className="text-sm">👨‍🍳</span>,
                defaultData: { decorType: 'kitchen', label: 'Cocina', isBuilder: true },
                defaultSize: { w: 120, h: 80 }
            },
            {
                type: 'decor', label: 'Baños', icon: <span className="text-sm">🚻</span>,
                defaultData: { decorType: 'restroom', label: 'Baños', isBuilder: true },
                defaultSize: { w: 80, h: 80 }
            },
            {
                type: 'decor', label: 'Recepción', icon: <span className="text-sm">🛎️</span>,
                defaultData: { decorType: 'reception', label: 'Recepción', isBuilder: true },
                defaultSize: { w: 100, h: 60 }
            },
            {
                type: 'decor', label: 'Escaleras', icon: <span className="text-sm">🪜</span>,
                defaultData: { decorType: 'stairs', label: 'Escaleras', isBuilder: true },
                defaultSize: { w: 100, h: 80 }
            },
            {
                type: 'decor', label: 'Etiqueta', icon: <span className="text-sm">🏷️</span>,
                defaultData: { decorType: 'label', label: 'Zona', isBuilder: true },
                defaultSize: { w: 100, h: 50 }
            },
        ]
    },
]

// ─── Props ───────────────────────────────────────────────────────────────────
interface FloorBuilderCanvasInnerProps {
    initialZones: RestoZone[]
    initialTables: RestoTable[]
    orgId: string
    orgSlug?: string
    /** Embed mode: hides builder controls, forces Live mode */
    readOnly?: boolean
    /** Called when a table node is clicked in Live mode */
    onTableClick?: (table: RestoTable) => void
    /** Initial mode override */
    defaultMode?: 'live' | 'builder'
}

function FloorBuilderCanvasInner({
    initialZones,
    initialTables,
    orgId,
    orgSlug,
    readOnly = false,
    onTableClick,
    defaultMode,
}: FloorBuilderCanvasInnerProps) {
    const { screenToFlowPosition, fitView } = useReactFlow()
    const wrapperRef = useRef<HTMLDivElement>(null)

    const router = useRouter()

    // ── Zones & mode ──────────────────────────────────────────────────────────
    const [zones, setZones] = useState<RestoZone[]>(
        initialZones.length > 0 ? initialZones : [{
            id: 'temp_main',
            name: 'Salón Principal',
            grid_width: 1200,
            grid_height: 900,
            visual_elements: [],
        }]
    )
    const [allTables, setAllTables] = useState<RestoTable[]>(initialTables)

    useEffect(() => {
        setAllTables(initialTables)
    }, [initialTables])

    const [activeZoneId, setActiveZoneId] = useState<string>(zones[0]?.id || 'temp_main')
    const [mode, setMode] = useState<'live' | 'builder'>(
        defaultMode ?? (readOnly ? 'live' : 'builder')
    )
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [propsPanelOpen, setPropsPanelOpen] = useState(false)
    const [selectedNode, setSelectedNode] = useState<Node | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [snapToGrid, setSnapToGrid] = useState(true)

    // ── Zone management state ─────────────────────────────────────────────────
    const [addZoneOpen, setAddZoneOpen] = useState(false)
    const [newZoneName, setNewZoneName] = useState('')
    const [deleteZoneDialog, setDeleteZoneDialog] = useState<{ open: boolean; zone: RestoZone | null }>({ open: false, zone: null })
    const [isDeletingZone, setIsDeletingZone] = useState(false)
    const [renamingZoneId, setRenamingZoneId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState('')

    // ── Live mode: selected table sheet ──────────────────────────────────────
    const [liveSelectedTable, setLiveSelectedTable] = useState<RestoTable | null>(null)
    const [liveSheetOpen, setLiveSheetOpen] = useState(false)
    const [isChangingStatus, setIsChangingStatus] = useState(false)

    // ── Unsaved changes tracking ──────────────────────────────────────────────
    const [isDirty, setIsDirty] = useState(false)
    const [pendingZoneId, setPendingZoneId] = useState<string | null>(null)
    const [unsavedModalOpen, setUnsavedModalOpen] = useState(false)

    // ── RF state ──────────────────────────────────────────────────────────────
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

    const handleNodesChange = useCallback((changes: any) => {
        onNodesChange(changes)
        if (mode === 'builder' && !readOnly) {
            const hasUserMods = changes.some((c: any) => c.type === 'position' || c.type === 'dimensions' || c.type === 'remove')
            if (hasUserMods) {
                setIsDirty(true)
            }
        }
    }, [onNodesChange, mode, readOnly])

    const handleRequestZoneSwitch = useCallback((targetZoneId: string) => {
        if (targetZoneId === activeZoneId) return
        if (isDirty) {
            setPendingZoneId(targetZoneId)
            setUnsavedModalOpen(true)
        } else {
            setActiveZoneId(targetZoneId)
        }
    }, [activeZoneId, isDirty])

    // ── Undo/Redo ──────────────────────────────────────────────────────────────
    const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)

    const saveToHistory = useCallback(() => {
        setHistory(prev => {
            const next = prev.slice(0, historyIndex + 1)
            next.push({ nodes: [...nodes], edges: [...edges] })
            setHistoryIndex(next.length - 1)
            return next
        })
    }, [nodes, edges, historyIndex])

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const prev = history[historyIndex - 1]
            setNodes(prev.nodes)
            setEdges(prev.edges)
            setHistoryIndex(i => i - 1)
        }
    }, [history, historyIndex, setNodes, setEdges])

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const next = history[historyIndex + 1]
            setNodes(next.nodes)
            setEdges(next.edges)
            setHistoryIndex(i => i + 1)
        }
    }, [history, historyIndex, setNodes, setEdges])

    // ── Load zone on switch ────────────────────────────────────────────────────
    useEffect(() => {
        const zone = zones.find(z => z.id === activeZoneId)
        if (!zone) return
        const isBuilderMode = mode === 'builder'
        const zoneTables = allTables.filter(t => t.zone_id === activeZoneId)
        const tableNodes = tablesToNodes(zoneTables, isBuilderMode)
        const decorNodes = visualElementsToNodes(zone.visual_elements || [], isBuilderMode)
        setNodes([...tableNodes, ...decorNodes])
        setEdges([])
        setTimeout(() => fitView({ padding: 0.15 }), 100)
    }, [activeZoneId, mode, allTables, zones])

    // ── Mode toggle: update isBuilder flag on all nodes ────────────────────────
    useEffect(() => {
        setNodes(nds => nds.map(n => ({
            ...n,
            draggable: mode === 'builder' && !readOnly,
            selectable: mode === 'builder' && !readOnly,
            data: { ...n.data, isBuilder: mode === 'builder' && !readOnly }
        })))
    }, [mode, readOnly, setNodes])

    // ── Realtime sync for tables in live mode ────────────────────────────────
    useEffect(() => {
        if (mode !== 'live' || !orgId) return
        const channel = supabase.channel(`canvas-live-tables-${orgId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'resto_tables', filter: `organization_id=eq.${orgId}` }, (payload) => {
                const updatedTable = payload.new
                setNodes(nds => nds.map(n => {
                    if (n.id === updatedTable.id) {
                        return { ...n, data: { ...n.data, status: updatedTable.status, current_session_id: updatedTable.current_session_id } }
                    }
                    return n
                }))
            })
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
    }, [mode, orgId, setNodes])

    // ── Drag from palette ──────────────────────────────────────────────────────
    const onDragStart = useCallback((e: React.DragEvent, itemData: string) => {
        e.dataTransfer.setData('application/floor-builder', itemData)
        e.dataTransfer.effectAllowed = 'move'
    }, [])

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }, [])

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        const raw = e.dataTransfer.getData('application/floor-builder')
        if (!raw) return
        const item = JSON.parse(raw)
        const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })

        // Auto-number: count existing same type
        const sameType = nodes.filter(n => n.type === item.type).length + 1
        const data = { ...item.defaultData }
        if (item.type === 'table') {
            data.tableIdentifier = `M-${String(sameType).padStart(2, '0')}`
            data.label = data.tableIdentifier
        }

        const newNode: Node = {
            id: makeId(item.type),
            type: item.type,
            position: {
                x: position.x - item.size.w / 2,
                y: position.y - item.size.h / 2,
            },
            data,
            width: item.size.w,
            height: item.size.h,
            style: { width: item.size.w, height: item.size.h },
        }
        setNodes(nds => [...nds, newNode])
        saveToHistory()
        setIsDirty(true)
    }, [screenToFlowPosition, setNodes, saveToHistory, nodes])

    // ── Node click ────────────────────────────────────────────────────────────
    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        if (mode === 'builder' && !readOnly) {
            setSelectedNode(node)
            setPropsPanelOpen(true)
        } else if (mode === 'live' && node.type === 'table') {
            // Live mode: open status sheet
            const d = node.data as TableNodeData
            const tableRecord = allTables.find(t => t.id === node.id) || {
                id: node.id,
                zone_id: activeZoneId,
                table_identifier: d.tableIdentifier || d.label || 'Mesa',
                capacity: d.capacity || 4,
                shape: d.shape || 'square',
                pos_x: node.position.x,
                pos_y: node.position.y,
                width: (node.style?.width as number) || 120,
                height: (node.style?.height as number) || 120,
                rotation: 0,
                status: d.status || 'available',
            } as RestoTable

            if (onTableClick) {
                onTableClick(tableRecord)
            } else {
                setLiveSelectedTable({ ...tableRecord, status: d.status || 'available' })
                setLiveSheetOpen(true)
            }
        }
    }, [mode, readOnly, allTables, activeZoneId, onTableClick])

    // ── Properties panel update ───────────────────────────────────────────────
    const handleNodeUpdate = useCallback((nodeId: string, data: Record<string, unknown>) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data } : n))
        setIsDirty(true)
    }, [setNodes])

    const handleNodeDelete = useCallback((nodeId: string) => {
        setNodes(nds => nds.filter(n => n.id !== nodeId))
        saveToHistory()
        setPropsPanelOpen(false)
        setSelectedNode(null)
        setIsDirty(true)
    }, [setNodes, saveToHistory])

    // ── Deselect on pane click ────────────────────────────────────────────────
    const onPaneClick = useCallback(() => {
        setPropsPanelOpen(false)
        setSelectedNode(null)
    }, [])

    // ── Zone management ───────────────────────────────────────────────────────
    const handleAddZone = () => {
        if (!newZoneName.trim()) return
        const newZone: RestoZone = {
            id: `temp_${Date.now()}`,
            name: newZoneName.trim(),
            grid_width: 1200,
            grid_height: 900,
            visual_elements: [],
        }
        setZones(prev => [...prev, newZone])
        setNewZoneName('')
        setAddZoneOpen(false)
        handleRequestZoneSwitch(newZone.id)
    }

    const handleStartRename = (zone: RestoZone) => {
        setRenamingZoneId(zone.id)
        setRenameValue(zone.name)
    }

    const handleConfirmRename = async () => {
        if (!renamingZoneId || !renameValue.trim()) {
            setRenamingZoneId(null)
            return
        }
        const id = renamingZoneId
        const name = renameValue.trim()
        
        // Update local state immediately
        setZones(prev => prev.map(z => z.id === id ? { ...z, name } : z))
        setRenamingZoneId(null)

        // Persist if it's a real zone
        if (!id.startsWith('temp_')) {
            const result = await renameZone(id, name)
            if (!result.success) {
                toast.error('Error al renombrar zona')
            } else {
                toast.success('Zona renombrada')
            }
        }
    }

    const handleConfirmDeleteZone = async () => {
        const zone = deleteZoneDialog.zone
        if (!zone) return
        setIsDeletingZone(true)
        try {
            if (zone.id.startsWith('temp_')) {
                // Just remove from local state
                setZones(prev => {
                    const updated = prev.filter(z => z.id !== zone.id)
                    if (activeZoneId === zone.id && updated.length > 0) {
                        setActiveZoneId(updated[0].id)
                    }
                    return updated
                })
                toast.success('Zona eliminada')
            } else {
                const result = await deleteZone(zone.id)
                if (result.success) {
                    setZones(prev => {
                        const updated = prev.filter(z => z.id !== zone.id)
                        if (activeZoneId === zone.id && updated.length > 0) {
                            setActiveZoneId(updated[0].id)
                        } else if (updated.length === 0) {
                            // Create a default empty zone locally
                            const fallback: RestoZone = {
                                id: `temp_${Date.now()}`,
                                name: 'Salón Principal',
                                grid_width: 1200,
                                grid_height: 900,
                                visual_elements: [],
                            }
                            setActiveZoneId(fallback.id)
                            return [fallback]
                        }
                        return updated
                    })
                    setNodes([])
                    toast.success('Zona eliminada')
                } else {
                    toast.error('Error al eliminar zona', { description: result.error })
                }
            }
        } finally {
            setIsDeletingZone(false)
            setDeleteZoneDialog({ open: false, zone: null })
        }
    }

    // ── Live: change table status ─────────────────────────────────────────────
    const handleChangeTableStatus = async (newStatus: TableStatus) => {
        if (!liveSelectedTable) return
        setIsChangingStatus(true)

        // Optimistically update the node color on canvas
        setNodes(nds => nds.map(n => n.id === liveSelectedTable.id
            ? { ...n, data: { ...n.data, status: newStatus } }
            : n
        ))
        setLiveSelectedTable(prev => prev ? { ...prev, status: newStatus } : null)

        if (!liveSelectedTable.id.startsWith('temp_')) {
            const result = await updateTableStatus(liveSelectedTable.id, newStatus)
            if (!result.success) {
                toast.error('Error al actualizar estado')
            } else {
                toast.success('Estado actualizado')
            }
        }
        setIsChangingStatus(false)
    }

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        const zone = zones.find(z => z.id === activeZoneId)
        if (!zone) return
        setIsSaving(true)

        const tableNodes = nodes.filter(n => n.type === 'table')
        const decorNodes = nodes.filter(n => n.type !== 'table')

        const tables: RestoTable[] = tableNodes.map(n => {
            const d = n.data as TableNodeData
            return {
                id: n.id,
                zone_id: activeZoneId,
                table_identifier: d.tableIdentifier || d.label || 'Mesa',
                capacity: d.capacity || 4,
                shape: d.shape || 'rectangle',
                pos_x: n.position.x,
                pos_y: n.position.y,
                width: (n.style?.width as number) || n.width || 120,
                height: (n.style?.height as number) || n.height || 120,
                rotation: 0,
                status: d.status || 'available',
            }
        })

        const visualElements: VisualElement[] = decorNodes.map(n => {
            const isWall = n.type === 'wall'
            const d = n.data as WallNodeData | DecorNodeData
            const elType = (isWall ? 'wall' : ((d as DecorNodeData).decorType || 'generic')) as VisualElement['type']
            return {
                id: n.id,
                type: elType,
                x: n.position.x,
                y: n.position.y,
                width: (n.style?.width as number) || n.width || 80,
                height: (n.style?.height as number) || n.height || 80,
                rotation: 0,
                color: isWall ? (d as WallNodeData).color : undefined,
            }
        })

        const updatedZone: RestoZone = { ...zone, visual_elements: visualElements }

        try {
            const result = await saveLayout(orgId, updatedZone, tables)
            if (result.success) {
                toast.success('Layout guardado')
                setIsDirty(false)

                const newZoneId = result.zoneId || activeZoneId
                const oldZoneId = activeZoneId

                const persistedZone: RestoZone = {
                    ...updatedZone,
                    id: newZoneId
                }

                const savedTablesForZone: RestoTable[] = (result.insertedTables && result.insertedTables.length > 0)
                    ? result.insertedTables
                    : tables.map(t => ({ ...t, zone_id: newZoneId }))

                // 1. Update allTables state with returned DB tables for this zone
                setAllTables(prev => {
                    const otherTables = prev.filter(t => t.zone_id !== oldZoneId && t.zone_id !== newZoneId)
                    return [...otherTables, ...savedTablesForZone]
                })

                // 2. Update zones array
                setZones(prev => prev.map(z => (z.id === oldZoneId || z.id === newZoneId) ? persistedZone : z))

                // 3. Update canvas nodes directly to ensure no frame loss or empty state
                const isBuilderMode = mode === 'builder'
                const tableNodes = tablesToNodes(savedTablesForZone, isBuilderMode)
                const decorNodes = visualElementsToNodes(persistedZone.visual_elements || [], isBuilderMode)
                setNodes([...tableNodes, ...decorNodes])

                // 4. Update activeZoneId if changed
                if (newZoneId !== activeZoneId) {
                    setActiveZoneId(newZoneId)
                }

                if (pendingZoneId) {
                    const target = pendingZoneId
                    setPendingZoneId(null)
                    setActiveZoneId(target)
                }

                router.refresh()
            } else {
                toast.error('Error al guardar', { description: result.error })
            }
        } catch (err: any) {
            toast.error('Error inesperado al guardar', { description: err?.message })
        } finally {
            setIsSaving(false)
        }
    }, [nodes, zones, activeZoneId, orgId, pendingZoneId, mode, router])

    // ── Keyboard shortcuts ─────────────────────────────────────────────────────
    useEffect(() => {
        if (readOnly) return
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') { e.preventDefault(); handleUndo() }
                if (e.key === 'y') { e.preventDefault(); handleRedo() }
                if (e.key === 's') { e.preventDefault(); handleSave() }
            }
            if (e.key === 'Escape' && renamingZoneId) {
                setRenamingZoneId(null)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [handleUndo, handleRedo, handleSave, readOnly, renamingZoneId])

    // ── Stats ──────────────────────────────────────────────────────────────────
    const tableNodes = nodes.filter(n => n.type === 'table')
    const tableCount = tableNodes.length
    const totalCapacity = tableNodes.reduce((sum, n) => sum + ((n.data as TableNodeData).capacity || 0), 0)

    const availableCount = tableNodes.filter(n => (n.data as TableNodeData).status === 'available').length
    const occupiedCount = tableNodes.filter(n => (n.data as TableNodeData).status === 'occupied').length

    const isBuilder = mode === 'builder' && !readOnly

    // ── Live status of selected table ─────────────────────────────────────────
    const selectedTableStatus = liveSelectedTable
        ? TABLE_STATUSES.find(s => s.key === liveSelectedTable.status) || TABLE_STATUSES[0]
        : TABLE_STATUSES[0]

    return (
        <div className="dnd-flow relative w-full h-full flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950 rounded-2xl">

            {/* ── Top Toolbar ────────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm z-10 shrink-0">

                {/* Zone Tabs */}
                <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto no-scrollbar">
                    {zones.map(zone => (
                        <div key={zone.id} className="relative shrink-0 flex items-center group">
                            {renamingZoneId === zone.id ? (
                                /* Inline rename input */
                                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-1">
                                    <input
                                        autoFocus
                                        value={renameValue}
                                        onChange={e => setRenameValue(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleConfirmRename()
                                            if (e.key === 'Escape') setRenamingZoneId(null)
                                        }}
                                        className="w-28 text-xs font-semibold bg-transparent outline-none px-1 py-1 text-zinc-900 dark:text-zinc-100"
                                    />
                                    <button onClick={handleConfirmRename} className="p-0.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-600">
                                        <Check className="h-3 w-3" />
                                    </button>
                                    <button onClick={() => setRenamingZoneId(null)} className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-500">
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleRequestZoneSwitch(zone.id)}
                                        className={cn(
                                            'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                                            zone.id === activeZoneId
                                                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                                                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                                        )}
                                    >
                                        {zone.name}
                                    </button>

                                    {/* Zone context menu — only in builder mode */}
                                    {!readOnly && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className={cn(
                                                    'opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700',
                                                    zone.id === activeZoneId ? 'text-white/80 hover:bg-white/20 dark:hover:bg-white/10' : 'text-zinc-400'
                                                )}>
                                                    <MoreHorizontal className="h-3 w-3" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="text-xs w-40">
                                                <DropdownMenuItem onClick={() => handleStartRename(zone)} className="gap-2 text-xs">
                                                    <Pencil className="h-3 w-3" /> Renombrar
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => setDeleteZoneDialog({ open: true, zone })}
                                                    className="gap-2 text-xs text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                                    disabled={zones.length === 1}
                                                >
                                                    <Trash2 className="h-3 w-3" /> Eliminar zona
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                    {!readOnly && (
                        <button
                            onClick={() => setAddZoneOpen(true)}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 transition-all shrink-0"
                        >
                            <Plus className="h-3 w-3" /> Zona
                        </button>
                    )}
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 shrink-0" />

                {/* Stats */}
                <div className="hidden md:flex items-center gap-3 shrink-0">
                    {mode === 'live' ? (
                        <div className="flex items-center gap-2 text-[11px]">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                <span className="font-bold text-zinc-700 dark:text-zinc-200">{availableCount}</span>
                                <span className="text-zinc-400">libres</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                                <span className="font-bold text-zinc-700 dark:text-zinc-200">{occupiedCount}</span>
                                <span className="text-zinc-400">ocupadas</span>
                            </span>
                        </div>
                    ) : (
                        <span className="text-[11px] text-zinc-400">
                            <span className="font-bold text-zinc-700 dark:text-zinc-200">{tableCount}</span> mesas ·{' '}
                            <span className="font-bold text-zinc-700 dark:text-zinc-200">{totalCapacity}</span> personas
                        </span>
                    )}
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 shrink-0" />

                {/* Undo / Redo */}
                {isBuilder && (
                    <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleUndo} disabled={historyIndex <= 0} title="Deshacer (Ctrl+Z)">
                            <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Rehacer (Ctrl+Y)">
                            <Redo2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )}

                {/* Snap Grid toggle */}
                {isBuilder && (
                    <Button
                        variant={snapToGrid ? 'default' : 'ghost'}
                        size="sm"
                        className={cn(
                            'h-7 gap-1.5 text-xs shrink-0 transition-all',
                            snapToGrid
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-700'
                        )}
                        onClick={() => setSnapToGrid(!snapToGrid)}
                        title="Snap a grid"
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{snapToGrid ? 'Grid ON' : 'Grid OFF'}</span>
                    </Button>
                )}

                {/* Mode Toggle — hidden in readOnly/embed mode */}
                {!readOnly && (
                    <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 shrink-0">
                        <button
                            onClick={() => setMode('live')}
                            className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                                mode === 'live'
                                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                                    : 'text-zinc-500 hover:text-zinc-700'
                            )}
                        >
                            <Eye className="h-3.5 w-3.5" /> Live
                        </button>
                        <button
                            onClick={() => setMode('builder')}
                            className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                                mode === 'builder'
                                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                                    : 'text-zinc-500 hover:text-zinc-700'
                            )}
                        >
                            <Pencil className="h-3.5 w-3.5" /> Builder
                        </button>
                    </div>
                )}

                {/* Save */}
                {isBuilder && (
                    <Button
                        size="sm"
                        className={cn(
                            "h-7 gap-1.5 text-xs shrink-0 transition-all font-bold",
                            isDirty ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20" : "bg-primary hover:bg-primary/90 text-white"
                        )}
                        onClick={handleSave}
                        disabled={isSaving}
                        title="Guardar (Ctrl+S)"
                    >
                        <Save className="h-3.5 w-3.5" />
                        {isSaving ? 'Guardando...' : isDirty ? 'Guardar *' : 'Guardar'}
                    </Button>
                )}
            </div>

            {/* ── Live Mode Legend ─────────────────────────────────────────────── */}
            {mode === 'live' && (
                <div className="flex items-center gap-3 px-4 py-1.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto no-scrollbar shrink-0">
                    {TABLE_STATUSES.map(s => (
                        <div key={s.key} className="flex items-center gap-1.5 shrink-0">
                            <span className={cn('w-2.5 h-2.5 rounded-full', s.bg)} />
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">{s.label}</span>
                        </div>
                    ))}
                    <div className="ml-auto shrink-0 text-[11px] text-zinc-400 italic">
                        Clic en una mesa para ver opciones
                    </div>
                </div>
            )}

            {/* ── Main Area ───────────────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* Palette Sidebar (builder only) */}
                {isBuilder && (
                    <div className={cn(
                        'shrink-0 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm transition-all duration-200 overflow-hidden',
                        sidebarOpen ? 'w-[160px]' : 'w-0'
                    )}>
                        <div className="flex-1 overflow-y-auto p-2 space-y-3 no-scrollbar">
                            {PALETTE.map(group => (
                                <div key={group.group}>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1 mb-1.5">{group.group}</p>
                                    <div className="space-y-1">
                                        {group.items.map((item, idx) => (
                                            <div
                                                key={idx}
                                                draggable
                                                onDragStart={e => onDragStart(e, JSON.stringify({
                                                    type: item.type,
                                                    defaultData: item.defaultData,
                                                    size: { w: item.defaultSize.w, h: item.defaultSize.h }
                                                }))}
                                                className="flex items-center gap-2 p-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-grab active:cursor-grabbing transition-all group select-none"
                                            >
                                                <div className="shrink-0">{item.icon}</div>
                                                <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 truncate group-hover:text-zinc-900 dark:group-hover:text-zinc-100">
                                                    {item.label}
                                                </span>
                                                <GripVertical className="h-3 w-3 text-zinc-300 dark:text-zinc-600 ml-auto shrink-0 group-hover:text-zinc-400 transition-colors" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Toggle sidebar button */}
                {isBuilder && (
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-4 h-10 bg-white dark:bg-zinc-800 border border-l-0 border-zinc-200 dark:border-zinc-700 rounded-r-lg shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
                        style={{ left: sidebarOpen ? 160 : 0 }}
                    >
                        {sidebarOpen ? <ChevronLeft className="h-3 w-3 text-zinc-500" /> : <ChevronRight className="h-3 w-3 text-zinc-500" />}
                    </button>
                )}

                {/* Canvas */}
                <div ref={wrapperRef} className="flex-1 relative overflow-hidden">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        onDragOver={isBuilder ? onDragOver : undefined}
                        onDrop={isBuilder ? onDrop : undefined}
                        nodeTypes={nodeTypes}
                        proOptions={{ hideAttribution: true }}
                        snapToGrid={snapToGrid && isBuilder}
                        snapGrid={[20, 20]}
                        fitView
                        fitViewOptions={{ padding: 0.15 }}
                        className="bg-transparent"
                        defaultEdgeOptions={{ type: 'default' }}
                        panOnDrag={[1, 2]}
                        selectionOnDrag={isBuilder}
                        nodesDraggable={isBuilder}
                        nodesConnectable={false}
                        elementsSelectable={isBuilder || mode === 'live'}
                        deleteKeyCode={isBuilder ? 'Delete' : null}
                        multiSelectionKeyCode="Shift"
                    >
                        <Background
                            variant={snapToGrid && isBuilder ? BackgroundVariant.Lines : BackgroundVariant.Dots}
                            gap={20}
                            size={snapToGrid && isBuilder ? 0.5 : 1}
                            className={snapToGrid && isBuilder ? 'opacity-20' : 'opacity-30'}
                        />

                        <Panel position="bottom-right" className="flex flex-col items-end gap-2 !m-4 !p-0">
                            <MiniMap
                                zoomable
                                pannable
                                className="!relative !w-[180px] !h-[120px] !m-0 !block shadow-lg rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                                nodeColor={(node) => {
                                    if (node.type === 'table') {
                                        const d = node.data as TableNodeData
                                        const colors: Record<string, string> = {
                                            available: '#10b981',
                                            occupied: '#ef4444',
                                            reserved: '#f59e0b',
                                            cleaning: '#3b82f6',
                                            billing: '#8b5cf6',
                                        }
                                        return colors[d.status] || '#10b981'
                                    }
                                    if (node.type === 'wall') return '#78716c'
                                    return '#c4b5fd'
                                }}
                                maskColor="rgba(0,0,0,0.06)"
                                style={{ width: 180, height: 120 }}
                            />
                            <Controls
                                orientation="horizontal"
                                showInteractive={false}
                                className="!static !m-0 !p-1 !flex !gap-1 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-full bg-white dark:bg-zinc-800"
                            />
                        </Panel>
                    </ReactFlow>
                </div>

                {/* Properties Panel */}
                {isBuilder && propsPanelOpen && selectedNode && (
                    <div className="w-[240px] shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col">
                        <TablePropertiesPanel
                            node={selectedNode}
                            orgId={orgId}
                            orgSlug={orgSlug}
                            onClose={() => { setPropsPanelOpen(false); setSelectedNode(null) }}
                            onUpdate={handleNodeUpdate}
                            onDelete={handleNodeDelete}
                        />
                    </div>
                )}
            </div>

            {/* ── Add Zone Dialog ─────────────────────────────────────────────── */}
            <Dialog open={addZoneOpen} onOpenChange={setAddZoneOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Nueva Zona</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input
                            placeholder="Ej: Terraza, Rooftop, VIP..."
                            value={newZoneName}
                            onChange={e => setNewZoneName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddZone()}
                            autoFocus
                        />
                        <Button className="w-full" onClick={handleAddZone} disabled={!newZoneName.trim()}>
                            Crear Zona
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Delete Zone Confirm Dialog ──────────────────────────────────── */}
            <Dialog open={deleteZoneDialog.open} onOpenChange={open => !open && setDeleteZoneDialog({ open: false, zone: null })}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertCircle className="h-5 w-5" />
                            Eliminar zona
                        </DialogTitle>
                        <DialogDescription>
                            ¿Eliminar la zona <strong>&quot;{deleteZoneDialog.zone?.name}&quot;</strong>? Se borrarán todas las mesas y elementos de esa zona. Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteZoneDialog({ open: false, zone: null })}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmDeleteZone} disabled={isDeletingZone}>
                            {isDeletingZone ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Eliminando...</> : 'Eliminar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Live Mode: Table Status Sheet ──────────────────────────────── */}
            <Sheet open={liveSheetOpen} onOpenChange={setLiveSheetOpen}>
                <SheetContent side="right" className="w-[300px] sm:w-[340px] flex flex-col gap-0 p-0">
                    {liveSelectedTable && (
                        <>
                            {/* Header with status color */}
                            <div className={cn(
                                'px-6 pt-6 pb-4 border-b',
                                selectedTableStatus.lightBg,
                                selectedTableStatus.border
                            )}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Mesa</span>
                                    <div className={cn(
                                        'flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full',
                                        selectedTableStatus.lightBg,
                                        selectedTableStatus.text,
                                        selectedTableStatus.border,
                                        'border'
                                    )}>
                                        <span className={cn('w-1.5 h-1.5 rounded-full', selectedTableStatus.bg)} />
                                        {selectedTableStatus.label}
                                    </div>
                                </div>
                                <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                                    {liveSelectedTable.table_identifier}
                                </h2>
                                <div className="flex items-center gap-3 mt-2 text-sm text-zinc-500">
                                    <span className="flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5" />
                                        {liveSelectedTable.capacity} personas
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {zones.find(z => z.id === activeZoneId)?.name || 'Zona'}
                                    </span>
                                </div>
                            </div>

                            {/* Status selector */}
                            <div className="px-6 py-5 flex-1 overflow-y-auto">
                                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                                    Cambiar estado
                                </p>
                                <div className="space-y-2">
                                    {TABLE_STATUSES.map(s => (
                                        <button
                                            key={s.key}
                                            disabled={isChangingStatus}
                                            onClick={() => handleChangeTableStatus(s.key as TableStatus)}
                                            className={cn(
                                                'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all',
                                                liveSelectedTable.status === s.key
                                                    ? [s.lightBg, s.border, s.text, 'shadow-sm ring-2 ring-current ring-offset-1']
                                                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                                            )}
                                        >
                                            <span className={cn('w-3 h-3 rounded-full shrink-0', s.bg)} />
                                            {s.label}
                                            {liveSelectedTable.status === s.key && (
                                                <Check className="h-4 w-4 ml-auto" />
                                            )}
                                            {isChangingStatus && liveSelectedTable.status !== s.key && (
                                                <Loader2 className="h-3.5 w-3.5 ml-auto animate-spin opacity-30" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
            {/* Unsaved Changes Confirmation Modal */}
            <Dialog open={unsavedModalOpen} onOpenChange={setUnsavedModalOpen}>
                <DialogContent className="max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-lg">
                            <AlertCircle className="w-5 h-5 shrink-0" /> Cambios sin guardar
                        </DialogTitle>
                        <DialogDescription className="text-zinc-600 dark:text-zinc-400 text-sm mt-2 leading-relaxed">
                            Has realizado modificaciones en la zona actual. ¿Deseas guardarlas antes de cambiar de zona?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2 mt-6">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setUnsavedModalOpen(false)
                                setPendingZoneId(null)
                            }}
                            className="text-xs font-semibold text-zinc-500"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/30 text-xs font-semibold"
                            onClick={() => {
                                setIsDirty(false)
                                setUnsavedModalOpen(false)
                                if (pendingZoneId) {
                                    const target = pendingZoneId
                                    setPendingZoneId(null)
                                    setActiveZoneId(target)
                                }
                            }}
                        >
                            Descartar y Cambiar
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                            onClick={async () => {
                                setUnsavedModalOpen(false)
                                await handleSave()
                            }}
                        >
                            Guardar y Cambiar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ─── Public wrapper with ReactFlowProvider ─────────────────────────────────
export interface FloorBuilderCanvasProps {
    initialZones: RestoZone[]
    initialTables: RestoTable[]
    orgId: string
    orgSlug?: string
    /** If true: hides builder tools, forces Live mode, no drag */
    readOnly?: boolean
    /** Called on table click in live mode (overrides built-in sheet) */
    onTableClick?: (table: RestoTable) => void
    /** Override default mode */
    defaultMode?: 'live' | 'builder'
}

export function FloorBuilderCanvas(props: FloorBuilderCanvasProps) {
    return (
        <ReactFlowProvider>
            <FloorBuilderCanvasInner {...props} />
        </ReactFlowProvider>
    )
}

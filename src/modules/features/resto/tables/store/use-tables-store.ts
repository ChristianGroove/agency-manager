import { create } from 'zustand'

// --- Types ---
export type TableShape = 'circle' | 'square' | 'rectangle' | 'oval'
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'billing'

export interface VisualElement {
    id: string
    type: 'wall' | 'plant' | 'bar' | 'generic' | 'window' | 'door' | 'stairs' | 'label' | 'reception' | 'restroom' | 'kitchen'
    x: number
    y: number
    width: number
    height: number
    rotation: number
    color?: string
}

export interface RestoTable {
    id: string
    zone_id: string
    table_identifier: string
    capacity: number
    shape: TableShape
    pos_x: number
    pos_y: number
    width: number
    height: number
    rotation: number
    status: TableStatus
    qr_token?: string
    current_session_id?: string
    isNew?: boolean // Flag for tables that haven't been saved to DB yet
}

export interface RestoZone {
    id: string
    name: string
    grid_width: number
    grid_height: number
    visual_elements: VisualElement[]
    background_style?: string // 'dots' | 'wood' | 'concrete' | 'grid'
}

// --- Store State & Actions ---
interface RestoTablesState {
    // Mode
    mode: 'live' | 'builder'
    setMode: (mode: 'live' | 'builder') => void
    
    // Zone Data
    activeZone: RestoZone | null
    setActiveZone: (zone: RestoZone) => void
    updateActiveZone: (updates: Partial<RestoZone>) => void
    
    // Canvas State
    scale: number
    pan: { x: number, y: number }
    setScale: (scale: number) => void
    setPan: (pan: { x: number, y: number }) => void
    
    // Tables
    tables: RestoTable[]
    setTables: (tables: RestoTable[]) => void
    addTable: (table: Omit<RestoTable, 'id' | 'status'>) => void
    updateTable: (id: string, updates: Partial<RestoTable>) => void
    removeTable: (id: string) => void
    
    // Visual Elements (Decorations)
    addVisualElement: (element: Omit<VisualElement, 'id'>) => void
    updateVisualElement: (id: string, updates: Partial<VisualElement>) => void
    removeVisualElement: (id: string) => void
    
    // Selection
    selectedIds: string[]
    setSelectedIds: (ids: string[]) => void
    
    // History / Unsaved Changes Tracking
    hasUnsavedChanges: boolean
    setHasUnsavedChanges: (val: boolean) => void
}

const generateId = () => `temp_${Math.random().toString(36).substr(2, 9)}`

export const useRestoTablesStore = create<RestoTablesState>((set) => ({
    mode: 'live',
    setMode: (mode) => set({ mode, selectedIds: [] }),
    
    activeZone: null,
    setActiveZone: (zone) => set({ activeZone: zone, hasUnsavedChanges: false }),
    updateActiveZone: (updates) => set((state) => {
        if (!state.activeZone) return state
        return {
            activeZone: { ...state.activeZone, ...updates },
            hasUnsavedChanges: true
        }
    }),
    
    scale: 1,
    pan: { x: 0, y: 0 },
    setScale: (scale) => set({ scale }),
    setPan: (pan) => set({ pan }),
    
    tables: [],
    setTables: (tables) => set({ tables }),
    addTable: (table) => set((state) => ({ 
        tables: [...state.tables, { ...table, id: generateId(), status: 'available', isNew: true }],
        hasUnsavedChanges: true 
    })),
    updateTable: (id, updates) => set((state) => ({
        tables: state.tables.map(t => t.id === id ? { ...t, ...updates } : t),
        hasUnsavedChanges: true
    })),
    removeTable: (id) => set((state) => ({
        tables: state.tables.filter(t => t.id !== id),
        hasUnsavedChanges: true,
        selectedIds: state.selectedIds.filter(selectedId => selectedId !== id)
    })),
    
    addVisualElement: (element) => set((state) => {
        if (!state.activeZone) return state
        const newEl = { ...element, id: generateId() }
        return {
            activeZone: {
                ...state.activeZone,
                visual_elements: [...(state.activeZone.visual_elements || []), newEl]
            },
            hasUnsavedChanges: true
        }
    }),
    updateVisualElement: (id, updates) => set((state) => {
        if (!state.activeZone) return state
        return {
            activeZone: {
                ...state.activeZone,
                visual_elements: (state.activeZone.visual_elements || []).map(el => el.id === id ? { ...el, ...updates } : el)
            },
            hasUnsavedChanges: true
        }
    }),
    removeVisualElement: (id) => set((state) => {
        if (!state.activeZone) return state
        return {
            activeZone: {
                ...state.activeZone,
                visual_elements: (state.activeZone.visual_elements || []).filter(el => el.id !== id)
            },
            hasUnsavedChanges: true,
            selectedIds: state.selectedIds.filter(selectedId => selectedId !== id)
        }
    }),
    
    selectedIds: [],
    setSelectedIds: (ids) => set({ selectedIds: ids }),
    
    hasUnsavedChanges: false,
    setHasUnsavedChanges: (val) => set({ hasUnsavedChanges: val })
})) 

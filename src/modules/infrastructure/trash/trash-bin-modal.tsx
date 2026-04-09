'use client'

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrashItem, getTrashItems, restoreItem, permanentlyDeleteItem, emptyTrash, bulkTrashAction } from "@\/modules\/infrastructure\/trash/trash-actions"
import { Loader2, RefreshCw, Trash2, AlertTriangle, Search, Archive, Settings, CheckSquare, Square, Eraser } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { useHotkeys } from "react-hotkeys-hook"
import { useActiveModules } from "@/hooks/use-active-modules"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateSettings } from "@/modules/core/settings/settings-actions"
import { cn } from "@/lib/utils"

export function TrashBinModal({ shortcut = 'ctrl+alt+p' }: { shortcut?: string }) {
    const [open, setOpen] = useState(false)
    const [items, setItems] = useState<TrashItem[]>([])
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<string>("clients")
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isBulkProcessing, setIsBulkProcessing] = useState(false)
    const { organizationType } = useActiveModules()

    // Toggle with shortcut
    useHotkeys(shortcut, () => setOpen(prev => !prev), { preventDefault: true })

    useEffect(() => {
        if (open) {
            fetchTrash()
        }
    }, [open])

    // Listen for custom event trigger (e.g. from Sidebar)
    useEffect(() => {
        const handleOpen = () => setOpen(true)
        window.addEventListener('pixy:open-trash', handleOpen)
        return () => window.removeEventListener('pixy:open-trash', handleOpen)
    }, [])

    const fetchTrash = async () => {
        setLoading(true)
        try {
            const data = await getTrashItems()
            setItems(data)
            setSelectedIds(new Set())
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar la papelera")
        } finally {
            setLoading(false)
        }
    }

    const handleRestore = async (item: TrashItem) => {
        setProcessingId(item.id)
        try {
            const res = await restoreItem(item.id, item.type)
            if (res.success) {
                toast.success("Elemento restaurado")
                setItems(items.filter(i => i.id !== item.id))
                const newSelected = new Set(selectedIds)
                newSelected.delete(item.id)
                setSelectedIds(newSelected)
            } else {
                toast.error("Error al restaurar")
            }
        } catch (error) {
            toast.error("Error al restaurar")
        } finally {
            setProcessingId(null)
        }
    }

    const handleDelete = async (item: TrashItem) => {
        if (!confirm("Â¿EstÃ¡s seguro de eliminar esto permanentemente? NO SE PUEDE DESHACER.")) return

        setProcessingId(item.id)
        try {
            const res = await permanentlyDeleteItem(item.id, item.type)
            if (res.success) {
                toast.success("Elemento eliminado permanentemente")
                setItems(items.filter(i => i.id !== item.id))
                const newSelected = new Set(selectedIds)
                newSelected.delete(item.id)
                setSelectedIds(newSelected)
            } else {
                toast.error("Error al eliminar")
            }
        } catch (error) {
            toast.error("Error al eliminar")
        } finally {
            setProcessingId(null)
        }
    }

    const handleEmptyTrash = async () => {
        if (!confirm("Â¿EstÃ¡s seguro de vaciar COMPLETAMENTE la papelera? Esta acciÃ³n eliminarÃ¡ permanentemente TODOS los registros de todas las categorÃ­as y NO se puede deshacer.")) return

        setIsBulkProcessing(true)
        try {
            await emptyTrash()
            toast.success("Papelera vaciada correctamente")
            setItems([])
            setSelectedIds(new Set())
        } catch (error) {
            toast.error("Error al vaciar la papelera")
        } finally {
            setIsBulkProcessing(false)
        }
    }

    const handleBulkAction = async (action: 'restore' | 'delete') => {
        const count = selectedIds.size
        if (count === 0) return

        if (action === 'delete') {
            if (!confirm(`Â¿EstÃ¡s seguro de eliminar permanentemente ${count} elementos? NO SE PUEDE DESHACER.`)) return
        }

        setIsBulkProcessing(true)
        try {
            const selectedItems = items.filter(i => selectedIds.has(i.id))
            const res = await bulkTrashAction(selectedItems.map(i => ({ id: i.id, type: i.type })), action)
            
            if (res.success) {
                toast.success(action === 'restore' ? `${count} elementos restaurados` : `${count} elementos eliminados`)
                setItems(items.filter(i => !selectedIds.has(i.id)))
                setSelectedIds(new Set())
            }
        } catch (error) {
            toast.error(`Error al procesar acciÃ³n masiva`)
        } finally {
            setIsBulkProcessing(false)
        }
    }

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    const filteredItems = items.filter(item => {
        const matchesTerm = (item.name || "").toLowerCase().includes(searchTerm.toLowerCase())
        if (!matchesTerm) return false

        if (activeTab === 'clients') return item.type === 'client'
        if (activeTab === 'briefings') return item.type === 'briefing'
        if (activeTab === 'quotes') return item.type === 'quote'
        if (activeTab === 'invoices') return item.type === 'invoice'
        if (activeTab === 'organizations') return item.type === 'organization'
        return true
    })

    const getCount = (type: string) => items.filter(i => i.type === type).length

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden bg-white">
                <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <div className="bg-red-100 p-2 rounded-lg">
                            <Trash2 className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl">Recycle Bin (Papelera)</DialogTitle>
                            <DialogDescription>
                                Los elementos eliminados se conservan por 30 días antes de ser purgados físicamente.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 flex flex-col overflow-hidden">
                    <Tabs defaultValue="clients" className="flex-1 flex flex-col h-full" onValueChange={setActiveTab}>
                        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                            <TabsList className="bg-gray-100 p-1">
                                <TabsTrigger value="clients">Clientes ({getCount('client')})</TabsTrigger>
                                {organizationType !== 'client' && (
                                    <TabsTrigger value="organizations">Organizaciones ({getCount('organization')})</TabsTrigger>
                                )}
                                <TabsTrigger value="briefings">Briefings ({getCount('briefing')})</TabsTrigger>
                                <TabsTrigger value="quotes">Cotizaciones ({getCount('quote')})</TabsTrigger>
                                <TabsTrigger value="invoices">Facturas ({getCount('invoice')})</TabsTrigger>
                            </TabsList>
                            <div className="flex items-center gap-2">
                                <div className="relative w-[180px]">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                    <input
                                        placeholder="Buscar..."
                                        className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 gap-2 font-semibold border border-red-100"
                                    onClick={handleEmptyTrash}
                                    disabled={isBulkProcessing || items.length === 0}
                                >
                                    <Eraser className="h-4 w-4" />
                                    <span className="hidden sm:inline">Vaciar</span>
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                            {loading ? (
                                <div className="flex justify-center items-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
                                    <Archive className="h-12 w-12 mb-3 opacity-20" />
                                    <p>No hay elementos en esta secciÃ³n</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between pb-2">
                                        <div className="flex items-center gap-3">
                                            <Checkbox 
                                                checked={filteredItems.length > 0 && filteredItems.every(i => selectedIds.has(i.id))}
                                                onCheckedChange={(checked) => {
                                                    const newSelected = new Set(selectedIds)
                                                    filteredItems.forEach(i => {
                                                        if (checked) newSelected.add(i.id)
                                                        else newSelected.delete(i.id)
                                                    })
                                                    setSelectedIds(newSelected)
                                                }}
                                            />
                                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Seleccionar Todo en {activeTab}
                                            </span>
                                        </div>

                                        {selectedIds.size > 0 && (
                                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50"
                                                    onClick={() => handleBulkAction('restore')}
                                                    disabled={isBulkProcessing}
                                                >
                                                    Restaurar ({selectedIds.size})
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                                    onClick={() => handleBulkAction('delete')}
                                                    disabled={isBulkProcessing}
                                                >
                                                    Eliminar ({selectedIds.size})
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        {filteredItems.map(item => (
                                            <div 
                                                key={item.id} 
                                                className={cn(
                                                    "bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between transition-all group",
                                                    selectedIds.has(item.id) ? "border-black ring-1 ring-black bg-gray-50/50" : "border-gray-100 hover:shadow-md"
                                                )}
                                            >
                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                    <Checkbox 
                                                        checked={selectedIds.has(item.id)}
                                                        onCheckedChange={() => toggleSelection(item.id)}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-semibold text-gray-900 truncate">{item.name || "Sin Nombre"}</h4>
                                                            <Badge
                                                                variant={item.days_left < 5 ? "destructive" : "outline"}
                                                                className="text-[10px] whitespace-nowrap"
                                                            >
                                                                {item.days_left} dÃ­as restantes
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-gray-500 truncate capitalize">{item.type} â€¢ {item.original_table}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 pl-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                                                        disabled={processingId === item.id || isBulkProcessing}
                                                        onClick={() => handleRestore(item)}
                                                    >
                                                        {processingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1.5" />}
                                                        Restaurar
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 border-gray-200"
                                                        disabled={processingId === item.id || isBulkProcessing}
                                                        onClick={() => handleDelete(item)}
                                                        title="Eliminar Permanentemente"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Tabs>
                </div>

                <div className="bg-white px-6 py-3 border-t border-gray-200 text-xs text-gray-400 flex justify-between items-center">
                    <span>ESC para cerrar</span>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Restaurar devuelve a ubicaciÃ³n original</span>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground">
                                    <Settings className="h-3 w-3" />
                                    {shortcut}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                                <div className="space-y-4">
                                    <h4 className="font-medium leading-none">ConfiguraciÃ³n de Papelera</h4>
                                    <div className="space-y-2">
                                        <Label htmlFor="shortcut">Atajo de Teclado</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="shortcut"
                                                defaultValue={shortcut}
                                                className="h-8"
                                                onKeyDown={async (e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = e.currentTarget.value
                                                        await updateSettings({ trash_shortcut: val })
                                                        toast.success("Atajo actualizado")
                                                        window.location.reload()
                                                    }
                                                }}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">Presiona Enter para guardar y recargar.</p>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

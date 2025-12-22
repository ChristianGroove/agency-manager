'use client'

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrashItem, getTrashItems, restoreItem, permanentlyDeleteItem } from "@/lib/actions/trash"
import { Loader2, RefreshCw, Trash2, AlertTriangle, Search, Archive } from "lucide-react"
import { toast } from "sonner"
import { useHotkeys } from "react-hotkeys-hook"

export function TrashBinModal({ shortcut = 'ctrl+alt+p' }: { shortcut?: string }) {
    const [open, setOpen] = useState(false)
    const [items, setItems] = useState<TrashItem[]>([])
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<string>("clients")
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")

    // Toggle with shortcut
    useHotkeys(shortcut, () => setOpen(prev => !prev), { preventDefault: true })

    useEffect(() => {
        if (open) {
            fetchTrash()
        }
    }, [open])

    const fetchTrash = async () => {
        setLoading(true)
        try {
            const data = await getTrashItems()
            setItems(data)
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
            const res = await restoreItem(item.type, item.id)
            if (res.success) {
                toast.success("Elemento restaurado")
                setItems(items.filter(i => i.id !== item.id))
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
        if (!confirm("¿Estás seguro de eliminar esto permanentemente? NO SE PUEDE DESHACER.")) return

        setProcessingId(item.id)
        try {
            const res = await permanentlyDeleteItem(item.type, item.id)
            if (res.success) {
                toast.success("Elemento eliminado permanentemente")
                setItems(items.filter(i => i.id !== item.id))
            } else {
                toast.error("Error al eliminar")
            }
        } catch (error) {
            toast.error("Error al eliminar")
        } finally {
            setProcessingId(null)
        }
    }

    const filteredItems = items.filter(item => {
        const matchesTerm = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase())

        if (!matchesTerm) return false

        if (activeTab === 'clients') return item.type === 'client'
        if (activeTab === 'briefings') return item.type === 'briefing'
        if (activeTab === 'quotes') return item.type === 'quote'
        if (activeTab === 'invoices') return item.type === 'invoice'
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
                            <DialogTitle className="text-xl">Papelera de Reciclaje</DialogTitle>
                            <DialogDescription>
                                Gestiona los elementos eliminados. Puedes restaurarlos o eliminarlos permanentemente.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 flex flex-col overflow-hidden">
                    <Tabs defaultValue="clients" className="flex-1 flex flex-col h-full" onValueChange={setActiveTab}>
                        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                            <TabsList className="bg-gray-100 p-1">
                                <TabsTrigger value="clients">Clientes ({getCount('client')})</TabsTrigger>
                                <TabsTrigger value="briefings">Briefings ({getCount('briefing')})</TabsTrigger>
                                <TabsTrigger value="quotes">Cotizaciones ({getCount('quote')})</TabsTrigger>
                                <TabsTrigger value="invoices">Facturas ({getCount('invoice')})</TabsTrigger>
                            </TabsList>
                            <div className="relative w-[200px]">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    placeholder="Buscar..."
                                    className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                            {loading ? (
                                <div className="flex justify-center items-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <Archive className="h-12 w-12 mb-3 opacity-20" />
                                    <p>No hay elementos en esta sección</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredItems.map(item => (
                                        <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow group">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-semibold text-gray-900 truncate">{item.title}</h4>
                                                    <Badge variant="outline" className="text-[10px] text-gray-500">
                                                        {new Date(item.deleted_at).toLocaleDateString()}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-500 truncate">{item.description}</p>
                                            </div>

                                            <div className="flex items-center gap-2 pl-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                                                    disabled={processingId === item.id}
                                                    onClick={() => handleRestore(item)}
                                                >
                                                    {processingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1.5" />}
                                                    Restaurar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 border-gray-200"
                                                    disabled={processingId === item.id}
                                                    onClick={() => handleDelete(item)}
                                                    title="Eliminar Permanentemente"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Tabs>
                </div>

                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 flex justify-between">
                    <span>Presiona ESC para cerrar</span>
                    <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Los elementos restaurados volverán a su ubicación original</span>
                </div>
            </DialogContent>
        </Dialog>
    )
}

"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, AlertTriangle, Filter, Database, Users, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { Lead } from "@/types"
import { deleteLeads, deleteAllLeads } from "../lead-management-actions"
import { cn } from "@/lib/utils"

interface LeadManagementSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    leads: Lead[]
    stages?: any[]
    onSuccess: () => void
}

export function LeadManagementSheet({ open, onOpenChange, leads, onSuccess }: LeadManagementSheetProps) {
    const [selectedLeads, setSelectedLeads] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [confirmPurge, setConfirmPurge] = useState(false)

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedLeads(leads.map(l => l.id))
        } else {
            setSelectedLeads([])
        }
    }

    const handleSelectLead = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedLeads(prev => [...prev, id])
        } else {
            setSelectedLeads(prev => prev.filter(l => l !== id))
        }
    }

    const handleBulkDelete = async () => {
        if (!selectedLeads.length) return
        if (!confirm(`¿Estás seguro de eliminar ${selectedLeads.length} leads?`)) return

        setIsLoading(true)
        try {
            const res = await deleteLeads(selectedLeads)
            if (res.success) {
                toast.success(`${selectedLeads.length} leads eliminados`)
                setSelectedLeads([])
                onSuccess()
            } else {
                toast.error(res.error)
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handlePurgeAll = async () => {
        setIsLoading(true)
        try {
            const res = await deleteAllLeads()
            if (res.success) {
                toast.success("Organización purgada correctamente")
                onSuccess()
                onOpenChange(false)
            } else {
                toast.error(res.error)
            }
        } finally {
            setIsLoading(false)
            setConfirmPurge(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-[600px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-slate-50/50 dark:bg-zinc-950 flex flex-col
                "
            >
                <Tabs defaultValue="selection" className="flex flex-col h-full w-full">
                    {/* Premium Header */}
                    <div className="p-6 pb-2 bg-white dark:bg-zinc-900 border-b relative z-10 flex-none">
                        <SheetHeader className="mb-4">
                            <SheetTitle className="flex items-center gap-3 text-xl font-semibold">
                                <div className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-lg">
                                    <Database className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                </div>
                                Gestión de Datos
                            </SheetTitle>
                            <SheetDescription className="text-sm text-slate-500 dark:text-slate-400">
                                Herramientas avanzadas para la limpieza y organización de tus registros.
                            </SheetDescription>
                        </SheetHeader>

                        <TabsList className="grid w-full grid-cols-3 bg-slate-100/50 dark:bg-zinc-800/50 p-1 rounded-xl">
                            <TabsTrigger value="selection" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all duration-200">
                                Selección
                            </TabsTrigger>
                            <TabsTrigger value="pipeline" disabled className="opacity-50">
                                Por Pipeline
                            </TabsTrigger>
                            <TabsTrigger value="purge" className="rounded-lg data-[state=active]:bg-red-50 dark:data-[state=active]:bg-red-900/20 data-[state=active]:text-red-600 dark:data-[state=active]:text-red-400 transition-all duration-200">
                                Borrar Todo
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden relative bg-slate-50/50 dark:bg-zinc-950">
                        {/* SELECTION TAB */}
                        <TabsContent value="selection" className="h-full flex flex-col m-0 data-[state=inactive]:hidden focus-visible:outline-none">
                            {/* Action Bar */}
                            <div className="px-6 py-3 bg-white dark:bg-zinc-900/50 border-b flex items-center justify-between sticky top-0 z-10">
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        checked={leads.length > 0 && selectedLeads.length === leads.length}
                                        onCheckedChange={(c) => handleSelectAll(Boolean(c))}
                                        id="select-all"
                                        className="rounded-md border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                                    />
                                    <label htmlFor="select-all" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                        Seleccionar Todo ({leads.length})
                                    </label>
                                </div>
                                {selectedLeads.length > 0 && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/30 transition-colors"
                                        onClick={handleBulkDelete}
                                        disabled={isLoading}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Eliminar ({selectedLeads.length})
                                    </Button>
                                )}
                            </div>

                            {/* List */}
                            <ScrollArea className="flex-1">
                                <div className="p-4 space-y-2">
                                    {leads.map(lead => (
                                        <div
                                            key={lead.id}
                                            className={cn(
                                                "group flex items-center gap-4 p-3 rounded-xl border transition-all duration-200",
                                                selectedLeads.includes(lead.id)
                                                    ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
                                                    : "bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 hover:border-slate-200 dark:hover:border-zinc-700 hover:shadow-sm"
                                            )}
                                        >
                                            <Checkbox
                                                checked={selectedLeads.includes(lead.id)}
                                                onCheckedChange={(c) => handleSelectLead(lead.id, Boolean(c))}
                                                className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{lead.name}</span>
                                                    {lead.company_name && (
                                                        <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-500">
                                                            {lead.company_name}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-2">
                                                    {lead.phone && <span>{lead.phone}</span>}
                                                    {lead.phone && lead.email && <span className="w-0.5 h-0.5 rounded-full bg-slate-300" />}
                                                    {lead.email && <span>{lead.email}</span>}
                                                    {!lead.phone && !lead.email && <span className="italic opacity-50">Sin contacto</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {leads.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                                                <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                            </div>
                                            <p className="text-slate-500 font-medium">No hay leads disponibles</p>
                                            <p className="text-sm text-slate-400 mt-1">Tu base de datos está limpia.</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        {/* PURGE TAB */}
                        <TabsContent value="purge" className="h-full m-0 data-[state=inactive]:hidden bg-white dark:bg-zinc-900 focus-visible:outline-none">
                            <div className="h-full flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center">
                                <div className="w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6 shadow-sm">
                                    <ShieldAlert className="w-10 h-10 text-red-500" />
                                </div>

                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Borrar Todo</h3>

                                <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl p-4 mb-8">
                                    <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
                                        Esta acción eliminará <strong>permanentemente todos los leads</strong> de la organización activa.
                                        <br /><br />
                                        <span className="opacity-80">Datos de sub-organizaciones o cuentas vinculadas <strong>no</strong> se verán afectados.</span>
                                    </p>
                                </div>

                                {!confirmPurge ? (
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={() => setConfirmPurge(true)}
                                        className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-950/50 transition-all"
                                    >
                                        Iniciar Borrado Total
                                    </Button>
                                ) : (
                                    <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-300 text-sm font-semibold">
                                            ¿Estás seguro?
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button variant="ghost" onClick={() => setConfirmPurge(false)}>
                                                Cancelar
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={handlePurgeAll}
                                                disabled={isLoading}
                                                className="shadow-lg shadow-red-500/20 text-white"
                                            >
                                                {isLoading ? 'Purgando...' : 'Sí, Borrar Todo'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </SheetContent>
        </Sheet>
    )
}

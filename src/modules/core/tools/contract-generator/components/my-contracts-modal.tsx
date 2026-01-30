"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FolderOpen, FileText, Download, Trash2, Loader2, RefreshCw, ExternalLink } from "lucide-react"
import { getContracts, deleteContract } from "../actions"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export function MyContractsModal() {
    const [open, setOpen] = useState(false)
    const [contracts, setContracts] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    const fetchContracts = async () => {
        setLoading(true)
        try {
            const data = await getContracts()
            setContracts(data)
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar contratos")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este contrato?")) return
        try {
            await deleteContract(id)
            toast.success("Contrato eliminado")
            fetchContracts()
        } catch (error) {
            toast.error("No se pudo eliminar")
        }
    }

    useEffect(() => {
        if (open) {
            fetchContracts()
        }
    }, [open])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-11 px-4 text-xs font-bold gap-2 rounded-xl border-dashed border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-gray-600 dark:text-gray-300"
                >
                    <FolderOpen className="w-4 h-4 text-brand-pink" />
                    Mis Contratos
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-black border-gray-200 dark:border-zinc-800">
                <div className="p-6 pb-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-start">
                    <div>
                        <DialogHeader className="p-0">
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <FileText className="w-5 h-5 text-brand-pink" />
                                Mis Contratos
                            </DialogTitle>
                            <DialogDescription className="mt-1">
                                Historial de documentos generados y cifrados.
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    <Button variant="ghost" size="icon" onClick={fetchContracts} disabled={loading} className="h-8 w-8">
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-2">
                    {loading && contracts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-pink/50" />
                            <p className="text-sm">Cargando documentos...</p>
                        </div>
                    ) : contracts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl m-4">
                            <FolderOpen className="w-10 h-10 text-gray-300 dark:text-gray-700" />
                            <p className="text-sm">No tienes contratos guardados aún.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {contracts.map((contract) => (
                                <div
                                    key={contract.id}
                                    className="group flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30 hover:border-brand-pink/30 hover:shadow-md hover:shadow-brand-pink/5 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center border border-gray-200 dark:border-white/5 shadow-sm">
                                            <FileText className="w-5 h-5 text-brand-pink" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {contract.title || "Contrato Sin Título"}
                                            </h4>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] font-mono bg-gray-200 dark:bg-white/10 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">
                                                    {contract.number}
                                                </span>
                                                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                                    {contract.client?.name} • {format(new Date(contract.created_at), "d MMM yyyy", { locale: es })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* TODO: Implement View/Download Logic (Need URL from storage) */}
                                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-brand-pink" disabled title="Ver (Pronto)">
                                            <ExternalLink className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                                            onClick={() => handleDelete(contract.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

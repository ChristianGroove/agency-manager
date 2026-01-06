"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Server, ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { format } from "date-fns"
import { SearchFilterBar, FilterOption } from "@/components/shared/search-filter-bar"
import { CreateHostingSheet } from "@/modules/core/hosting/components/create-hosting-sheet"

export default function HostingPage() {
    const [accounts, setAccounts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [selectedAccount, setSelectedAccount] = useState<any>(null)
    const [activeFilter, setActiveFilter] = useState("all")

    const fetchAccounts = async () => {
        setLoading(true)
        try {
            const { getHostingAccounts } = await import("@/modules/core/hosting/actions")
            const data = await getHostingAccounts()
            setAccounts(data || [])
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar cuentas de hosting")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAccounts()
    }, [])

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar esta cuenta de hosting?")) return
        try {
            const { deleteHostingAccount } = await import("@/modules/core/hosting/actions")
            await deleteHostingAccount(id)
            toast.success("Cuenta eliminada")
            fetchAccounts()
        } catch (error) {
            toast.error("Error al eliminar")
        }
    }

    const filtered = accounts.filter(acc => {
        const matchesSearch = acc.domain_url.toLowerCase().includes(searchTerm.toLowerCase()) ||
            acc.client?.name.toLowerCase().includes(searchTerm.toLowerCase())

        if (!matchesSearch) return false
        if (activeFilter === 'all') return true
        return acc.status === activeFilter
    })

    const counts = {
        all: accounts.length,
        active: accounts.filter(a => a.status === 'active').length,
        suspended: accounts.filter(a => a.status === 'suspended').length,
        cancelled: accounts.filter(a => a.status === 'cancelled').length
    }

    const filterOptions: FilterOption[] = [
        { id: 'all', label: 'Todos', count: counts.all, color: 'gray' },
        { id: 'active', label: 'Activos', count: counts.active, color: 'emerald' },
        { id: 'suspended', label: 'Suspendidos', count: counts.suspended, color: 'amber' },
        { id: 'cancelled', label: 'Cancelados', count: counts.cancelled, color: 'red' },
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Hosting Web</h2>
                    <p className="text-muted-foreground mt-1">Gestión técnica de servidores y dominios.</p>
                </div>
                <Button onClick={() => { setSelectedAccount(null); setIsCreateOpen(true); }} className="bg-brand-pink text-white hover:bg-brand-pink/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Hosting
                </Button>
            </div>

            <SearchFilterBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Buscar dominio o cliente..."
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                filters={filterOptions}
            />

            <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-md shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 dark:bg-white/5">
                            <TableHead>Dominio / Cliente</TableHead>
                            <TableHead>Proveedor / Plan</TableHead>
                            <TableHead>IP Servidor</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Renovación</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">Cargando...</TableCell>
                            </TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No hay cuentas de hosting registradas.</TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((acc) => (
                                <TableRow key={acc.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 border-gray-100 dark:border-white/5">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <a href={`https://${acc.domain_url}`} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:underline flex items-center gap-1">
                                                {acc.domain_url}
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                            <span className="text-xs text-gray-500">{acc.client?.name || '---'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <div className="font-medium text-gray-900 dark:text-white">{acc.provider_name || 'N/A'}</div>
                                            <div className="text-xs text-gray-500">{acc.plan_name}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 font-mono bg-gray-100 dark:bg-white/10 px-2 py-1 rounded w-fit">
                                            <Server className="h-3 w-3" />
                                            {acc.server_ip || '---'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={acc.status === 'active' ? 'default' : 'secondary'} className={acc.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>
                                            {acc.status === 'active' ? 'Activo' : acc.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm text-gray-600">
                                            {acc.renewal_date ? format(new Date(acc.renewal_date), "dd MMM yyyy") : '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => { setSelectedAccount(acc); setIsCreateOpen(true); }}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(acc.id)} className="text-red-600">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <CreateHostingSheet
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSuccess={fetchAccounts}
                accountToEdit={selectedAccount}
            />
        </div>
    )
}

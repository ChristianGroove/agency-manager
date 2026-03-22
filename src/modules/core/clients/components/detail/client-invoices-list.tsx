"use client"

import { Button } from "@/components/ui/button"
import {
    FileText,
    CheckCircle2,
    Eye,
    Share2,
    MoreHorizontal
} from "lucide-react"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/ui/status-badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ClientInvoicesListProps {
    invoices: any[]
    onMarkPaid: (id: string) => void
    onShare: (invoice: any) => void
}

export function ClientInvoicesList({ invoices, onMarkPaid, onShare }: ClientInvoicesListProps) {
    if (!invoices || invoices.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400 text-sm italic">
                No hay facturas registradas.
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white dark:bg-white/5 shadow-sm">
            <Table>
                <TableHeader className="bg-gray-50/50 dark:bg-white/5">
                    <TableRow className="dark:border-white/10 hover:bg-transparent">
                        <TableHead className="w-[100px] dark:text-gray-400 font-bold">N°</TableHead>
                        <TableHead className="dark:text-gray-400 font-bold">Fecha</TableHead>
                        <TableHead className="dark:text-gray-400 font-bold">Concepto</TableHead>
                        <TableHead className="dark:text-gray-400 font-bold">Monto</TableHead>
                        <TableHead className="dark:text-gray-400 font-bold">Estado</TableHead>
                        <TableHead className="text-right dark:text-gray-400 font-bold">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {invoices.map((inv) => (
                        <TableRow key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-white/10 group dark:border-white/10 transition-colors">
                            <TableCell className="font-mono text-xs font-medium text-gray-600 dark:text-gray-400">
                                {inv.number}
                            </TableCell>
                            <TableCell className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(inv.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate text-gray-600 dark:text-gray-300">
                                {inv.description || "Sin descripción"}
                            </TableCell>
                            <TableCell className="font-bold text-gray-900 dark:text-white text-sm">
                                ${inv.total.toLocaleString()}
                            </TableCell>
                            <TableCell>
                                <StatusBadge status={inv.status} type="invoice" entity={inv} className="scale-90 origin-left" />
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-primary hover:bg-primary/10 transition-colors"
                                        title="Ver PDF"
                                        disabled={!inv.pdf_url}
                                        onClick={() => inv.pdf_url && window.open(inv.pdf_url, '_blank')}
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                    </Button>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="dark:bg-slate-900 dark:border-white/10">
                                            <DropdownMenuItem onClick={() => onShare(inv)} disabled={!inv.pdf_url}>
                                                <Share2 className="h-4 w-4 mr-2" /> Compartir
                                            </DropdownMenuItem>
                                            {inv.status !== 'paid' && (
                                                <DropdownMenuItem onClick={() => onMarkPaid(inv.id)} className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-500/10">
                                                    <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar Pagada
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

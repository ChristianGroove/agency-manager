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
                <TableHeader className="bg-gray-50/50">
                    <TableRow>
                        <TableHead className="w-[100px]">N°</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {invoices.map((inv) => (
                        <TableRow key={inv.id} className="hover:bg-gray-50/50 group">
                            <TableCell className="font-mono text-xs font-medium text-gray-600">
                                {inv.number}
                            </TableCell>
                            <TableCell className="text-xs text-gray-500">
                                {new Date(inv.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate text-gray-600">
                                {inv.description || "Sin descripción"}
                            </TableCell>
                            <TableCell className="font-bold text-gray-900 text-sm">
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
                                        className="h-7 w-7 text-gray-400 hover:text-indigo-600"
                                        title="Ver PDF"
                                        disabled={!inv.pdf_url}
                                        onClick={() => inv.pdf_url && window.open(inv.pdf_url, '_blank')}
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                    </Button>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-600">
                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onShare(inv)} disabled={!inv.pdf_url}>
                                                <Share2 className="h-4 w-4 mr-2" /> Compartir
                                            </DropdownMenuItem>
                                            {inv.status !== 'paid' && (
                                                <DropdownMenuItem onClick={() => onMarkPaid(inv.id)} className="text-emerald-600">
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

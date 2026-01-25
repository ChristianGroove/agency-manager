"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Search, Eye, Trash2, Edit, ListFilter, MoreVertical, Loader2, Mail, FileText, Copy } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { BulkActionsFloatingBar } from "@/components/shared/bulk-actions-floating-bar"
import { toast } from "sonner"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/ui/status-badge"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { CreateInvoiceSheet } from "@/modules/core/billing/create-invoice-sheet"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu"
import { Invoice } from "@/types"
import { getInvoices } from "@/modules/core/billing/invoices-actions"
import { useTranslation } from "@/lib/i18n/use-translation"

interface InvoicesViewProps {
    initialInvoices: Invoice[]
}

export function InvoicesView({ initialInvoices }: InvoicesViewProps) {
    const { t, locale } = useTranslation()
    const router = useRouter()
    const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices || [])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [showFilters, setShowFilters] = useState(false)
    const [statusFilter, setStatusFilter] = useState("all")
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchInvoices = async () => {
        // setLoading(true) // Minimal loading state for refresh
        try {
            const data = await getInvoices()
            if (data) setInvoices(data)
        } catch (error) {
            console.error("Error fetching invoices:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteInvoice = async (id: string) => {
        if (!confirm(t('invoicing.toasts.delete_confirm'))) return

        setDeletingId(id)
        try {
            // Soft delete the invoice
            const { error } = await supabase
                .from('invoices')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)

            if (error) throw error
            await fetchInvoices()
        } catch (error) {
            console.error("Error deleting invoice:", error)
            alert(t('invoicing.toasts.delete_error'))
        } finally {
            setDeletingId(null)
        }
    }

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedIds)
        if (newSelection.has(id)) {
            newSelection.delete(id)
        } else {
            newSelection.add(id)
        }
        setSelectedIds(newSelection)
    }

    const toggleAll = () => {
        if (selectedIds.size === filteredInvoices.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredInvoices.map(i => i.id)))
        }
    }

    const handleBulkDelete = async () => {
        const confirmMsg = t('invoicing.toasts.bulk_delete_confirm').replace('{count}', selectedIds.size.toString())
        if (!confirm(confirmMsg)) return

        setIsDeleting(true)
        try {
            const { deleteInvoices } = await import("@/modules/core/billing/invoices-actions")
            await deleteInvoices(Array.from(selectedIds))

            const successMsg = t('invoicing.toasts.bulk_delete_success').replace('{count}', selectedIds.size.toString())
            toast.success(successMsg)

            setSelectedIds(new Set())
            await fetchInvoices()
        } catch (error) {
            console.error("Error deleting invoices:", error)
            toast.error(t('invoicing.toasts.delete_error'))
        } finally {
            setIsDeleting(false)
        }
    }

    const handleSendEmail = async (invoice: Invoice) => {
        if (!invoice.client?.email) {
            toast.error(t('invoicing.toasts.no_email'))
            return
        }

        const confirmMsg = t('invoicing.toasts.send_confirm')
            .replace('{number}', invoice.number)
            .replace('{client}', invoice.client.name)
            .replace('{email}', invoice.client.email)

        if (!confirm(confirmMsg)) return

        try {
            toast.loading(t('invoicing.toasts.sending_email'), { id: 'sending-email' })
            const { sendInvoiceEmail } = await import("@/modules/core/billing/actions/send-invoice-email")
            const result = await sendInvoiceEmail(invoice.id)

            if (result.success) {
                toast.success(t('invoicing.toasts.email_sent'), { id: 'sending-email' })
            } else {
                toast.error(t('invoicing.toasts.email_error'), { id: 'sending-email', description: result.error })
            }
        } catch (error) {
            console.error(error)
            toast.error(t('invoicing.toasts.unexpected_send_error'), { id: 'sending-email' })
        }
    }

    const handleDownloadPDF = (invoice: Invoice) => {
        window.open(`/invoices/${invoice.id}`, '_blank')
    }

    const handleDuplicate = (invoice: Invoice) => {
        toast.info(t('invoicing.actions.duplicate_soon'))
    }

    const filteredInvoices = invoices.filter(invoice => {
        const matchesSearch =
            invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) || ''

        const matchesStatus = statusFilter === "all" || invoice.status === statusFilter

        return matchesSearch && matchesStatus
    })

    return (
        <div className="space-y-8">
            {/* Header removed - moved to BillingControlCenter */}

            {/* Unified Control Block */}
            <div className="flex flex-col md:flex-row gap-3 sticky top-4 z-30">
                <div className="bg-white dark:bg-white/5 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-1.5 flex flex-col md:flex-row items-center gap-2 flex-1 transition-all hover:shadow-md">
                    {/* Integrated Search */}
                    <div className="relative flex-1 w-full md:w-auto min-w-[200px] flex items-center px-3 gap-2">
                        <Search className="h-4 w-4 text-gray-400 shrink-0" />
                        <Input
                            placeholder={t('invoicing.search_placeholder')}
                            className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm w-full outline-none text-gray-700 dark:text-white placeholder:text-gray-400 h-9 p-0 shadow-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Vertical Divider (Desktop) */}
                    <div className="h-6 w-px bg-gray-200 hidden md:block" />

                    {/* Collapsible Filter Pills (Middle) */}
                    <div className={cn(
                        "flex items-center gap-1.5 overflow-hidden transition-all duration-300 ease-in-out",
                        showFilters ? "max-w-[800px] opacity-100 ml-2" : "max-w-0 opacity-0 ml-0 p-0 pointer-events-none"
                    )}>
                        <div className="flex items-center gap-1.5 min-w-max">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1 hidden lg:block">{t('invoicing.table.status')}</span>
                            {[
                                { id: 'all', label: t('invoicing.status.all'), color: 'gray' },
                                { id: 'paid', label: t('invoicing.status.paid'), color: 'green' },
                                { id: 'pending', label: t('invoicing.status.pending'), color: 'yellow' },
                                { id: 'overdue', label: t('invoicing.status.overdue'), color: 'red' },
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setStatusFilter(filter.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap",
                                        statusFilter === filter.id
                                            ? filter.id === 'paid' ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20 dark:ring-green-500/20 shadow-sm"
                                                : filter.id === 'pending' ? "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 ring-1 ring-inset ring-yellow-600/20 dark:ring-yellow-500/20 shadow-sm"
                                                    : filter.id === 'overdue' ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-600/20 dark:ring-red-500/20 shadow-sm"
                                                        : "bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm"
                                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                                    )}
                                >
                                    <span>{filter.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-6 w-px bg-gray-200 mx-1 hidden md:block" />

                    {/* Toggle Filters Button (Fixed Right) */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border",
                            showFilters
                                ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white border-gray-200 dark:border-white/10 shadow-inner"
                                : "bg-white dark:bg-transparent text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                        )}
                        title={t('invoicing.form.filter_tooltip')}
                    >
                        <ListFilter className="h-4 w-4" />
                    </button>

                    {/* Create Button (Integrated) */}
                    <div className="hidden md:block h-6 w-px bg-gray-200 mx-1" />
                    <div className="shrink-0">
                        <CreateInvoiceSheet onSuccess={fetchInvoices} />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-md shadow-sm overflow-hidden relative">
                <BulkActionsFloatingBar
                    selectedCount={selectedIds.size}
                    onDelete={handleBulkDelete}
                    onClearSelection={() => setSelectedIds(new Set())}
                    isDeleting={isDeleting}
                />
                <Table>
                    <TableHeader className="bg-gray-50/50 dark:bg-white/5">
                        <TableRow className="border-gray-200 dark:border-white/10">
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={filteredInvoices.length > 0 && selectedIds.size === filteredInvoices.length}
                                    onCheckedChange={toggleAll}
                                />
                            </TableHead>
                            <TableHead>{t('invoicing.table.number')}</TableHead>
                            <TableHead>{t('invoicing.table.client')}</TableHead>
                            <TableHead>{t('invoicing.table.date')}</TableHead>
                            <TableHead>{t('invoicing.table.due_date')}</TableHead>
                            <TableHead>{t('invoicing.table.total')}</TableHead>
                            <TableHead>{t('invoicing.table.status')}</TableHead>
                            <TableHead className="text-right">{t('invoicing.table.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>{t('invoicing.form.loading_table')}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredInvoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                    {t('invoicing.table.empty')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredInvoices.map((invoice) => (
                                <TableRow key={invoice.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 border-gray-100 dark:border-white/10">
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.has(invoice.id)}
                                            onCheckedChange={() => toggleSelection(invoice.id)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900 dark:text-white">{invoice.number}</TableCell>
                                    <TableCell className="font-medium text-gray-700 dark:text-gray-300">{invoice.client?.name}</TableCell>
                                    <TableCell className="text-gray-500 dark:text-gray-400">
                                        <span suppressHydrationWarning>
                                            {new Date(invoice.date).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX')}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-gray-500 dark:text-gray-400">
                                        <span suppressHydrationWarning>
                                            {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX') : '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900 dark:text-white">
                                        <span suppressHydrationWarning>
                                            ${invoice.total.toLocaleString(locale === 'en' ? 'en-US' : 'es-MX')}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={invoice.status} type="invoice" entity={invoice} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                                    <span className="sr-only">{t('invoicing.actions.open_menu')}</span>
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => router.push(`/invoices/${invoice.id}`)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    <span>{t('invoicing.actions.view')}</span>
                                                </DropdownMenuItem>
                                                <CreateInvoiceSheet
                                                    invoiceToEdit={invoice}
                                                    onSuccess={fetchInvoices}
                                                    trigger={
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            <span>{t('invoicing.actions.edit')}</span>
                                                        </DropdownMenuItem>
                                                    }
                                                />
                                                <DropdownMenuItem onClick={() => handleDownloadPDF(invoice)}>
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    <span>{t('invoicing.actions.pdf_print')}</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleSendEmail(invoice)}>
                                                    <Mail className="mr-2 h-4 w-4" />
                                                    <span>{t('invoicing.actions.send_email')}</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDuplicate(invoice)}>
                                                    <Copy className="mr-2 h-4 w-4" />
                                                    <span>{t('invoicing.actions.duplicate')}</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteInvoice(invoice.id)}
                                                    className="text-red-600 focus:text-red-600"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>{t('invoicing.actions.delete')}</span>
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
        </div >
    )
}

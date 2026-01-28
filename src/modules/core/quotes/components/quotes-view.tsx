"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CreateQuoteSheet } from "@/modules/core/quotes/create-quote-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Eye, Loader2, Trash, MoreVertical, Search, ListFilter, Copy, Send, CheckCircle, RefreshCcw, FileCheck, MessageCircle } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { BulkActionsFloatingBar } from "@/components/shared/bulk-actions-floating-bar"
import { cn } from "@/lib/utils"
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
    DropdownMenuSeparator
} from "@/components/animate-ui/components/radix/dropdown-menu"
import { supabase } from "@/lib/supabase"
import { Quote } from "@/types"
import { SplitText } from "@/components/ui/split-text"
import { toast } from "sonner"
import { duplicateQuote, updateQuote } from "@/modules/core/quotes/actions"
import { convertQuote } from '@/modules/core/quotes/conversion-actions'
import { getQuotes } from "@/modules/core/quotes/actions"
import { QuoteShareSheet } from "@/modules/core/quotes/quote-share-sheet"
import { useTranslation } from "@/lib/i18n/use-translation"
import { QuoteDetailDialog } from "@/modules/core/quotes/quote-detail-dialog"
import { SectionHeader } from "@/components/layout/section-header"
import { FileText } from "lucide-react"

interface QuotesViewProps {
    initialQuotes: Quote[]
    initialEmitters: any[]
}

export function QuotesView({ initialQuotes, initialEmitters }: QuotesViewProps) {
    const { t, locale } = useTranslation()
    const router = useRouter()
    const [quotes, setQuotes] = useState<Quote[]>(initialQuotes || [])
    const [loading, setLoading] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [showFilters, setShowFilters] = useState(false)
    const [statusFilter, setStatusFilter] = useState("all")
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [emitters, setEmitters] = useState<any[]>(initialEmitters || [])
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)
    const [shareQuote, setShareQuote] = useState<Quote | null>(null)

    const [selectedDetailQuote, setSelectedDetailQuote] = useState<Quote | null>(null)

    const fetchQuotes = async () => {
        try {
            const data = await getQuotes()
            setQuotes(data || [])

            // Sync selectedDetailQuote if open
            if (selectedDetailQuote && data) {
                const updated = data.find(q => q.id === selectedDetailQuote.id)
                if (updated) {
                    setSelectedDetailQuote(updated)
                }
            }
        } catch (error) {
            console.error("Error fetching quotes:", error)
            toast.error("Error al cargar cotizaciones")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta cotización?")) return

        try {
            const { error } = await supabase
                .from('quotes')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)

            if (error) throw error

            setQuotes(quotes.filter(q => q.id !== id))
            toast.success("Cotización eliminada")
        } catch (error) {
            console.error("Error deleting quote:", error)
            toast.error("Error al eliminar")
        }
    }

    const handleDuplicate = async (quote: Quote) => {
        setActionLoading(quote.id)
        try {
            const res = await duplicateQuote(quote.id)
            if (res.success && res.data) {
                toast.success("Cotización duplicada como borrador")
                fetchQuotes() // Refresh list
                setSelectedDetailQuote(res.data) // Open the new draft immediately
            } else {
                throw new Error(res.error)
            }
        } catch (error: any) {
            toast.error("Error al duplicar: " + error.message)
        } finally {
            setActionLoading(null)
        }
    }

    const handleConvert = async (quote: Quote) => {
        if (!confirm(`¿Confirmas que deseas convertir la cotización ${quote.number} en factura/servicios?`)) return

        setActionLoading(quote.id)
        try {
            const res = await convertQuote(quote.id)
            if (res.success) {
                toast.success("Cotización convertida exitosamente")
                fetchQuotes()
                // Update local state to reflect change immediately if fetch is slow
                setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: 'converted' } : q))
            } else {
                throw new Error(res.error)
            }
        } catch (error: any) {
            toast.error("Error al convertir: " + error.message)
        } finally {
            setActionLoading(null)
        }
    }

    const handleSend = async (quote: Quote) => {
        setActionLoading(quote.id)
        try {
            // For now, just update status. In future, open email modal.
            const res = await updateQuote(quote.id, { status: 'sent' })
            if (res.success) {
                toast.success("Estado actualizado a Enviada")
                setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: 'sent' } : q))
            } else {
                throw new Error(res.error)
            }
        } catch (error: any) {
            toast.error("Error al actualizar: " + error.message)
        } finally {
            setActionLoading(null)
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
        if (selectedIds.size === filteredQuotes.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredQuotes.map(q => q.id)))
        }
    }

    const handleBulkDelete = async () => {
        if (!confirm(`¿Estás seguro de eliminar ${selectedIds.size} cotizaciones seleccionadas?`)) return

        setIsDeleting(true)
        try {
            const { deleteQuotes } = await import("@/modules/core/quotes/actions")
            await deleteQuotes(Array.from(selectedIds))
            toast.success(`${selectedIds.size} cotizaciones eliminadas`)
            setSelectedIds(new Set())
            await fetchQuotes()
        } catch (error) {
            console.error("Error deleting quotes:", error)
            toast.error("Error al eliminar cotizaciones")
        } finally {
            setIsDeleting(false)
        }
    }

    const filteredQuotes = quotes.filter(quote => {
        const entityName = quote.client?.name || quote.lead?.name || ""
        const entityCompany = quote.client?.company_name || quote.lead?.company_name || ""

        const matchesSearch =
            quote.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entityCompany.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === 'all' || quote.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const statusConfig = {
        draft: { label: t('quotes.status.draft'), color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
        sent: { label: t('quotes.status.sent'), color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
        accepted: { label: t('quotes.status.accepted'), color: 'bg-green-50 text-green-700 hover:bg-green-100' },
        converted: { label: t('quotes.status.converted'), color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 ring-1 ring-purple-600/20' },
        rejected: { label: t('quotes.status.rejected'), color: 'bg-red-50 text-red-700 hover:bg-red-100' },
        expired: { label: t('quotes.status.expired'), color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
    }

    return (
        <div className="space-y-6">
            {/* Standardized Header */}
            <SectionHeader
                title={t('quotes.title')}
                subtitle={t('quotes.subtitle')}
                icon={FileText}
                action={<CreateQuoteSheet emitters={emitters} />}
            />

            {/* Unified Control Block */}
            <div className="flex flex-col md:flex-row gap-3 sticky top-4 z-30">
                <div className="bg-white dark:bg-white/5 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-1.5 flex flex-col md:flex-row items-center gap-2 flex-1 transition-all hover:shadow-md">
                    {/* Integrated Search */}
                    <div className="relative flex-1 w-full md:w-auto min-w-[200px] flex items-center px-3 gap-2">
                        <Search className="h-4 w-4 text-gray-400 shrink-0" />
                        <Input
                            placeholder={t('quotes.search_placeholder')}
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
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1 hidden lg:block">{t('quotes.table.status')}</span>
                            {[
                                { id: 'all', label: t('quotes.status.all') },
                                ...Object.entries(statusConfig).map(([key, val]) => ({ id: key, label: val.label }))
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setStatusFilter(filter.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap",
                                        statusFilter === filter.id
                                            ? "bg-gray-900 text-white shadow-sm"
                                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
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
                                : "bg-white dark:bg-transparent text-gray-500 border-transparent hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                        )}
                        title="Filtrar Cotizaciones"
                    >
                        <ListFilter className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-md shadow-sm overflow-hidden relative">
                <BulkActionsFloatingBar
                    selectedCount={selectedIds.size}
                    onDelete={handleBulkDelete}
                    onClearSelection={() => setSelectedIds(new Set())}
                    isDeleting={isDeleting}
                />
                <Table>
                    <TableHeader className="bg-gray-50/50 dark:bg-white/5">
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={filteredQuotes.length > 0 && selectedIds.size === filteredQuotes.length}
                                    onCheckedChange={toggleAll}
                                />
                            </TableHead>
                            <TableHead className="w-[120px]">{t('quotes.table.number')}</TableHead>
                            <TableHead>{t('quotes.table.client')}</TableHead>
                            <TableHead>{t('quotes.table.date')}</TableHead>
                            <TableHead>{t('quotes.table.total')}</TableHead>
                            <TableHead>{t('quotes.table.status')}</TableHead>
                            <TableHead className="text-right">{t('quotes.table.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center">
                                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Cargando...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredQuotes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                    {t('quotes.table.empty')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredQuotes.map((quote) => {
                                const entityName = quote.client?.name || quote.lead?.name || "Desconocido"
                                const entityCompany = quote.client?.company_name || quote.lead?.company_name
                                const status = statusConfig[quote.status as keyof typeof statusConfig] || statusConfig.draft
                                const hasRecurring = quote.items?.some(i => i.is_recurring)

                                return (
                                    <TableRow key={quote.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 border-gray-100 dark:border-white/5 transition-colors">
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.has(quote.id)}
                                                onCheckedChange={() => toggleSelection(quote.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium text-gray-900 dark:text-white cursor-pointer hover:underline" onClick={() => setSelectedDetailQuote(quote)}>
                                            {quote.number}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-700 dark:text-gray-300">{entityName}</span>
                                                {entityCompany && <span className="text-xs text-gray-400">{entityCompany}</span>}
                                                {quote.lead_id && <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full w-fit mt-1 font-medium">Prospecto</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-sm">{new Date(quote.date).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX')}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900 dark:text-white">${quote.total.toLocaleString(locale === 'en' ? 'en-US' : 'es-MX', { minimumFractionDigits: 2 })}</span>
                                                {hasRecurring && (
                                                    <span className="bg-indigo-50 text-indigo-600 p-1 rounded-md" title="Incluye items recurrentes (Suscripción)">
                                                        <RefreshCcw className="h-3 w-3" />
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all",
                                                status.color
                                            )}>
                                                {quote.status === 'converted' && <CheckCircle className="h-3 w-3" />}
                                                {status.label}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {actionLoading === quote.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin inline-block text-gray-400" />
                                            ) : (
                                                <div className="flex items-center justify-end gap-1">
                                                    {quote.status !== 'draft' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => setShareQuote(quote)}
                                                            title={t('quotes.actions.share_whatsapp')}
                                                        >
                                                            <MessageCircle className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <span className="sr-only">{t('sidebar.more')}</span>
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuItem onClick={() => setSelectedDetailQuote(quote)}>
                                                                <Eye className="mr-2 h-4 w-4 text-gray-400" />
                                                                <span>{t('common.actions.view_details')}</span>
                                                            </DropdownMenuItem>

                                                            <DropdownMenuItem onClick={() => handleDuplicate(quote)}>
                                                                <Copy className="mr-2 h-4 w-4 text-gray-400" />
                                                                <span>{t('quotes.actions.duplicate')}</span>
                                                            </DropdownMenuItem>

                                                            <DropdownMenuSeparator />

                                                            {quote.status === 'draft' && (
                                                                <DropdownMenuItem onClick={() => setShareQuote(quote)} className="text-green-600 focus:text-green-700 focus:bg-green-50">
                                                                    <Send className="mr-2 h-4 w-4" />
                                                                    <span>{t('quotes.actions.share_whatsapp')}</span>
                                                                </DropdownMenuItem>
                                                            )}

                                                            {quote.status === 'draft' && (
                                                                <DropdownMenuItem onClick={() => handleSend(quote)} className="text-blue-600 focus:text-blue-700 focus:bg-blue-50">
                                                                    <FileCheck className="mr-2 h-4 w-4" />
                                                                    <span>{t('quotes.actions.mark_sent')}</span>
                                                                </DropdownMenuItem>
                                                            )}

                                                            {quote.status === 'accepted' && (
                                                                <DropdownMenuItem onClick={() => handleConvert(quote)} className="text-purple-600 focus:text-purple-700 focus:bg-purple-50 font-medium">
                                                                    <FileCheck className="mr-2 h-4 w-4" />
                                                                    <span>{t('quotes.actions.convert_invoice')}</span>
                                                                </DropdownMenuItem>
                                                            )}

                                                            {(quote.status === 'draft' || quote.status === 'rejected') && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDelete(quote.id)}
                                                                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                                    >
                                                                        <Trash className="mr-2 h-4 w-4" />
                                                                        <span>{t('common.actions.delete')}</span>
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <QuoteShareSheet
                quote={shareQuote}
                open={!!shareQuote}
                onOpenChange={(open) => !open && setShareQuote(null)}
            />

            {/* Quote Detail Modal */}
            {selectedDetailQuote && (
                <QuoteDetailDialog
                    quote={selectedDetailQuote}
                    open={!!selectedDetailQuote}
                    onOpenChange={(open) => !open && setSelectedDetailQuote(null)}
                    onQuoteUpdated={fetchQuotes}
                    emitters={emitters}
                />
            )}
        </div>
    )
}

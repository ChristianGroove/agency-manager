"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InvoicesView } from "./invoices-view"
import { FiscalStatusView } from "./fiscal-status-view"
import { PaymentsView } from "./payments-view"
import { AuditView } from "./audit-view"
import { Invoice } from "@/types"
import { FileText, CreditCard, Scale, ShieldCheck } from "lucide-react"

interface BillingControlCenterProps {
    initialInvoices: Invoice[]
}

export function BillingControlCenter({ initialInvoices }: BillingControlCenterProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Centro de Facturación</h1>
                <p className="text-muted-foreground">Gestión centralizada de documentos, cobros y cumplimiento fiscal.</p>
            </div>

            <Tabs defaultValue="documents" className="w-full space-y-6">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px] h-auto p-1 bg-gray-100/50 backdrop-blur-sm border border-gray-200/50 rounded-xl">
                    <TabsTrigger
                        value="documents"
                        className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg py-2.5 transition-all"
                    >
                        <FileText className="h-4 w-4" />
                        <span>Documentos</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="payments"
                        className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg py-2.5 transition-all"
                    >
                        <CreditCard className="h-4 w-4" />
                        <span>Pagos</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="fiscal"
                        className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg py-2.5 transition-all"
                    >
                        <Scale className="h-4 w-4" />
                        <span>Fiscal</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="audit"
                        className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg py-2.5 transition-all"
                    >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Auditoría</span>
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: DOCUMENTOS (Vista Clásica Vitaminada) */}
                <TabsContent value="documents" className="space-y-4 outline-none focus-visible:ring-0">
                    <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-100 p-1">
                        <InvoicesView initialInvoices={initialInvoices} />
                    </div>
                </TabsContent>

                <TabsContent value="fiscal" className="outline-none focus-visible:ring-0">
                    <div className="bg-red-50/30 p-1 rounded-2xl border border-red-100/50">
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/50 shadow-sm">
                            <FiscalStatusView />
                        </div>
                    </div>
                </TabsContent>
                {/* Futuros Tabs */}
                <TabsContent value="payments" className="outline-none focus-visible:ring-0">
                    <div className="bg-blue-50/30 p-1 rounded-2xl border border-blue-100/50">
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/50 shadow-sm">
                            <PaymentsView invoices={initialInvoices} />
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="audit" className="outline-none focus-visible:ring-0">
                    <div className="bg-gray-100/50 p-1 rounded-2xl border border-gray-200/50">
                        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-white/50 shadow-sm">
                            <AuditView />
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

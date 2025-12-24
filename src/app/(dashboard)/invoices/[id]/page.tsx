"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, Download, Share2, Mail, ArrowLeft, CreditCard, Smartphone, Globe } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

import { Invoice } from "@/types"

import { ShareInvoiceModal } from "@/components/modules/invoices/share-invoice-modal"
import { InvoiceTemplate } from "@/components/modules/invoices/invoice-template"
import { ShareButton } from "@/components/animate-ui/components/community/share-button"
import { getSettings } from "@/lib/actions/settings"
import { getDocumentTypeLabel } from "@/lib/billing-utils"

export default function InvoicePage() {
  const params = useParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [settings, setSettings] = useState<any>({})

  useEffect(() => {
    if (params.id) {
      fetchInvoice(params.id as string)
      fetchSettings()
    }
  }, [params.id])

  const fetchSettings = async () => {
    const data = await getSettings()
    setSettings(data)
  }

  const fetchInvoice = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          client:clients (*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      setInvoice(data)
    } catch (error) {
      console.error("Error fetching invoice:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = () => {
    // Use browser's print dialog which can save as PDF
    window.print()
  }

  const handleShareEmail = () => {
    if (!invoice || !invoice.client) return
    const subject = `Cuenta de Cobro N° ${invoice.number} - ${invoice.client.company_name}`
    const body = `Hola ${invoice.client.name},\n\nAdjunto encontrarás la cuenta de cobro N° ${invoice.number}.\n\nTotal a pagar: $${invoice.total.toLocaleString()}\n\nGracias por tu confianza.`
    const url = `mailto:${invoice.client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(url, '_blank')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
    </div>
  }

  if (!invoice) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100">Factura no encontrada</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col print:p-0 print:bg-white rounded-xl print:rounded-none">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border border-gray-200/50 shadow-sm rounded-xl mb-8 print:hidden">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={invoice.client?.id ? `/clients/${invoice.client.id}` : '/clients'}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-gray-100"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <div className="h-8 w-px bg-gray-300" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {getDocumentTypeLabel(invoice.document_type || 'CUENTA_DE_COBRO')}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <ShareButton
                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/invoice/${params.id}`}
                title={`Factura #${invoice.number}`}
                onShare={() => setIsShareOpen(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Content Wrapper */}
      <div className="flex-1 flex justify-center px-4 pb-12">


        {/* Invoice Container - Clean White Design */}
        <InvoiceTemplate
          ref={invoiceRef}
          invoice={invoice}
          settings={settings || {}}
        />
      </div>

      {/* Share Modal */}
      <ShareInvoiceModal
        isOpen={isShareOpen}
        onOpenChange={setIsShareOpen}
        invoice={invoice}
        client={invoice.client}
        settings={settings || {}}
      />
    </div >
  )
}

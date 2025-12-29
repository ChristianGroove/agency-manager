"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, Download, Share2, Mail, ArrowLeft, CreditCard, Smartphone, Globe } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

import { Invoice } from "@/types"

import { ShareInvoiceModal } from "@/modules/verticals/agency/invoicing/share-invoice-modal"
import { InvoiceTemplate } from "@/modules/verticals/agency/invoicing/invoice-template"
import { ShareButton } from "@/components/animate-ui/components/community/share-button"
import { getSettings } from "@/modules/core/settings/actions"
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

  const handleSendEmailSystem = async () => {
    if (!invoice || !invoice.client) return
    if (!invoice.client.email) return alert('El cliente no tiene un email registrado.')

    try {
      // Dynamic imports
      const { toPng } = await import('html-to-image')
      const jsPDF = (await import('jspdf')).default

      if (!invoiceRef.current) return

      const dataUrl = await toPng(invoiceRef.current, { quality: 0.95, backgroundColor: '#ffffff' })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const imgProps = pdf.getImageProperties(dataUrl)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight)
      const pdfBase64 = pdf.output('datauristring')

      const response = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invoice.client.email,
          invoiceNumber: invoice.number,
          clientName: invoice.client.name,
          amount: `$${invoice.total.toLocaleString()}`,
          dueDate: new Date(invoice.due_date || invoice.date).toLocaleDateString(),
          pdfBase64,
          organizationId: invoice.organization_id || settings?.organization_id // Fallback if type missing
        })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to send')
      }

      alert('Factura enviada exitosamente')
    } catch (error: any) {
      console.error(error)
      alert(`Error al enviar: ${error.message}`)
      throw error // Re-throw so modal knows it failed
    }
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
        onSendEmail={handleSendEmailSystem}
      />
    </div >
  )
}

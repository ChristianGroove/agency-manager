"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, Download, Share2, Mail, ArrowLeft, CreditCard, Smartphone, Globe } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

type Invoice = {
  id: string
  number: string
  date: string
  due_date: string
  total: number
  status: string
  items: { description: string; quantity: number; price: number }[]
  client: {
    id: string
    name: string
    company_name: string
    nit: string
    email: string
    phone: string
    address: string
  }
}

export default function InvoicePage() {
  const params = useParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchInvoice(params.id as string)
    }
  }, [params.id])

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

  const handleShareWhatsApp = () => {
    if (!invoice) return
    const message = `Hola ${invoice.client.name}, te comparto la Cuenta de Cobro N° ${invoice.number} por valor de $${invoice.total.toLocaleString()}.`
    const url = `https://wa.me/${invoice.client.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const handleShareEmail = () => {
    if (!invoice) return
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
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center gap-8 print:p-0 print:bg-white">
      {/* Actions Bar */}
      <div className="w-full max-w-[800px] flex justify-between items-center print:hidden">
        <Link href={`/clients/${invoice.client.id}`}>
          <Button variant="ghost" className="text-gray-700 hover:text-indigo-600">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button onClick={handleShareWhatsApp} className="bg-green-600 hover:bg-green-700 text-white">
            <Share2 className="mr-2 h-4 w-4" /> WhatsApp
          </Button>
          <Button
            onClick={async () => {
              if (!invoice) return;

              try {
                setDownloading(true);

                // Dynamic import for html-to-image and jspdf to avoid SSR issues
                const { toPng } = await import('html-to-image');
                const jsPDF = (await import('jspdf')).default;

                if (!invoiceRef.current) return;

                // Generate PNG using html-to-image
                const dataUrl = await toPng(invoiceRef.current, {
                  quality: 0.95,
                  backgroundColor: '#ffffff'
                });

                const pdf = new jsPDF({
                  orientation: 'portrait',
                  unit: 'mm',
                  format: 'a4'
                });

                const imgProps = pdf.getImageProperties(dataUrl);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);

                // Get PDF as base64 string
                const pdfBase64 = pdf.output('datauristring');

                // Send to API
                const response = await fetch('/api/send-invoice', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    email: invoice.client.email,
                    invoiceNumber: invoice.number,
                    clientName: invoice.client.name,
                    amount: `$${invoice.total.toLocaleString()}`,
                    dueDate: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : new Date().toLocaleDateString(),
                    concept: invoice.items.map((item: any) => item.description).join(', '),
                    pdfBase64
                  }),
                });

                if (!response.ok) {
                  const contentType = response.headers.get("content-type");
                  if (contentType && contentType.indexOf("application/json") !== -1) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to send email');
                  } else {
                    const errorText = await response.text();
                    console.error('Non-JSON API Error:', errorText);
                    throw new Error(`Server Error (${response.status}): ${errorText.slice(0, 100)}...`);
                  }
                }

                alert('Correo enviado exitosamente');

              } catch (error: any) {
                console.error('Error sending email:', error);
                alert(`Error al enviar el correo: ${error.message}`);
              } finally {
                setDownloading(false);
              }
            }}
            disabled={downloading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Email
          </Button>
          <Button onClick={handleDownloadPDF} disabled={downloading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
        </div>
      </div>

      {/* Invoice Container - Clean White Design */}
      <div
        ref={invoiceRef}
        className="w-full max-w-[800px] bg-white text-gray-900 p-12 shadow-lg border border-gray-200 relative overflow-hidden"
        style={{ minHeight: '1123px' }}
      >
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <img
            src="/pixy-isotipo.png"
            alt="Watermark"
            className="w-[80%] opacity-[0.03] object-contain"
          />
        </div>

        <div className="flex flex-col h-full relative z-10">
          {/* Header */}
          <div className="flex justify-between items-start mb-12 pb-6 border-b-2 border-gray-900">
            <div className="flex flex-col items-center">
              <img src="/branding/logo dark.svg" alt="PIXY" className="h-12 w-auto" />
              <p className="text-sm text-gray-600 mt-2 font-medium tracking-wide">Private design service</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">CUENTA DE COBRO</h2>
              <p className="text-lg font-bold text-gray-900 mb-1">No. {invoice.number}</p>
              <p className="text-sm text-gray-600">Fecha: {new Date(invoice.date).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-12 mb-12">
            <div>
              <h3 className="text-xs font-bold mb-3 uppercase text-gray-500 tracking-wider">Emitido por:</h3>
              <p className="font-bold text-base text-gray-900">Cristian Camilo Gómez</p>
              <p className="text-sm text-gray-700">NIT: 1110458437</p>
              <p className="text-sm text-gray-700">Cra 3 # 41-107 Ibagué-Tolima</p>
              <p className="text-sm text-gray-700">contact@pixy.com.co</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">Cel: +57 350 407 6800</p>
            </div>
            <div>
              <h3 className="text-xs font-bold mb-3 uppercase text-gray-500 tracking-wider">Para:</h3>
              <p className="font-bold text-base text-gray-900">{invoice.client.name}</p>
              <p className="text-sm text-gray-700">{invoice.client.company_name}</p>
              <p className="text-sm text-gray-700">NIT/CC: {invoice.client.nit}</p>
              <p className="text-sm text-gray-700">{invoice.client.address}</p>
              <p className="text-sm text-gray-700">{invoice.client.email}</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">Cel: {invoice.client.phone}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-12 rounded-lg overflow-hidden border border-gray-200">
            <div className="bg-gray-50 text-gray-700 p-4 grid grid-cols-12 font-bold text-xs uppercase tracking-wider border-b border-gray-200">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-5">Descripción</div>
              <div className="col-span-2 text-right">Precio Unit.</div>
              <div className="col-span-2 text-center">Cant.</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            <div className="bg-white">
              {invoice.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 p-4 text-sm border-b border-gray-100 last:border-b-0 hover:bg-gray-50/30 transition-colors">
                  <div className="col-span-1 text-center text-gray-500 font-medium">{index + 1}</div>
                  <div className="col-span-5 font-medium text-gray-900">{item.description}</div>
                  <div className="col-span-2 text-right text-gray-600">${item.price.toLocaleString()}</div>
                  <div className="col-span-2 text-center text-gray-600">{item.quantity}</div>
                  <div className="col-span-2 text-right font-bold text-gray-900">${(item.price * item.quantity).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-12">
            <div className="w-1/2 border-t-2 border-gray-900 pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Subtotal:</span>
                <span className="text-base font-bold text-gray-900">${invoice.total.toLocaleString()} COP</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-300">
                <span className="text-base font-bold text-gray-900">TOTAL:</span>
                <span className="text-xl font-bold text-gray-900">${invoice.total.toLocaleString()} COP</span>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          {/* Payment Methods */}
          {/* Payment Methods */}
          {/* Payment Methods */}
          <div className="mt-auto mb-8">
            <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-3">Métodos de Pago</h4>
            <div className="grid grid-cols-3 gap-3">
              {/* Bancolombia */}
              <div className="p-2 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center p-0.5">
                    <img src="/payment-methods/bancolombia.png" alt="Bancolombia" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-900 leading-tight truncate">Bancolombia</p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-wide leading-tight truncate">Ahorros</p>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-gray-700 bg-white px-1.5 py-0.5 rounded border border-gray-200 whitespace-nowrap">068 000 830 18</p>
              </div>

              {/* Bre-B */}
              <div className="p-2 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center p-0.5">
                    <img src="/payment-methods/bre-b.png" alt="Bre-B" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-900 leading-tight truncate">Bre-B</p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-wide leading-tight truncate">Llave</p>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-gray-700 bg-white px-1.5 py-0.5 rounded border border-gray-200 whitespace-nowrap">0090983657</p>
              </div>

              {/* Nequi */}
              <div className="p-2 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center p-0.5">
                    <img src="/payment-methods/nequi.png" alt="Nequi" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-900 leading-tight truncate">Nequi</p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-wide leading-tight truncate">Móvil</p>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-gray-700 bg-white px-1.5 py-0.5 rounded border border-gray-200 whitespace-nowrap">300 670 5958</p>
              </div>

              {/* Daviplata */}
              <div className="p-2 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center p-0.5">
                    <img src="/payment-methods/daviplata.png" alt="Daviplata" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-900 leading-tight truncate">Daviplata</p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-wide leading-tight truncate">Móvil</p>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-gray-700 bg-white px-1.5 py-0.5 rounded border border-gray-200 whitespace-nowrap">300 670 5958</p>
              </div>

              {/* PayPal */}
              <div className="p-2 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center p-0.5">
                    <img src="/payment-methods/paypal.png" alt="PayPal" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-900 leading-tight truncate">PayPal</p>
                  </div>
                </div>
                <a href="https://paypal.me/pixypay" target="_blank" rel="noopener noreferrer" className="text-[10px] font-medium text-indigo-600 bg-white px-2 py-1 rounded border border-indigo-100 text-center hover:bg-indigo-50 transition-colors whitespace-nowrap">
                  Ir a pagar
                </a>
              </div>

              {/* Wompi */}
              <div className="p-2 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center p-0.5">
                    <img src="/payment-methods/wompi.png" alt="Wompi" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-900 leading-tight truncate">Wompi</p>
                  </div>
                </div>
                <a href="https://checkout.wompi.co/l/7MP7DT" target="_blank" rel="noopener noreferrer" className="text-[10px] font-medium text-indigo-600 bg-white px-2 py-1 rounded border border-indigo-100 text-center hover:bg-indigo-50 transition-colors whitespace-nowrap">
                  Ir a pagar
                </a>
              </div>
            </div>
          </div>

          {/* Legal Text */}
          <div className="pt-8 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 text-center leading-relaxed max-w-2xl mx-auto">
              Declaro, bajo gravedad de juramento, que mis ingresos corresponden a servicios personales sin relación laboral ni legal y reglamentaria, y que no tomaré costos ni gastos como deducibles. Por tanto, solicito aplicar la tabla del artículo 383 del E.T., con el 25% de renta exenta conforme al artículo 206-10 ibídem.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

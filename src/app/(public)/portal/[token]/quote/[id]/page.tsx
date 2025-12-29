import { getPortalQuote, getPortalMetadata } from "@/modules/core/portal/actions"
import { QuoteTemplate } from "@/modules/verticals/agency/quotes/quote-template"
import { notFound } from "next/navigation"

export default async function PortalQuotePrintPage({
    params
}: {
    params: { token: string; id: string }
}) {
    // Unwrap params (Next.js 15+ compatible)
    const { token, id } = await params

    try {
        const [quote, settings] = await Promise.all([
            getPortalQuote(token, id),
            getPortalMetadata(token)
        ])

        if (!quote) return notFound()

        return (
            <div className="min-h-screen bg-gray-100 flex justify-center p-8 print:p-0 print:bg-white">
                <style type="text/css" media="print">
                    {`
@page { size: auto; margin: 0mm; }
                        body { margin: 0px; }
`}
                </style>
                <div className="w-full max-w-[800px]">
                    <QuoteTemplate
                        quote={quote}
                        settings={settings}
                        className="shadow-none border-none print:shadow-none print:border-none"
                    />
                </div>

                {/* Floating Print Button - Hidden when printing */}
                <div className="fixed bottom-8 right-8 print:hidden">
                    <button
                        id="print-btn"
                        className="bg-black text-white px-6 py-3 rounded-full shadow-lg hover:bg-gray-800 font-medium transition-transform active:scale-95 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Imprimir / Guardar PDF
                    </button>
                    {/* Inline script for the button to work without client-side hydration for this simple page */}
                    <script dangerouslySetInnerHTML={{
                        __html: `
document.getElementById('print-btn').addEventListener('click', () => window.print());
`}} />
                </div>
            </div>
        )
    } catch (error) {
        console.error("Error loading quote:", error)
        return notFound()
    }
}


'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronLeft, ChevronRight, Printer, Download, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Setup worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfViewerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    url: string | null
    highlightImei?: string
}

export function PdfViewerDialog({ open, onOpenChange, url, highlightImei }: PdfViewerDialogProps) {
    const [numPages, setNumPages] = useState<number>(0)
    const [pageNumber, setPageNumber] = useState(1)
    const [scale, setScale] = useState(1.2)
    const [loading, setLoading] = useState(true)

    // Reset when URL changes
    useEffect(() => {
        if (open) {
            setPageNumber(1)
            setLoading(true)
        }
    }, [open, url])

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages)
        setLoading(false)
        console.log('PDF Loaded, pages:', numPages)
    }

    // Custom Text Renderer to highlight IMEI
    // This inserts a span with a yellow background if the text matches the IMEI
    const textRenderer = useMemo(() => {
        if (!highlightImei) return undefined

        return (textItem: any) => {
            const str = textItem.str
            if (str.includes(highlightImei)) {
                return str.replace(
                    highlightImei,
                    `<span style="background-color: yellow; color: black; font-weight: bold; border: 2px solid red;">${highlightImei}</span>`
                )
            }
            return str
        }
    }, [highlightImei])

    async function handleDownloadWithHighlight() {
        if (!url || !highlightImei) return

        toast.loading('Generando PDF resaltado...')
        try {
            // 1. Load PDF dependencies dynamically
            const { PDFDocument, rgb } = await import('pdf-lib')

            // 2. Fetch original PDF
            const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer())

            // 3. Load into PDF-Lib
            const pdfDoc = await PDFDocument.load(existingPdfBytes)
            const pages = pdfDoc.getPages()

            // 4. Find coordinates using PDF.js (already loaded by react-pdf)
            const loadingTask = pdfjs.getDocument(url)
            const pdfJsDoc = await loadingTask.promise

            let matchesFound = 0

            for (let i = 1; i <= pdfJsDoc.numPages; i++) {
                const page = await pdfJsDoc.getPage(i)
                const textContent = await page.getTextContent()
                // item.transform is [scaleX, skewY, skewX, scaleY, x, y]

                // Filter items that match the IMEI
                for (const item of textContent.items as any[]) {
                    if (item.str.includes(highlightImei)) {
                        matchesFound++

                        const tx = item.transform
                        const x = tx[4]
                        const y = tx[5]
                        const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]); // approx font size
                        const width = item.width
                        const height = item.height || fontSize

                        // 5. Draw Rectangle on corresponding PDF-Lib page (0-indexed)
                        if (pages[i - 1]) {
                            const pdfLibPage = pages[i - 1]
                            pdfLibPage.drawRectangle({
                                x: x,
                                y: y,
                                width: width,
                                height: height * 1.2,
                                color: rgb(1, 1, 0), // Yellow
                                opacity: 0.5,
                            })
                        }
                    }
                }
            }

            if (matchesFound > 0) {
                // 6. Save and Download
                const pdfBytes = await pdfDoc.save()
                const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
                const downloadUrl = URL.createObjectURL(blob)

                const link = document.createElement('a')
                link.href = downloadUrl
                link.download = `highlighted-${highlightImei}.pdf`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                toast.success('PDF descargado con resaltado')
            } else {
                toast.warning('No se encontraron coincidencias para resaltar en el archivo')
                // Fallback to normal download
                const link = document.createElement('a')
                link.href = url
                link.download = 'document.pdf'
                link.click()
            }

        } catch (error) {
            console.error('Error generating highlighted PDF:', error)
            toast.error('Error al generar el PDF resaltado')
        } finally {
            toast.dismiss()
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
                <DialogTitle className="sr-only">Visor de Manifiesto</DialogTitle>

                {/* Header Controls */}
                <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                            disabled={pageNumber <= 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium">
                            Página {pageNumber} de {numPages || '--'}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                            disabled={pageNumber >= numPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        {highlightImei && (
                            <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium border border-yellow-200">
                                <Search className="h-3 w-3" />
                                Resaltando: {highlightImei}
                            </div>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>-</Button>
                        <span className="text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
                        <Button variant="outline" size="sm" onClick={() => setScale(s => Math.min(2.5, s + 0.2))}>+</Button>
                    </div>

                    <div className="flex gap-2">
                        {url && (
                            <div className="flex gap-1">
                                {/* Normal Download */}
                                <Button variant="ghost" size="icon" asChild title="Descargar Original">
                                    <a href={url} target="_blank" rel="noreferrer" download>
                                        <Download className="h-4 w-4" />
                                    </a>
                                </Button>
                                {/* Highlight Download */}
                                {highlightImei && (
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={handleDownloadWithHighlight}
                                        className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-white"
                                        title="Descargar con Resaltado"
                                    >
                                        <Download className="h-4 w-4" />
                                        Con Resaltado
                                    </Button>
                                )}
                            </div>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => window.print()}>
                            <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>
                            Cerrar
                        </Button>
                    </div>
                </div>

                {/* PDF Render Area */}
                <div className="flex-1 overflow-auto bg-slate-100 flex justify-center p-4">
                    {url ? (
                        <Document
                            file={url}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={
                                <div className="flex flex-col items-center gap-2 mt-20">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="text-sm text-muted-foreground">Cargando documento...</p>
                                </div>
                            }
                            error={
                                <div className="mt-20 text-red-500 font-medium">
                                    Error al cargar el PDF. Puede que el enlace haya expirado.
                                </div>
                            }
                        >
                            <Page
                                pageNumber={pageNumber}
                                scale={scale}
                                className="shadow-lg"
                                customTextRenderer={textRenderer}
                                renderTextLayer={true}
                            />
                        </Document>
                    ) : (
                        <div className="mt-20 text-muted-foreground">No hay documento seleccionado</div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}


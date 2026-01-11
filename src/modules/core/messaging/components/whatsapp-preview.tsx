"use client"

import { cn } from "@/lib/utils"
import { TemplateComponent } from "../template-actions"
import { Image as ImageIcon, FileText, Video, ExternalLink, Phone } from "lucide-react"

interface WhatsAppPreviewProps {
    components: TemplateComponent[]
}

export function WhatsAppPreview({ components = [] }: WhatsAppPreviewProps) {
    const safeComponents = components || []
    const header = safeComponents.find(c => c.type === 'HEADER')
    const body = safeComponents.find(c => c.type === 'BODY')
    const footer = safeComponents.find(c => c.type === 'FOOTER')
    const buttons = safeComponents.find(c => c.type === 'BUTTONS')

    // Helper to render body text with highlighting variables
    const renderBody = (text: string) => {
        if (!text) return <span className="text-gray-400 italic">Escribe el contenido...</span>

        // Regex to match {{1}}, {{2}} etc
        const parts = text.split(/(\{\{\d+\}\})/g)
        return parts.map((part, i) => {
            if (part.match(/^\{\{\d+\}\}$/)) {
                return (
                    <span key={i} className="bg-blue-100 text-blue-600 px-1 rounded mx-0.5 font-medium text-xs">
                        {part}
                    </span>
                )
            }
            return part
        })
    }

    return (
        <div className="w-[320px] bg-[#E5DDD5] rounded-[30px] overflow-hidden border-8 border-slate-800 shadow-2xl relative">
            {/* Notch / Status Bar Mockup */}
            <div className="h-8 bg-[#E5DDD5] w-full flex items-center justify-between px-6 pt-2">
                <span className="text-[10px] font-bold text-gray-800">9:41</span>
                <div className="flex gap-1">
                    <div className="w-4 h-2.5 bg-gray-800 rounded-[2px]" />
                </div>
            </div>

            {/* Chat Area */}
            <div className="p-4 flex flex-col gap-2 min-h-[500px] bg-[#E5DDD5] overflow-y-auto bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">

                {/* Message Bubble */}
                <div className="bg-white rounded-lg p-1 shadow-sm max-w-[90%] self-start rounded-tl-none relative animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className={cn("p-1", buttons?.buttons?.length ? "pb-0" : "")}>

                        {/* HEADER */}
                        {header && (
                            <div className="mb-2 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                                {header.format === 'IMAGE' && (
                                    <div className="w-full h-32 bg-slate-200 flex items-center justify-center text-gray-400">
                                        <ImageIcon className="h-8 w-8" />
                                    </div>
                                )}
                                {header.format === 'VIDEO' && (
                                    <div className="w-full h-32 bg-slate-200 flex items-center justify-center text-gray-400">
                                        <Video className="h-8 w-8" />
                                    </div>
                                )}
                                {header.format === 'DOCUMENT' && (
                                    <div className="w-full py-4 bg-slate-50 flex items-center justify-center gap-2 text-gray-600 border border-slate-100 rounded">
                                        <FileText className="h-5 w-5" />
                                        <span className="text-xs font-medium">Documento.pdf</span>
                                    </div>
                                )}
                                {header.format === 'TEXT' && (
                                    <p className="px-2 pt-2 font-bold text-sm text-gray-900 leading-tight">
                                        {renderBody(header.text || "")}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* BODY */}
                        <div className="px-2 text-[14px] leading-relaxed text-gray-900 whitespace-pre-wrap">
                            {renderBody(body?.text || "")}
                        </div>

                        {/* FOOTER */}
                        {footer && footer.text && (
                            <div className="px-2 mt-1 text-[11px] text-gray-400 leading-tight pb-1">
                                {footer.text}
                            </div>
                        )}

                        {/* TIMESTAMP */}
                        <div className="flex justify-end px-2 pb-1">
                            <span className="text-[10px] text-gray-400">Ahora</span>
                        </div>
                    </div>

                    {/* BUTTONS */}
                    {buttons?.buttons && buttons.buttons.length > 0 && (
                        <div className="border-t border-gray-100 mt-1">
                            {buttons.buttons.map((btn, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "h-10 flex items-center justify-center gap-2 text-[#00A5F4] text-sm font-medium hover:bg-gray-50 cursor-pointer transition-colors px-4",
                                        i !== 0 ? "border-t border-gray-100" : ""
                                    )}
                                >
                                    {btn.type === 'URL' && <ExternalLink className="h-3.5 w-3.5" />}
                                    {btn.type === 'PHONE_NUMBER' && <Phone className="h-3.5 w-3.5" />}
                                    <span className="truncate">{btn.text || "Botón"}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}

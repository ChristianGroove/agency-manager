"use client"

import { Printer } from "lucide-react"

export function PortalPrintFab() {
    return (
        <div className="fixed bottom-8 right-8 print:hidden z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button
                onClick={() => window.print()}
                className="shadow-xl bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-4 h-auto text-lg gap-2 flex items-center transition-transform active:scale-95"
            >
                <Printer className="h-5 w-5" />
                Imprimir / Guardar PDF
            </button>
        </div>
    )
}

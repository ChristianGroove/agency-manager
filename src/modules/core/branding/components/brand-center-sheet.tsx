"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { BrandCenter } from "./brand-center"
import { BrandingConfig } from "../actions"

interface BrandCenterSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    settings: BrandingConfig
    activeModules: string[]
}

export function BrandCenterSheet({ open, onOpenChange, settings, activeModules }: BrandCenterSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-xl md:max-w-2xl lg:max-w-4xl w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100">
                        <SheetHeader className="text-left">
                            <SheetTitle>Centro de Marca</SheetTitle>
                            <SheetDescription>
                                Gestiona la identidad visual, portal y documentos de tu agencia.
                            </SheetDescription>
                        </SheetHeader>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200">
                        <div className="pb-10">
                            <BrandCenter
                                initialSettings={settings}
                                activeModules={activeModules}
                                variant="sheet"
                            />
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Package } from "lucide-react"
import { toast } from "sonner"

interface CreateAppSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function CreateAppSheet({ open, onOpenChange, onSuccess }: CreateAppSheetProps) {
    // TEMPORARILY DISABLED DUE TO TYPE MIGRATION - NEEDS REFACTORING TO USE SaasApp interface
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Crear App SaaS</SheetTitle>
                    <SheetDescription>Componente temporalmente deshabilitado</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                        <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Componente temporalmente deshabilitado</h3>
                    <p className="text-sm text-gray-500 max-w-sm mt-1">
                        Este componente requiere refactorización de tipos para trabajar con la nueva arquitectura. Será restaurado pronto.
                    </p>
                </div>
            </SheetContent>
        </Sheet>
    )
}

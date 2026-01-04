"use client"

import { SaaSProduct } from "@/types/saas"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Package } from "lucide-react"

interface AppListProps {
    items: SaaSProduct[]
    onEdit?: (item: SaaSProduct) => void
    onDelete?: (id: string) => void
}

export function AppList({ items, onEdit, onDelete }: AppListProps) {
    // TEMPORARILY DISABLED DUE TO TYPE MISMATCHES - NEEDS REFACTORING TO USE SaasApp
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl border-gray-200 bg-gray-50/50">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Componente temporalmente deshabilitado</h3>
            <p className="text-sm text-gray-500 max-w-sm mt-1">
                Este componente requiere refactorización de tipos. Será restaurado pronto.
            </p>
        </div>
    )
}

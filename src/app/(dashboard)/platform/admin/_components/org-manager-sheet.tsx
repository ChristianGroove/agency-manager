"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Building2, ArrowLeft, Loader2 } from "lucide-react"
import { OrganizationsTable } from "@/components/admin/organizations-table"
import { getOrgManagerData } from "@/app/actions/admin-dashboard-actions"
import { OrgControlTabs } from "../organizations/_components/org-control-tabs"
import { toast } from "sonner"

interface OrgManagerSheetProps {
    organizations: any[]
    allModules: any[]
}

export function OrgManagerSheet({ organizations, allModules }: OrgManagerSheetProps) {
    const [open, setOpen] = useState(false)
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
    const [orgData, setOrgData] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const handleOrgSelect = async (orgId: string) => {
        setLoading(true)
        setSelectedOrgId(orgId)
        try {
            const data = await getOrgManagerData(orgId)
            setOrgData(data)
        } catch (error: any) {
            toast.error("Error al cargar organización: " + error.message)
            setSelectedOrgId(null) // Reset on error
        } finally {
            setLoading(false)
        }
    }

    const handleBack = () => {
        setSelectedOrgId(null)
        setOrgData(null)
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline">
                    <Building2 className="mr-2 h-4 w-4" />
                    Ver Organizaciones
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[800px] sm:w-[90%] sm:max-w-[1000px] overflow-y-auto p-0 gap-0">
                <SheetHeader className="px-6 py-4 border-b bg-muted/10 sticky top-0 bg-background z-10">
                    <div className="flex items-center gap-2">
                        {selectedOrgId && (
                            <Button variant="ghost" size="icon" onClick={handleBack} className="-ml-2">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <SheetTitle>
                            {selectedOrgId ? (orgData?.organization?.name || 'Cargando...') : 'Gestión de Organizaciones'}
                        </SheetTitle>
                    </div>
                    <SheetDescription>
                        {selectedOrgId
                            ? "Administra módulos, usuarios y seguridad para este tenant."
                            : "Lista completa de inquilinos del SaaS."
                        }
                    </SheetDescription>
                </SheetHeader>

                {/* Content Area */}
                <div className="p-6">
                    {!selectedOrgId ? (
                        <OrganizationsTable organizations={organizations} onSelect={handleOrgSelect} />
                    ) : (
                        loading || !orgData ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <OrgControlTabs data={orgData} allModules={allModules} />
                        )
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}

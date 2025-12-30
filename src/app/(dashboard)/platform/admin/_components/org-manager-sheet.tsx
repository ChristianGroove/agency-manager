"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Building2, ArrowLeft, Loader2 } from "lucide-react"
import { OrganizationsTable } from "@/components/admin/organizations-table"
import { getOrgManagerData } from "@/modules/core/admin/actions"
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
            <SheetContent
                side="right"
                className="
                    sm:max-w-[1000px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <SheetHeader className="hidden">
                    <SheetTitle>
                        {selectedOrgId ? (orgData?.organization?.name || 'Cargando...') : 'Gestión de Organizaciones'}
                    </SheetTitle>
                    <SheetDescription>
                        {selectedOrgId
                            ? "Administra módulos, usuarios y seguridad para este tenant."
                            : "Lista completa de inquilinos del SaaS."
                        }
                    </SheetDescription>
                </SheetHeader>

                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/40 backdrop-blur-md border-b border-black/5">
                        <div className="flex items-center gap-3">
                            {selectedOrgId && (
                                <Button variant="ghost" size="icon" onClick={handleBack} className="-ml-2">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                                    {selectedOrgId ? (orgData?.organization?.name || 'Cargando...') : 'Gestión de Organizaciones'}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {selectedOrgId
                                        ? "Administra módulos, usuarios y seguridad."
                                        : "Lista completa de inquilinos del SaaS."
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-gray-200">
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

                    {/* Footer (optional - can add actions later) */}
                    <div className="sticky bottom-0 bg-white/80 backdrop-blur-md p-6 border-t border-gray-100 z-20">
                        <Button variant="ghost" onClick={() => setOpen(false)} className="w-full text-gray-500 hover:text-red-500">
                            Cerrar
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

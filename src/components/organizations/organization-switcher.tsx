"use client"

import { useState, useEffect } from "react"
import { Building2, Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CreateOrganizationSheet } from "./create-organization-sheet"
import { OrganizationMember } from "@/types/organization"
import { getUserOrganizations, switchOrganization, getCurrentOrgName, getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function OrganizationSwitcher() {
    const router = useRouter()
    const [organizations, setOrganizations] = useState<OrganizationMember[]>([])
    const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isOpen, setIsOpen] = useState(false)
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    // Load initial state
    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const orgs = await getUserOrganizations()
            setOrganizations(orgs)

            const current = await getCurrentOrganizationId()
            setCurrentOrgId(current)
        } catch (error) {
            console.error("Error loading organizations:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSwitch = async (orgId: string) => {
        try {
            await switchOrganization(orgId)
            setIsOpen(false)
            router.refresh()
            toast.success("Organización cambiada")
        } catch (error) {
            toast.error("Error cambiando de organización")
        }
    }

    // Conditional Rendering: Only show if loading or has > 1 organization
    if (!isLoading && organizations.length <= 1) {
        return null
    }

    if (isLoading) {
        return <div className="h-9 w-9 bg-gray-100 rounded-md animate-pulse" />
    }

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(true)}
                className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
            >
                <Building2 className="h-5 w-5" />
            </Button>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                    <SheetHeader className="mb-6">
                        <SheetTitle>Mis Organizaciones</SheetTitle>
                        <SheetDescription>
                            Cambia entre tus organizaciones o crea una nueva.
                        </SheetDescription>
                    </SheetHeader>

                    <ScrollArea className="h-[calc(100vh-180px)] pr-4">
                        <div className="space-y-2">
                            {organizations.map((member) => (
                                <div
                                    key={member.organization_id}
                                    onClick={() => handleSwitch(member.organization_id)}
                                    className={`
                                        flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border
                                        ${member.organization_id === currentOrgId
                                            ? "bg-indigo-50 border-indigo-200 shadow-sm"
                                            : "hover:bg-gray-50 border-transparent hover:border-gray-200"
                                        }
                                    `}
                                >
                                    <div className={`
                                        flex h-12 w-12 items-center justify-center rounded-lg font-bold text-lg shadow-sm
                                        ${member.organization_id === currentOrgId
                                            ? "bg-indigo-600 text-white"
                                            : "bg-white border border-gray-100 text-gray-700"
                                        }
                                    `}>
                                        {member.organization?.logo_url ? (
                                            <img src={member.organization.logo_url} alt="" className="h-full w-full object-cover rounded-lg" />
                                        ) : (
                                            <span>{member.organization?.name?.substring(0, 2).toUpperCase() || 'PX'}</span>
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <h3 className={`font-semibold ${member.organization_id === currentOrgId ? "text-indigo-900" : "text-gray-900"}`}>
                                            {member.organization?.name}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {member.organization?.slug}
                                        </p>
                                    </div>

                                    {member.organization_id === currentOrgId && (
                                        <div className="h-8 w-8 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-full">
                                            <Check className="h-5 w-5" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    <div className="absolute bottom-6 left-6 right-6">
                        <Button
                            className="w-full h-12 text-base shadow-lg shadow-indigo-500/20"
                            onClick={() => setIsCreateOpen(true)}
                        >
                            <Plus className="mr-2 h-5 w-5" />
                            Nueva Organización
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            <CreateOrganizationSheet
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSuccess={() => {
                    loadData()
                    // Optional: Switch to new org automatically or keep list open
                }}
            />
        </>
    )
}

"use client"

import { useState, useEffect } from "react"
import { ChevronsUpDown, Plus, Building2, Check, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CreateOrganizationSheet } from "./create-organization-sheet"
import { OrganizationMember } from "@/types/organization"
import { getUserOrganizations, getCurrentOrganizationId, switchOrganization } from "@/lib/actions/organizations"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function OrganizationSwitcher() {
    const router = useRouter()
    const [organizations, setOrganizations] = useState<OrganizationMember[]>([])
    const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
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
            // Soft reload to keep session intact but refresh server components
            router.refresh()
            // Avoid window.location.href as it causes session race conditions causing logout
        } catch (error) {
            toast.error("Error cambiando de organización")
        }
    }

    const currentOrg = organizations.find(o => o.organization_id === currentOrgId)?.organization

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 p-2 bg-gray-100/50 rounded-lg animate-pulse w-full h-12">
                <div className="h-8 w-8 bg-gray-200 rounded-md" />
                <div className="h-4 bg-gray-200 rounded w-24" />
            </div>
        )
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="w-full justify-between px-2 h-14 hover:bg-gray-100 group border-b border-gray-100 mb-2 rounded-none"
                    >
                        <div className="flex items-center gap-3 text-left">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold shadow-sm group-hover:bg-indigo-700 transition-colors">
                                {currentOrg?.logo_url ? (
                                    <img src={currentOrg.logo_url} alt="" className="h-full w-full object-cover rounded-lg" />
                                ) : (
                                    <span className="text-sm">{currentOrg?.name?.substring(0, 2).toUpperCase() || 'PX'}</span>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-semibold text-sm leading-none text-gray-900">
                                    {currentOrg?.name || "Sin Organización"}
                                </span>
                                <span className="text-xs text-gray-500 mt-1">
                                    {currentOrg?.slug || "Seleccionar..."}
                                </span>
                            </div>
                        </div>
                        <ChevronsUpDown className="h-4 w-4 text-gray-400 ml-2" />
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="start" className="w-[240px] p-2" side="right" sideOffset={10}>
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-2 py-1.5">
                        Mis Organizaciones
                    </DropdownMenuLabel>

                    {organizations.map((member) => (
                        <DropdownMenuItem
                            key={member.organization_id}
                            className="flex items-center gap-2 p-2 cursor-pointer rounded-md focus:bg-gray-100"
                            onClick={() => handleSwitch(member.organization_id)}
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="flex-1 truncate text-sm font-medium">
                                {member.organization?.name}
                            </span>
                            {member.organization_id === currentOrgId && (
                                <Check className="h-4 w-4 text-indigo-600" />
                            )}
                        </DropdownMenuItem>
                    ))}

                    <DropdownMenuSeparator className="my-2" />

                    <DropdownMenuItem
                        className="flex items-center gap-2 p-2 cursor-pointer text-indigo-600 focus:text-indigo-700 focus:bg-indigo-50"
                        onClick={() => setIsCreateOpen(true)}
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-indigo-200 bg-indigo-50">
                            <Plus className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">Nueva Organización</span>
                    </DropdownMenuItem>

                    {/* Super Admin Link (Optional) */}
                    {/* <DropdownMenuItem className="text-xs">
                        <LayoutGrid className="h-3 w-3 mr-2" />
                        Plataforma
                    </DropdownMenuItem> */}
                </DropdownMenuContent>
            </DropdownMenu>

            <CreateOrganizationSheet
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSuccess={loadData}
            />
        </>
    )
}

"use client"

import { useState, useEffect } from "react"
import { Building2, Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
// import { CreateOrganizationSheet } from "./create-organization-sheet" // Removed for public onboarding
import { OrganizationMember } from "@/types/organization"
import { getUserOrganizations, switchOrganization, getCurrentOrgName, getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface OrganizationSwitcherProps {
    trigger?: React.ReactNode
}

export function OrganizationSwitcher({ trigger }: OrganizationSwitcherProps) {
    const router = useRouter()
    const [organizations, setOrganizations] = useState<OrganizationMember[]>([])
    const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const [isOpen, setIsOpen] = useState(false)
    // const [isCreateOpen, setIsCreateOpen] = useState(false) // Deprecated for public onboarding

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
            // Show loading state
            toast.loading("Cambiando de organización...")

            // Switch organization (sets cookie)
            await switchOrganization(orgId)

            // Close modal immediately
            setIsOpen(false)

            // Small delay to ensure cookie propagation
            await new Promise(resolve => setTimeout(resolve, 100))

            // Navigate to root and force refresh
            // Using router instead of window.location to preserve session
            router.push('/')
            router.refresh()

            // Success toast after navigation
            setTimeout(() => {
                toast.dismiss()
                toast.success("Organización cambiada")
            }, 300)
        } catch (error) {
            toast.dismiss()
            toast.error("Error cambiando de organización")
            console.error(error)
        }
    }

    // Always show to allow creation of new organizations
    if (!isLoading && organizations.length === 0) {
        return null // Only hide if 0? Or maybe show empty state? usually > 0 if logged in.
    }

    if (isLoading) {
        return <div className="h-9 w-9 bg-gray-100 rounded-md animate-pulse" />
    }

    return (
        <>
            {trigger ? (
                <div onClick={() => setIsOpen(true)} className="cursor-pointer">
                    {trigger}
                </div>
            ) : (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(true)}
                    className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
                >
                    <Building2 className="h-5 w-5" />
                </Button>
            )}

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent
                    side="right"
                    className="
                        sm:max-w-[600px] w-full p-0 gap-0 border-none shadow-2xl
                        mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                        data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                        bg-transparent
                    "
                >
                    <SheetHeader className="hidden">
                        <SheetTitle>Mis Organizaciones</SheetTitle>
                        <SheetDescription>Cambiar organización</SheetDescription>
                    </SheetHeader>

                    <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">
                        {/* Header */}
                        <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 tracking-tight leading-none">
                                    Mis Organizaciones
                                </h2>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Cambia de espacio de trabajo o crea uno nuevo.
                                </p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200">
                            <div className="space-y-3">
                                {organizations.map((member) => (
                                    <div
                                        key={member.organization_id}
                                        onClick={() => handleSwitch(member.organization_id)}
                                        className={`
                                            flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border group relative overflow-hidden
                                            ${member.organization_id === currentOrgId
                                                ? "bg-indigo-50 border-indigo-200 shadow-sm"
                                                : "bg-white border-gray-100 hover:border-indigo-200 hover:shadow-md"
                                            }
                                        `}
                                    >
                                        {/* Status Line */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${member.organization?.organization_type === 'reseller' ? 'bg-blue-500' :
                                            member.organization?.organization_type === 'platform' ? 'bg-purple-500' :
                                                'bg-gray-200'
                                            }`} />

                                        <div className={`
                                            flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-bold text-sm shadow-sm transition-transform group-hover:scale-105 ml-2
                                            ${member.organization_id === currentOrgId
                                                ? "bg-indigo-600 text-white"
                                                : "bg-gray-50 border border-gray-100 text-gray-600 group-hover:bg-white"
                                            }
                                        `}>
                                            {member.organization?.logo_url ? (
                                                <img src={member.organization.logo_url} alt="" className="h-full w-full object-cover rounded-lg" />
                                            ) : (
                                                <span>{member.organization?.name?.substring(0, 2).toUpperCase() || 'PX'}</span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className={`font-semibold text-sm truncate ${member.organization_id === currentOrgId ? "text-indigo-900" : "text-gray-900"}`}>
                                                    {member.organization?.name}
                                                </h3>
                                                {member.organization?.organization_type === 'reseller' && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wider">
                                                        Reseller
                                                    </span>
                                                )}
                                                {member.organization?.organization_type === 'platform' && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 uppercase tracking-wider">
                                                        Platform
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                                                <span className="font-mono">{member.organization?.slug}</span>
                                                {member.organization?.parent_organization_id && ( // Note: We might need to join parent info in query if we want name, for now just showing visual clue
                                                    <span className="text-gray-400">• Sub-cuenta</span>
                                                )}
                                            </p>
                                        </div>

                                        {member.organization_id === currentOrgId && (
                                            <div className="h-6 w-6 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-full shrink-0">
                                                <Check className="h-3.5 w-3.5" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-white/80 backdrop-blur-md p-6 border-t border-gray-100 flex items-center justify-between z-20 gap-4">
                            <Button variant="ghost" onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-red-600 hover:bg-red-50">
                                Cerrar
                            </Button>

                            {/* Hide Create Button for Clients */}
                            {/* Logic: If user has organizations and NONE are reseller/platform, assume Client. */}
                            {(!organizations.length || organizations.some(m => ['reseller', 'platform'].includes(m.organization?.organization_type || ''))) && (
                                <Link href="/onboarding" onClick={() => setIsOpen(false)}>
                                    <Button
                                        className="shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 text-white"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Nueva Organización
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/*             <CreateOrganizationSheet
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSuccess={() => {
                    loadData()
                    // Optional: Switch to new org automatically or keep list open
                }}
            /> */}
        </>
    )
}

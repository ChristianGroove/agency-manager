"use client"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileForm } from "@/components/account/profile-form"
import { SecurityForm } from "@/components/account/security-form"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Fingerprint, Loader2, Plus, X } from "lucide-react"
import { usePasskeys } from "@/modules/auth/passkeys/use-passkeys"

import { OrganizationCard } from "@/components/organizations/organization-card"

interface ProfileSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: any // Auth user
    currentOrgId?: string | null
}

export function ProfileSheet({ open, onOpenChange, user, currentOrgId }: ProfileSheetProps) {
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("general")
    const { registerPasskey, loading: passkeyLoading } = usePasskeys()

    useEffect(() => {
        if (open && user?.id) {
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            )

            const fetchProfile = async () => {
                setLoading(true)
                const { data } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single()
                setProfile(data)
                setLoading(false)
            }

            fetchProfile()
        }
    }, [open, user?.id])

    const handleRegisterPasskey = async () => {
        await registerPasskey()
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
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
                    <SheetTitle>Mi Perfil</SheetTitle>
                    <SheetDescription>Gestiona tu cuenta</SheetDescription>
                </SheetHeader>

                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">
                    {/* Header - Compact & Horizontal */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-6 py-3 bg-white/80 backdrop-blur-md border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-gray-200 shadow-sm">
                                <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url} className="object-cover" />
                                <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 font-bold text-xs">
                                    {(profile?.full_name?.[0] || user?.email?.[0] || "U").toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <h2 className="text-sm font-bold text-gray-900 leading-tight">
                                    {profile?.full_name || user?.user_metadata?.full_name || "Mi Cuenta"}
                                </h2>
                                <p className="text-[10px] text-muted-foreground font-medium">
                                    {user?.email}
                                </p>
                            </div>
                        </div>
                        {/* No X button as requested, relied on Footer Close */}
                    </div>

                    {/* Content - Single Column */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200">

                        {/* Organization Context Section */}
                        {currentOrgId && (
                            <div className="mb-6 space-y-2">
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider px-1">
                                    Organización Actual
                                </span>
                                <div className="p-1 rounded-2xl bg-gray-50/80 border border-gray-200/50">
                                    <Link href="/platform/settings" onClick={() => onOpenChange(false)}>
                                        <OrganizationCard
                                            orgId={currentOrgId}
                                            collapsed={false}
                                            className="bg-white shadow-sm hover:shadow-md border border-gray-100"
                                        />
                                    </Link>
                                </div>
                            </div>
                        )}

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100/50 p-1 rounded-lg">
                                <TabsTrigger value="general" className="rounded-md text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">Información</TabsTrigger>
                                <TabsTrigger value="security" className="rounded-md text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">Seguridad</TabsTrigger>
                            </TabsList>

                            <TabsContent value="general" className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                                {loading ? (
                                    <div className="space-y-3">
                                        <div className="h-24 bg-gray-100 animate-pulse rounded-xl" />
                                        <div className="h-32 bg-gray-100 animate-pulse rounded-xl" />
                                    </div>
                                ) : (
                                    <ProfileForm user={user} profile={profile} />
                                )}

                                {/* Extra Info Block - Moved to Bottom */}
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div className="flex flex-col px-3 py-2 bg-gray-50/50 rounded-lg border border-gray-100 text-center">
                                        <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Rol</span>
                                        <span className="font-semibold text-gray-900 capitalize text-xs mt-0.5">{user?.app_metadata?.role || "Admin"}</span>
                                    </div>
                                    <div className="flex flex-col px-3 py-2 bg-gray-50/50 rounded-lg border border-gray-100 text-center">
                                        <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Miembro Desde</span>
                                        <span className="font-semibold text-gray-900 text-xs mt-0.5">
                                            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                                        </span>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="security" className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                                <div>
                                    <SecurityForm />
                                </div>

                                {/* Passkey Section */}
                                <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-5">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-semibold text-indigo-950 flex items-center gap-2">
                                                <Fingerprint className="h-4 w-4 text-indigo-500" />
                                                Acceso Biométrico
                                            </h3>
                                            <p className="text-xs text-indigo-900/60 leading-relaxed">
                                                Inicia sesión sin contraseña usando tu huella o rostro.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <Button
                                            onClick={handleRegisterPasskey}
                                            disabled={passkeyLoading}
                                            variant="outline"
                                            size="sm"
                                            className="w-full bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 shadow-sm text-xs h-9"
                                        >
                                            {passkeyLoading ? (
                                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Plus className="mr-2 h-3.5 w-3.5" />
                                            )}
                                            Registrar Dispositivo
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                        <div className="h-12"></div>
                    </div>

                    {/* Standard Footer */}
                    <div className="sticky bottom-0 bg-white/80 backdrop-blur-md p-6 border-t border-gray-100 flex items-center justify-between z-20">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-gray-500 hover:text-red-600 hover:bg-red-50">
                            Cerrar
                        </Button>
                        {/* Right side empty as forms have internal submit buttons, or we could move them here later if requested */}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

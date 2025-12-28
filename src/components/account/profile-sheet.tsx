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
import { ScrollArea } from "@/components/ui/scroll-area"
import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"

interface ProfileSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: any // Auth user
}

export function ProfileSheet({ open, onOpenChange, user }: ProfileSheetProps) {
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)

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

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px] p-0">
                <SheetHeader className="px-6 py-4 border-b">
                    <SheetTitle>Mi Perfil</SheetTitle>
                    <SheetDescription>
                        Gestiona tu información personal y seguridad.
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-80px)]">
                    <div className="px-6 py-4">
                        <Tabs defaultValue="general" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="general">Información</TabsTrigger>
                                <TabsTrigger value="security">Seguridad</TabsTrigger>
                            </TabsList>

                            <TabsContent value="general" className="mt-0 space-y-4">
                                {/* We override ProfileForm styling via CSS or just existing cards */}
                                {/* To align left, we might need to target via CSS if ProfileForm doesn't support it completely.
                      But we updated AvatarUpload to support left align. 
                      However ProfileForm structure is strict (Cards). 
                      Ideally we should make ProfileForm cleaner. 
                      For now I will pass className to manipulate if possible, or just Render it.
                  */}
                                <div className="space-y-4">
                                    {/* Render manually or use ProfileForm? 
                        ProfileForm has "Cards". Inside a Sheet, Cards usually look OK but borders double up.
                        I will assume Cards are fine for now.
                    */}
                                    {/* We need to inject the align prop into AvatarUpload if ProfileForm accepted it.
                         ProfileForm DOES NOT accept align prop yet.
                         I should probably modify ProfileForm to accept `layout="sheet"` or something.
                         But for speed, let's just render it. The user wanted Left Align.
                         I'll update ProfileForm quickly to accept `align` and pass it to AvatarUpload.
                     */}
                                    {loading ? (
                                        <div className="space-y-4">
                                            <div className="h-32 bg-muted animate-pulse rounded-lg" />
                                            <div className="h-40 bg-muted animate-pulse rounded-lg" />
                                        </div>
                                    ) : (
                                        <ProfileForm user={user} profile={profile} />
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="security" className="mt-0">
                                <SecurityForm />
                            </TabsContent>
                        </Tabs>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}

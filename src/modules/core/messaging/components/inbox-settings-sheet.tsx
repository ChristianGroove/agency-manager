"use client"

import { useState, useEffect, useMemo } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, User, Zap, Sparkles } from "lucide-react"
import { AgentWorkloadDashboard } from "./agent-workload-dashboard"
import { AssignmentRulesManager } from "./assignment-rules-manager"
import { Separator } from "@/components/ui/separator"
import { NotificationsCard } from "@/modules/core/preferences/components/notifications-card"
import { ProductivityCard } from "@/modules/core/preferences/components/productivity-card"
import { DisplayCard } from "@/modules/core/preferences/components/display-card"
import { useTranslation } from "@/lib/i18n/use-translation"
import { getCurrentUserPermissions } from "@/modules/core/settings/actions/team-actions"

interface InboxSettingsSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function InboxSettingsSheet({ open, onOpenChange }: InboxSettingsSheetProps) {
    const { t } = useTranslation()
    const [userPermissions, setUserPermissions] = useState<any>(null)
    const [loadingPermissions, setLoadingPermissions] = useState(true)

    // Fetch permissions when sheet opens
    useEffect(() => {
        if (!open) return

        const fetchPermissions = async () => {
            try {
                const perms = await getCurrentUserPermissions()
                setUserPermissions(perms)
            } catch (err) {
                console.warn('[InboxSettingsSheet] Failed to fetch permissions:', err)
            } finally {
                setLoadingPermissions(false)
            }
        }
        fetchPermissions()
    }, [open])

    const isAdmin = useMemo(() => {
        if (!userPermissions) return false
        const role = userPermissions.role?.toLowerCase()
        const isGlobalRole = role === 'owner' || role === 'dueño' || role === 'admin' || role === 'administrador'
        
        return isGlobalRole || userPermissions.permissions?.all === true
    }, [userPermissions])

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-[800px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/40 backdrop-blur-md border-b border-black/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-brand-pink/10 rounded-lg text-brand-pink">
                                <Settings className="h-5 w-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-gray-900 tracking-tight">{t('crm.inbox.settings.title')}</SheetTitle>
                                <p className="text-xs text-muted-foreground">{t('crm.inbox.settings.desc')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden">
                        <Tabs defaultValue="status" className="h-full flex flex-col">
                            <div className="px-8 pt-6">
                                <TabsList className="bg-gray-100/50 p-1 rounded-xl w-full justify-start max-w-sm">
                                    <TabsTrigger
                                        value="status"
                                        className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4"
                                    >
                                        <User className="h-4 w-4 mr-2" />
                                        {t('crm.inbox.settings.tabs.status')}
                                    </TabsTrigger>
                                    
                                    {isAdmin && (
                                        <TabsTrigger
                                            value="rules"
                                            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4"
                                        >
                                            <Zap className="h-4 w-4 mr-2" />
                                            {t('crm.inbox.settings.tabs.rules')}
                                        </TabsTrigger>
                                    )}

                                    <TabsTrigger
                                        value="preferences"
                                        className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4"
                                    >
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        {t('crm.inbox.settings.tabs.preferences')}
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <Separator className="mt-6 mb-0" />

                            <div className="flex-1 overflow-y-auto px-8 py-6 scrollbar-thin scrollbar-thumb-gray-200">
                                <TabsContent value="status" className="mt-0 space-y-6 max-w-3xl">
                                    <div className="space-y-1 mb-6">
                                        <h3 className="text-lg font-semibold">{t('crm.inbox.settings.sections.availability')}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {t('crm.inbox.settings.sections.availability_desc')}
                                        </p>
                                    </div>
                                    <AgentWorkloadDashboard isAdmin={isAdmin} />
                                </TabsContent>

                                {isAdmin && (
                                    <TabsContent value="rules" className="mt-0 space-y-6 max-w-3xl">
                                        <div className="space-y-1 mb-6">
                                            <h3 className="text-lg font-semibold">{t('crm.inbox.settings.sections.routing')}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {t('crm.inbox.settings.sections.routing_desc')}
                                            </p>
                                        </div>
                                        <AssignmentRulesManager />
                                    </TabsContent>
                                )}



                                <TabsContent value="preferences" className="mt-0 space-y-6 max-w-3xl">
                                    <div className="space-y-1 mb-6">
                                        <h3 className="text-lg font-semibold">{t('crm.inbox.settings.sections.personalization')}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {t('crm.inbox.settings.sections.personalization_desc')}
                                        </p>
                                    </div>
                                    <NotificationsCard />
                                    <ProductivityCard />
                                    <DisplayCard />
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

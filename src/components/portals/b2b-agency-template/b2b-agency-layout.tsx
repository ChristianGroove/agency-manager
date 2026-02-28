import { DashboardShell } from "@/components/layout/dashboard-shell"
import { SystemAlertBanner } from "@/components/layout/system-alert-banner"
import { Suspense } from "react"
import { GlobalLoader } from "@/components/ui/global-loader"
import { GlobalInboxProvider } from "@/modules/core/messaging/context/global-inbox-context"
import { InboxOverlay } from "@/modules/core/messaging/components/floating-inbox/inbox-overlay"
import { GlobalMessageListener } from "@/modules/core/messaging/components/floating-inbox/global-message-listener"
import { FabController } from "@/components/layout/fab-controller"
import { SidebarLoader } from "@/components/layout/sidebar-loader"
import { User } from "@supabase/supabase-js"

export interface PortalLayoutProps {
    children: React.ReactNode
    user: User | any
    currentOrgId: string | null
    isAdmin: boolean
    orgData?: any
}

export function B2BAgencyLayout({
    children,
    user,
    currentOrgId,
    isAdmin,
    orgData
}: PortalLayoutProps) {
    return (
        <DashboardShell
            user={user}
            currentOrgId={currentOrgId}
            isSuperAdmin={isAdmin}
            sidebarSlot={
                <Suspense fallback={<div className="w-64 h-full bg-white/50 dark:bg-black/20 animate-pulse border-r" />}>
                    <SidebarLoader />
                </Suspense>
            }
        >
            <GlobalInboxProvider>
                <GlobalMessageListener />
                <InboxOverlay />
                <FabController orgSlug={orgData?.slug} />
                <SystemAlertBanner />
                <Suspense fallback={<GlobalLoader />}>
                    {children}
                </Suspense>
            </GlobalInboxProvider>
        </DashboardShell>
    )
}

"use client"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { SystemAlertBanner } from "@/components/layout/system-alert-banner"
import { Suspense, useMemo } from "react"
import { GlobalLoader } from "@/components/ui/global-loader"
import { GlobalInboxProvider } from "@/modules/features/messaging/context/global-inbox-context"
import dynamic from "next/dynamic"
import { FabController } from "@/components/layout/fab-controller"
import { User } from "@supabase/supabase-js"

// Lazy load heavy messaging components to reduce initial bundle
const GlobalMessageListener = dynamic(
    () => import("@/modules/features/messaging/components/floating-inbox/global-message-listener").then(mod => mod.GlobalMessageListener),
    { ssr: false }
)
const InboxOverlay = dynamic(
    () => import("@/modules/features/messaging/components/floating-inbox/inbox-overlay").then(mod => mod.InboxOverlay),
    { ssr: false }
)

export interface PortalLayoutProps {
    children: React.ReactNode
    user: User | any
    currentOrgId: string | null
    isAdmin: boolean
    orgData?: any
    activeModules?: string[]
    sidebarSlot?: React.ReactNode
}

export function B2BAgencyLayout({
    children,
    user,
    currentOrgId,
    isAdmin,
    orgData,
    activeModules = [],
    sidebarSlot
}: PortalLayoutProps) {
    // Determine if messaging module is active
    const isMessagingActive = useMemo(() => {
        return activeModules.includes('module_messaging') || 
               activeModules.includes('module_communications') ||
               isAdmin; // SuperAdmin usually has access to everything
    }, [activeModules, isAdmin]);

    const content = (
        <Suspense fallback={<GlobalLoader />}>
            {children}
        </Suspense>
    );

    return (
        <DashboardShell
            user={user}
            currentOrgId={currentOrgId}
            isSuperAdmin={isAdmin}
            orgName={orgData?.name}
            sidebarSlot={sidebarSlot}
        >
            {isMessagingActive ? (
                <GlobalInboxProvider>
                    <GlobalMessageListener />
                    <InboxOverlay />
                    <FabController orgSlug={orgData?.slug} />
                    <SystemAlertBanner />
                    {content}
                </GlobalInboxProvider>
            ) : (
                <>
                    <FabController orgSlug={orgData?.slug} />
                    <SystemAlertBanner />
                    {content}
                </>
            )}
        </DashboardShell>
    )
}


import { PropsWithChildren } from "react"
import { GrowthEcosystemNav } from "./growth-ecosystem-nav"
import { LeadInspectorProvider } from "@/modules/core/crm/components/lead-inspector-context"
import { LeadInspectorPanel } from "@/modules/core/crm/components/lead-inspector-panel"

interface GrowthEcosystemShellProps extends PropsWithChildren {
    title?: string;
    description?: string;
    fullHeight?: boolean;
    noPadding?: boolean;
}

export function GrowthEcosystemShell({
    children,
    title,
    description,
    fullHeight = false,
    noPadding = false
}: GrowthEcosystemShellProps) {
    return (
        <LeadInspectorProvider>
            <div className="flex flex-col w-full h-full min-h-[calc(100vh-4rem)]">
                {/* CRM Navigation Removed - Now in Sidebar */}
                {/* <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-background to-background/80 backdrop-blur-sm border-b border-border/30">
                    <GrowthEcosystemNav />
                </div> */}

                {/* Main Workspace */}
                <main className={`${fullHeight ? 'flex-1 overflow-hidden' : ''} ${noPadding ? 'p-6' : 'p-0'}`}>
                    {children}
                </main>
            </div>

            {/* Global Lead Inspector Panel */}
            <LeadInspectorPanel />
        </LeadInspectorProvider>
    )
}

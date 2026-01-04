import { GrowthEcosystemShell } from "@/modules/core/layout/growth-ecosystem-shell"

export default function CRMLayout({ children }: { children: React.ReactNode }) {
    return (
        <GrowthEcosystemShell>
            {children}
        </GrowthEcosystemShell>
    )
}

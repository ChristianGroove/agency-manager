import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Activity, Box, Sparkles, ShieldCheck } from "lucide-react"
import { AdminOrgHeader } from "./_components/org-header"
import { AdminOrgUsers } from "./_components/org-users"
import { OrgModulesManager } from "./_components/org-modules-manager"
// import { FeatureFlagsManager } from "./_components/feature-flags-manager"
import { OrgSecurityManager } from "./_components/org-security-manager"
// import { RateLimitConfigCard } from "./_components/rate-limit-config-card"
import { getOrganizationDetails, getOrganizationUsers, getAllSystemModules, getBrandingTiers } from '@/modules/core/admin/actions'
import { OrgTierManager } from "./_components/org-tier-manager"

export default async function AdminOrgDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    const { id } = params

    // Parallel Fetching
    const [details, users, allModules, tiers] = await Promise.all([
        getOrganizationDetails(id).catch(() => null),
        getOrganizationUsers(id).catch(() => []),
        getAllSystemModules().catch(() => []),
        getBrandingTiers().catch(() => [])
    ])

    if (!details || !details.organization) {
        notFound()
    }

    const { organization, stats } = details

    return (
        <div className="space-y-6">
            {/* Header with Actions (Suspend, Invite) */}
            <AdminOrgHeader organization={organization} />

            <Tabs defaultValue="overview" className="space-y-4">
                {/* ... existing tabs list ... */}
                <TabsList>
                    <TabsTrigger value="overview">
                        <Activity className="h-4 w-4 mr-2" />
                        Visión General
                    </TabsTrigger>
                    <TabsTrigger value="features">
                        <Box className="h-4 w-4 mr-2" />
                        Módulos
                    </TabsTrigger>
                    <TabsTrigger value="flags">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Feature Flags
                    </TabsTrigger>
                    <TabsTrigger value="security">
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Seguridad
                    </TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Stats Cards */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.users}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Clientes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.clients}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Estado</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Badge variant={organization.status === 'active' ? 'default' : 'destructive'}>
                                    {organization.status}
                                </Badge>
                            </CardContent>
                        </Card>
                    </div>

                    <Separator />

                    {/* Tier Manager */}
                    <div className="space-y-4">
                        <OrgTierManager organization={organization} tiers={tiers as any[]} />
                    </div>

                    <Separator />

                    {/* Users & Invitation Section */}
                    <div className="space-y-4">
                        <AdminOrgUsers
                            organizationId={organization.id}
                            users={users}
                            ownerId={organization.owner_id}
                        />
                    </div>
                </TabsContent>

                {/* ... other tabs ... */}
                {/* FEATURES TAB */}
                <TabsContent value="features">
                    <OrgModulesManager
                        orgId={organization.id}
                        allModules={allModules}
                        manualOverrides={(organization as any).manual_module_overrides}
                    />
                </TabsContent>

                {/* FEATURE FLAGS TAB */}
                <TabsContent value="flags">
                    {/* <FeatureFlagsManager
                        organizationId={organization.id}
                        organizationName={organization.name}
                    /> */}
                    <div className="p-4 text-muted-foreground text-sm">Feature Flags Manager coming soon.</div>
                </TabsContent>

                {/* SECURITY TAB */}
                <TabsContent value="security" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div>
                            <OrgSecurityManager users={users} />
                        </div>
                        <div>
                            {/* <RateLimitConfigCard
                                organizationId={organization.id}
                                organizationName={organization.name}
                                initialConfig={(organization as any).rate_limit_config}
                            /> */}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Activity, Box, Sparkles, ShieldCheck } from "lucide-react"
import { AdminOrgHeader } from "./_components/org-header"
import { AdminOrgUsers } from "./_components/org-users"
import { OrgSecurityManager } from "./_components/org-security-manager"
import { getOrganizationDetails, getOrganizationUsers, getBrandingTiers } from '@/modules/core/admin/actions'
import { OrgTierManager } from "./_components/org-tier-manager"
import { ExternalLink, Database, Blocks } from "lucide-react"
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function AdminOrgDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    const { id } = params

    // Parallel Fetching
    const [details, users, tiers] = await Promise.all([
        getOrganizationDetails(id).catch(() => null),
        getOrganizationUsers(id).catch(() => []),
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
                    <TabsTrigger value="modules">
                        <Blocks className="h-4 w-4 mr-2" />
                        Accesos y Módulos
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

                {/* MODULES TAB - REDIRECT TO FULL MANAGER */}
                <TabsContent value="modules">
                    <Card className="border-dashed">
                        <CardHeader className="text-center py-8">
                            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                                <Database className="h-8 w-8 text-primary" />
                            </div>
                            <CardTitle className="text-2xl">Gestor de Espacio / Módulos</CardTitle>
                            <p className="text-muted-foreground max-w-lg mx-auto mt-2">
                                Para garantizar la integridad de las dependencias, la configuración de módulos y características de este tenant ha sido trasladada al Gestor Principal de Espacios.
                            </p>
                            <div className="mt-8">
                                <Link href={`/platform/admin/organizations/${organization.id}/modules`}>
                                    <Button size="lg" className="w-full md:w-auto">
                                        <Blocks className="mr-2 h-5 w-5" />
                                        Abrir Gestor de Accesos
                                        <ExternalLink className="ml-2 h-4 w-4 opacity-50" />
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                    </Card>
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

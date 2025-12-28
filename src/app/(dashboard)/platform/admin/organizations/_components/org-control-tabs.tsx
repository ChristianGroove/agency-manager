"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, ShieldCheck, Box, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AdminOrgHeader } from "../../organizations/[id]/_components/org-header"
import { AdminOrgUsers } from "../../organizations/[id]/_components/org-users"
import { OrgModulesManager } from "../../organizations/[id]/_components/org-modules-manager"
import { OrgSecurityManager } from "../../organizations/[id]/_components/org-security-manager"

interface OrgControlTabsProps {
    data: {
        organization: any
        users: any[]
        stats: {
            users: number
            clients: number
        }
    }
    allModules: any[]
}

export function OrgControlTabs({ data, allModules }: OrgControlTabsProps) {
    const { organization, users, stats } = data

    return (
        <div className="space-y-6 pt-4">
            <AdminOrgHeader organization={organization} />

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">
                        <Activity className="h-4 w-4 mr-2" />
                        Visión
                    </TabsTrigger>
                    <TabsTrigger value="features">
                        <Box className="h-4 w-4 mr-2" />
                        Módulos
                    </TabsTrigger>
                    <TabsTrigger value="security">
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Seguridad
                    </TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.users}</div>
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

                    <div className="space-y-4">
                        <AdminOrgUsers
                            organizationId={organization.id}
                            users={users}
                            ownerId={organization.owner_id}
                        />
                    </div>
                </TabsContent>

                {/* FEATURES TAB */}
                <TabsContent value="features">
                    <OrgModulesManager
                        orgId={organization.id}
                        allModules={allModules}
                        manualOverrides={organization.manual_module_overrides}
                    />
                </TabsContent>

                {/* SECURITY TAB */}
                <TabsContent value="security">
                    <OrgSecurityManager users={users} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

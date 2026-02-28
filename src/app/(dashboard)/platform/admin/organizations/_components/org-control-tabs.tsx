import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Box, Users } from "lucide-react"
import { OrgDashboardView } from "./org-dashboard-view"
import { OrgTeamView } from "./org-team-view"
import { Database, ExternalLink } from "lucide-react"
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface OrgControlTabsProps {
    data: {
        organization: any
        users: any[]
        stats: {
            users: number
            clients: number
            activeModules: number
        }
    }
    allModules: any[]
}

export function OrgControlTabs({ data, allModules }: OrgControlTabsProps) {
    const { organization, users, stats } = data

    return (
        <div className="space-y-6">
            {/* Redundant header removed - provided by Sheet now */}

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 p-1 bg-gray-100/50">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
                        <Activity className="h-4 w-4 mr-2" />
                        Visión General
                    </TabsTrigger>
                    <TabsTrigger value="modules" className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm">
                        <Database className="h-4 w-4 mr-2" />
                        Accesos y Módulos
                    </TabsTrigger>
                    <TabsTrigger value="team" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                        <Users className="h-4 w-4 mr-2" />
                        Equipo y Accesos
                    </TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="m-0 focus-visible:ring-0 focus-visible:outline-none">
                    <OrgDashboardView organization={organization} stats={stats} />
                </TabsContent>

                {/* MODULES TAB */}
                <TabsContent value="modules" className="m-0 focus-visible:ring-0 focus-visible:outline-none">
                    <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm text-center">
                        <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                            <Database className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold">Gestor de Espacio / Módulos</h3>
                        <p className="text-muted-foreground mt-2 max-w-sm mx-auto mb-6">
                            Para garantizar la integridad y dependencias, la configuración de espacios ha sido trasladada al Gestor Principal.
                        </p>
                        <Link href={`/platform/admin/organizations/${organization.id}/modules`}>
                            <Button>
                                Abrir Gestor de Accesos
                                <ExternalLink className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                        </Link>
                    </div>
                </TabsContent>

                {/* TEAM TAB */}
                <TabsContent value="team" className="m-0 focus-visible:ring-0 focus-visible:outline-none">
                    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                        <OrgTeamView
                            organizationId={organization.id}
                            ownerId={organization.owner_id}
                            users={users}
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

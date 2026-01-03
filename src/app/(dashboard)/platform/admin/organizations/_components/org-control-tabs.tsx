import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Box, Users } from "lucide-react"
import { OrgSmartModulesView } from "./org-smart-modules-view"
import { OrgDashboardView } from "./org-dashboard-view"
import { OrgTeamView } from "./org-team-view"

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
                    <TabsTrigger value="features" className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm">
                        <Box className="h-4 w-4 mr-2" />
                        Módulos Inteligentes
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

                {/* FEATURES TAB */}
                <TabsContent value="features" className="m-0 focus-visible:ring-0 focus-visible:outline-none">
                    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                        <OrgSmartModulesView
                            orgId={organization.id}
                            allModules={allModules}
                        />
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

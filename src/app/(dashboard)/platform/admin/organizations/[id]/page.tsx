import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getOrganizationDetails, getOrganizationUsers } from "@/app/actions/admin-actions"
import { AdminOrgHeader } from "./_components/org-header"
import { AdminOrgUsers } from "./_components/org-users"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface PageProps {
    params: {
        id: string
    }
}

export default async function AdminOrgDetailsPage({ params }: PageProps) {
    const { id } = await params

    // Paralell Fetching
    const [details, users] = await Promise.all([
        getOrganizationDetails(id).catch(() => null),
        getOrganizationUsers(id).catch(() => [])
    ])

    if (!details || !details.organization) {
        notFound()
    }

    const { organization, stats } = details

    return (
        <div className="space-y-6">
            {/* Header with Actions (Suspend, Invite) */}
            <AdminOrgHeader organization={organization} />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Stats Cards */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.users}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Clients</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.clients}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant={organization.status === 'active' ? 'default' : 'destructive'}>
                            {organization.status}
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            <Separator />

            {/* Users & Invitation Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Access Management</h2>
                <AdminOrgUsers
                    organizationId={organization.id}
                    users={users}
                    ownerId={organization.owner_id}
                />
            </div>
        </div>
    )
}

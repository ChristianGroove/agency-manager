import { getAdminOrganizations } from '@/app/actions/admin-actions'
import { OrganizationsTable } from '@/components/admin/organizations-table'
import { requireSuperAdmin } from '@/lib/auth/platform-roles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, Shield } from 'lucide-react'

export default async function AdminOrganizationsPage() {
    await requireSuperAdmin()
    const organizations = await getAdminOrganizations()

    const stats = {
        total: organizations.length,
        active: organizations.filter(o => o.status === 'active').length,
        suspended: organizations.filter(o => o.status === 'suspended').length,
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Organizations
                        </CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">
                            Registered tenants
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active
                        </CardTitle>
                        <Users className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                        <p className="text-xs text-muted-foreground">
                            Organizations online
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Suspended
                        </CardTitle>
                        <Shield className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.suspended}</div>
                        <p className="text-xs text-muted-foreground">
                            Blocked tenants
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Organizations Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Organizations</CardTitle>
                    <CardDescription>
                        Manage tenant lifecycle, subscriptions, and access control
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <OrganizationsTable organizations={organizations} />
                </CardContent>
            </Card>
        </div>
    )
}

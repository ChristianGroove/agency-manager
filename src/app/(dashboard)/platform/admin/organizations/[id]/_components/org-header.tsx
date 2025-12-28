"use client"

import { Badge } from "@/components/ui/badge"
import { AdminOrganization } from "@/app/actions/admin-actions"
import { Building2, Calendar, Globe } from "lucide-react"

interface HeaderProps {
    organization: AdminOrganization
}

export function AdminOrgHeader({ organization }: HeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-muted/30 border border-muted/40">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <Building2 className="h-6 w-6 text-primary" />
                </div>

                <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl font-bold tracking-tight">{organization.name}</h1>
                        <Badge variant="secondary" className="font-mono text-xs">
                            {organization.slug}
                        </Badge>
                        <Badge variant={organization.status === 'active' ? 'default' : 'destructive'} className="capitalize">
                            {organization.status}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1 bg-background px-2 py-0.5 rounded border">
                            <span className="font-semibold">ID:</span>
                            <span className="font-mono">{organization.id.split('-')[0]}...</span>
                        </div>
                        {organization.created_at && (
                            <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(organization.created_at).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {organization.base_app_slug && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background px-3 py-1.5 rounded-md border">
                    <Globe className="h-4 w-4" />
                    <span>App: <span className="font-medium text-foreground">{organization.base_app_slug}</span></span>
                </div>
            )}
        </div>
    )
}

"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { AdminOrganization } from "@/app/actions/admin-actions"

interface HeaderProps {
    organization: AdminOrganization
}

export function AdminOrgHeader({ organization }: HeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <Link href="/platform/admin/organizations">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight">{organization.name}</h1>
                    <Badge variant="outline" className="font-mono text-xs">
                        {organization.slug}
                    </Badge>
                </div>
                <p className="text-muted-foreground pl-10">
                    ID: <span className="font-mono text-xs">{organization.id}</span>
                </p>
            </div>

            <div className="flex items-center gap-2">
                {/* Future actions like Edit Settings could go here */}
            </div>
        </div>
    )
}

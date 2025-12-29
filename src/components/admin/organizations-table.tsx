"use client"

import { type AdminOrganization, updateOrganizationStatus, deleteOrganization } from '@/modules/core/admin/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { EditOrganizationDialog } from './edit-organization-dialog'
import { useState } from 'react'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Ban, CheckCircle, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

const PROTECTED_ORG_SLUGS = ['pixy', 'pixy-agency', 'pixy-pds']

interface OrganizationsTableProps {
    organizations: AdminOrganization[]
    onSelect?: (orgId: string) => void
}

export function OrganizationsTable({ organizations, onSelect }: OrganizationsTableProps) {
    const [editOrg, setEditOrg] = useState<AdminOrganization | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)

    const handleDelete = async (orgId: string) => {
        if (!confirm("CRITICAL WARNING: This will permanently DELETE the organization and ALL its data (clients, invoices, etc).\n\nAre you absolutely sure?")) return;

        try {
            await deleteOrganization(orgId)
            toast.success("Organization deleted permanently")
        } catch (error: any) {
            toast.error(error.message || "Failed to delete")
        }
    }

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-green-500">Active</Badge>
            case 'suspended':
                return <Badge variant="destructive">Suspended</Badge>
            case 'past_due':
                return <Badge variant="secondary">Past Due</Badge>
            case 'archived':
                return <Badge variant="outline">Archived</Badge>
            default:
                return <Badge variant="outline">{status || 'Unknown'}</Badge>
        }
    }

    return (
        <div className="rounded-md border">
            <EditOrganizationDialog
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                organization={editOrg}
                onSuccess={() => { }}
            />
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Base App</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {organizations.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                No organizations found
                            </TableCell>
                        </TableRow>
                    ) : (
                        organizations.map((org) => (
                            <TableRow key={org.id}>
                                <TableCell className="font-medium">
                                    {org.name}
                                    {PROTECTED_ORG_SLUGS.includes(org.slug) && (
                                        <Badge variant="secondary" className="ml-2 text-[10px] h-5">Protected</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="font-mono text-sm">{org.slug}</TableCell>
                                <TableCell>{getStatusBadge(org.status)}</TableCell>
                                <TableCell>
                                    {org.base_app_slug ? (
                                        <Badge variant="outline">{org.base_app_slug}</Badge>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {format(new Date(org.created_at), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem
                                                onClick={() => onSelect ? onSelect(org.id) : null}
                                                asChild={!onSelect}
                                                className="cursor-pointer"
                                            >
                                                {onSelect ? (
                                                    <span className="flex items-center w-full">
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View Details
                                                    </span>
                                                ) : (
                                                    <Link href={`/platform/admin/organizations/${org.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View Details
                                                    </Link>
                                                )}
                                            </DropdownMenuItem>

                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setEditOrg(org)
                                                    setIsEditOpen(true)
                                                }}
                                                className="cursor-pointer"
                                            >
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Edit Details
                                            </DropdownMenuItem>

                                            {!PROTECTED_ORG_SLUGS.includes(org.slug) && (
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(org.id)}
                                                    className="cursor-pointer text-red-600 focus:text-red-600"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete Org
                                                </DropdownMenuItem>
                                            )}

                                            <DropdownMenuSeparator />

                                            {/* Status Actions - Only for non-protected orgs */}
                                            {PROTECTED_ORG_SLUGS.includes(org.slug) ? null : (
                                                <>
                                                    {org.status === 'active' ? (
                                                        <DropdownMenuItem
                                                            className="text-destructive cursor-pointer"
                                                            onClick={async () => {
                                                                const result = confirm('Are you sure you want to suspend this organization? users will be blocked immediately.')
                                                                if (!result) return

                                                                try {
                                                                    await updateOrganizationStatus(org.id, 'suspended', 'Admin Action')
                                                                    toast.success('Organization suspended')
                                                                } catch (error: any) {
                                                                    toast.error(error.message || 'Failed to suspend organization')
                                                                }
                                                            }}
                                                        >
                                                            <Ban className="mr-2 h-4 w-4" />
                                                            Suspend Service
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            className="text-green-600 cursor-pointer"
                                                            onClick={async () => {
                                                                try {
                                                                    await updateOrganizationStatus(org.id, 'active')
                                                                    toast.success('Organization reactivated')
                                                                } catch (error: any) {
                                                                    toast.error(error.message || 'Failed to reactivate organization')
                                                                }
                                                            }}
                                                        >
                                                            <CheckCircle className="mr-2 h-4 w-4" />
                                                            Reactivate
                                                        </DropdownMenuItem>
                                                    )}
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div >
    )
}

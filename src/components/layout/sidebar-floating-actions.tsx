"use client"

import React, { useState } from 'react'
import { LayoutDashboard, Shield, Package, Building2, Bell, User as UserIcon, Trash2 } from 'lucide-react'
import { ActionButton } from './action-button'
import { OrganizationSwitcher } from "@/modules/core/organizations/components/organization-switcher"
import { CreateOrganizationSheet } from "@/modules/core/organizations/components/create-organization-sheet"
import { NotificationBell } from './notification-bell'
import { ProfileSheet } from '@/modules/core/iam/components/account/profile-sheet'

interface SidebarFloatingActionsProps {
    isSuperAdmin?: boolean
    user?: any
    currentOrgId: string | null
    organizationType?: 'platform' | 'reseller' | 'client'
    initialOrgDetails?: any
    orgCount?: number
}

export function SidebarFloatingActions({ isSuperAdmin, user, currentOrgId, organizationType, initialOrgDetails, orgCount }: SidebarFloatingActionsProps) {
    const [isProfileOpen, setIsProfileOpen] = useState(false)

    // Visibility Logic:
    // 1. Super Admins -> Always Show
    // 2. Platform/Reseller Context -> Always Show (they manage others)
    // 3. Client Context -> Only show if they have multiple orgs (context switching)
    // 4. Fallback -> Use orgCount > 1 if available

    // Explicitly define visibility
    const isPrivilegedContext = organizationType === 'platform' || organizationType === 'reseller';
    const hasMultipleOrgs = orgCount && orgCount > 1;

    const showOrgSwitcher = isSuperAdmin || isPrivilegedContext || hasMultipleOrgs;

    return (
        <div className="flex flex-col gap-3 items-end">
            {/* --- General Actions --- */}

            {/* Organization Switcher - Only show if Reseller/Admin or if multiple orgs exist (context switching) */}
            {/* Ideally we hide the 'Manage' intent but keep 'Switch'. But user asked to hide it if client can't do anything. */}
            {showOrgSwitcher && (
                <div className="relative">
                    <OrganizationSwitcher
                        initialOrgDetails={initialOrgDetails}
                        trigger={
                            <ActionButton
                                icon={Building2}
                                text="Organizaciones"
                                color="var(--primary)" // Brand Color
                            />
                        }
                    />
                </div>
            )}

            {/* Notifications */}
            <div className="relative">
                <NotificationBell
                    trigger={
                        <ActionButton
                            icon={Bell}
                            text="Notificaciones"
                            color="var(--primary)" // Brand Color
                        />
                    }
                />
            </div>

            {/* Profile */}
            <div className="relative">
                <ActionButton
                    icon={UserIcon}
                    text="Perfil"
                    color="var(--primary)" // Brand Color
                    onClick={() => setIsProfileOpen(true)}
                />
                <ProfileSheet open={isProfileOpen} onOpenChange={setIsProfileOpen} user={user} currentOrgId={currentOrgId} />
            </div>

            {/* Trash Bin (Quick Access) */}
            <div className="relative">
                <ActionButton
                    icon={Trash2}
                    text="Papelera"
                    color="var(--primary)"
                    onClick={() => window.dispatchEvent(new Event('pixy:open-trash'))}
                />
            </div>

            {/* --- Super Admin Actions --- */}
            {isSuperAdmin && (
                <>
                    <div className="w-4 h-[1px] bg-gray-300 dark:bg-white/10 my-1 mr-2" /> {/* Separator */}

                    <ActionButton
                        href="/platform/admin"
                        icon={LayoutDashboard}
                        text="Admin"
                        color="var(--primary)"
                    />
                </>
            )}
        </div>
    )
}

"use client"

import React, { useState } from 'react'
import { LayoutDashboard, Shield, Package, Building2, Bell, User as UserIcon } from 'lucide-react'
import { ActionButton } from './action-button'
import { OrganizationSwitcher } from '@/components/organizations/organization-switcher'
import { NotificationBell } from './notification-bell'
import { ProfileSheet } from '@/components/account/profile-sheet'

interface SidebarFloatingActionsProps {
    isSuperAdmin?: boolean
    user?: any
    currentOrgId: string | null
}

export function SidebarFloatingActions({ isSuperAdmin, user, currentOrgId }: SidebarFloatingActionsProps) {
    const [isProfileOpen, setIsProfileOpen] = useState(false)

    return (
        <div className="flex flex-col gap-3 items-end">
            {/* --- General Actions --- */}

            {/* Organization Switcher - Only show if Reseller/Admin or if multiple orgs exist (context switching) */}
            {/* Ideally we hide the 'Manage' intent but keep 'Switch'. But user asked to hide it if client can't do anything. */}
            <div className="relative">
                <OrganizationSwitcher
                    trigger={
                        <ActionButton
                            icon={Building2}
                            text="Organizaciones"
                            color="#64748b" // Neutral Slate
                        />
                    }
                />
            </div>

            {/* Notifications */}
            <div className="relative">
                <NotificationBell
                    trigger={
                        <ActionButton
                            icon={Bell}
                            text="Notificaciones"
                            color="#64748b" // Neutral Slate
                        />
                    }
                />
            </div>

            {/* Profile */}
            <div className="relative">
                <ActionButton
                    icon={UserIcon}
                    text="Perfil"
                    color="#64748b" // Neutral Slate
                    onClick={() => setIsProfileOpen(true)}
                />
                <ProfileSheet open={isProfileOpen} onOpenChange={setIsProfileOpen} user={user} currentOrgId={currentOrgId} />
            </div>

            {/* --- Super Admin Actions --- */}
            {isSuperAdmin && (
                <>
                    <div className="w-4 h-[1px] bg-gray-300 dark:bg-white/10 my-1 mr-2" /> {/* Separator */}

                    <ActionButton
                        href="/platform/admin"
                        icon={LayoutDashboard}
                        text="Admin"
                        color="#64748b"
                    />
                </>
            )}
        </div>
    )
}

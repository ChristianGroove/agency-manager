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

            {/* Organization Switcher */}
            <div className="relative">
                <OrganizationSwitcher
                    trigger={
                        <ActionButton
                            icon={Building2}
                            text="Organizaciones"
                            color="#6366f1" // Indigo
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
                            color="#f59e0b" // Amber
                        />
                    }
                />
            </div>

            {/* Profile */}
            <div className="relative">
                <ActionButton
                    icon={UserIcon}
                    text="Perfil"
                    color="#10b981" // Emerald
                    onClick={() => setIsProfileOpen(true)}
                />
                <ProfileSheet open={isProfileOpen} onOpenChange={setIsProfileOpen} user={user} />
            </div>

            {/* --- Super Admin Actions --- */}
            {isSuperAdmin && (
                <>
                    <div className="w-4 h-[1px] bg-white/10 my-1 mr-2" /> {/* Separator */}

                    <ActionButton
                        href="/platform/admin"
                        icon={LayoutDashboard}
                        text="Admin"
                        color="#4f46e5"
                    />

                    <ActionButton
                        href="/platform/admin/modules"
                        icon={Package}
                        text="Módulos"
                        color="#a855f7"
                    />

                    <ActionButton
                        href="/platform/admin/branding"
                        icon={Shield}
                        text="Branding"
                        color="#ec4899"
                    />
                </>
            )}
        </div>
    )
}

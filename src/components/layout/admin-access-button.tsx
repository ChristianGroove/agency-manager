"use client"

import React from 'react'
import Link from 'next/link'
import { LayoutDashboard, Shield, Package } from 'lucide-react'
import styles from './admin-access-button.module.css'
import { cn } from '@/lib/utils'

interface AdminButtonProps {
    href: string
    icon: React.ElementType
    text: string
    color: string
}

function AdminButton({ href, icon: Icon, text, color }: AdminButtonProps) {
    return (
        <Link
            href={href}
            className={styles.button}
            data-text={text}
            style={{ '--hover-color': color } as React.CSSProperties}
        >
            <Icon className={styles.svgIcon} />
        </Link>
    )
}

export function AdminAccessButton() {
    return (
        <div className="flex flex-col gap-3 items-end">
            {/* Dashboard - Indigo */}
            <AdminButton
                href="/platform/admin"
                icon={LayoutDashboard}
                text="Admin"
                color="#4f46e5"
            />

            {/* Modules - Purple */}
            <AdminButton
                href="/platform/admin/modules"
                icon={Package}
                text="Módulos"
                color="#a855f7"
            />

            {/* Branding - Pink */}
            <AdminButton
                href="/platform/admin/branding"
                icon={Shield}
                text="Branding"
                color="#ec4899"
            />
        </div>
    )
}

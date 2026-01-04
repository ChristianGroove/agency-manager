"use client"

import React, { ReactNode } from 'react'
import Link from 'next/link'
import styles from './admin-access-button.module.css'
import { cn } from '@/lib/utils'

interface ActionButtonProps {
    href?: string
    icon: React.ElementType
    text: string
    color: string
    onClick?: () => void
    children?: ReactNode // For wrapping things if needed (though usually we wrap the button)
}

export function ActionButton({ href, icon: Icon, text, color, onClick, children }: ActionButtonProps) {
    const content = (
        <>
            <Icon className={styles.svgIcon} />
            {children}
        </>
    )

    if (href) {
        return (
            <Link
                href={href}
                className={styles.button}
                data-text={text}
                style={{ '--hover-color': color } as React.CSSProperties}
            >
                {content}
            </Link>
        )
    }

    return (
        <button
            onClick={onClick}
            className={styles.button}
            data-text={text}
            style={{ '--hover-color': color } as React.CSSProperties}
        >
            {content}
        </button>
    )
}

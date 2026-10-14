"use client"

import React, { ReactNode } from 'react'
import Link from 'next/link'
import styles from './admin-access-button.module.css'
import { cn } from '@/modules/infrastructure/utils/utils'

interface ActionButtonProps {
    href?: string
    icon: React.ElementType
    text: string
    color: string
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
    children?: ReactNode // For wrapping things if needed (though usually we wrap the button)
    className?: string
}

export function ActionButton({ href, icon: Icon, text, color, onClick, children, className }: ActionButtonProps) {
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
                className={cn(styles.button, className)}
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
            className={cn(styles.button, className)}
            data-text={text}
            style={{ '--hover-color': color } as React.CSSProperties}
        >
            {content}
        </button>
    )
}

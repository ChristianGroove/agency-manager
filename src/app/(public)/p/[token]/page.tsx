"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

/**
 * Portal Shortlink Route
 * 
 * Redirects /p/{token} to /portal/{token}
 * 
 * Provides a shorter URL for sharing:
 * - mi.pixy.com.co/p/Abc123 → mi.pixy.com.co/portal/Abc123
 * - portal.acme.com/p/Abc123 → portal.acme.com/portal/Abc123
 */
export default function PortalShortlinkPage() {
    const params = useParams()
    const router = useRouter()

    useEffect(() => {
        const token = params.token as string
        if (token) {
            // Redirect to full portal URL (maintains domain for white-label)
            router.replace(`/portal/${token}`)
        }
    }, [params.token, router])

    // Show nothing while redirecting (instant)
    return null
}

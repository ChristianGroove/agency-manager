"use client"

import { useEffect } from "react"

/**
 * ClientInit - CAA "Lightweight" Mode
 * 
 * We have removed the global registration of help articles to reduce bundle size 
 * and memory consumption. Help is now "AI-First" and on-demand.
 */
export function ClientInit() {
    useEffect(() => {
        // Zero Technical Debt: Articles are now handled on-demand by AI or Vector DB.
        console.log("[CAA] System initialized in Lightweight Mode (No pre-loaded articles)")
    }, [])

    return null
}

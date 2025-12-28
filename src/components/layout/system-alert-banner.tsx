"use client"

import { useEffect, useState } from "react"
import { getActiveBroadcasts } from "@/app/actions/admin-dashboard-actions"
import { AlertCircle, Megaphone, X } from "lucide-react"

export function SystemAlertBanner() {
    const [alerts, setAlerts] = useState<any[]>([])
    const [dismissed, setDismissed] = useState<string[]>([])
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const fetchAlerts = async () => {
            // In a real app, use SWR or React Query for background polling
            // For now, load on mount.
            try {
                const data = await getActiveBroadcasts()
                setAlerts(data)
            } catch (e) {
                console.error("Failed to fetch alerts", e)
            }
        }
        fetchAlerts()
    }, [])

    if (!alerts.length || !isVisible) return null

    // Show the highest severity alert first
    const activeAlert = alerts.find(a => !dismissed.includes(a.id))

    if (!activeAlert) return null

    const colorClass =
        activeAlert.severity === 'critical' ? 'bg-red-600' :
            activeAlert.severity === 'warning' ? 'bg-amber-500' :
                'bg-indigo-600'

    return (
        <div className={`${colorClass} text-white px-4 py-3 shadow-md relative z-50`}>
            <div className="container mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Megaphone className="h-5 w-5 animate-pulse" />
                    <p className="font-medium text-sm md:text-base">
                        <span className="font-bold mr-2 uppercase text-[10px] bg-white/20 px-1 rounded">
                            {activeAlert.severity}
                        </span>
                        <span className="font-bold">{activeAlert.title}</span>: {activeAlert.message}
                    </p>
                </div>
                <button
                    onClick={() => setDismissed([...dismissed, activeAlert.id])}
                    className="ml-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}

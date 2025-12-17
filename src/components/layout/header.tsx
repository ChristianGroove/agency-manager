"use client"

import { MobileSidebar } from "./mobile-sidebar"
import { NotificationBell } from "./notification-bell"

export function Header() {
    return (
        <div className="flex items-center p-4 border-b h-full">
            <MobileSidebar />
            <div className="flex w-full justify-end">
                <div className="flex items-center gap-x-4">
                    <NotificationBell />
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                        A
                    </div>
                </div>
            </div>
        </div>
    )
}

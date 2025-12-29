"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

export const DynamicBriefingList = dynamic(
    () => import("./briefing-list").then((mod) => mod.BriefingList),
    {
        ssr: false,
        loading: () => (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
            </div>
        )
    }
)

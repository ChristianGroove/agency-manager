"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

export const DynamicFormList = dynamic(
    () => import("./form-list").then((mod) => mod.FormList),
    {
        ssr: false,
        loading: () => (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
            </div>
        )
    }
)

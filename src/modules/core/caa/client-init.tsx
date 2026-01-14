"use client"

import { useEffect } from "react"
import { registerBillingHelp } from "@/modules/core/billing/help/init"
import { registerCRMHelp } from "@/modules/core/crm/help/init"
import { registerSettingsHelp } from "@/modules/core/settings/help/init"

export function ClientInit() {
    useEffect(() => {
        // Register module help on client mount
        registerBillingHelp()
        registerCRMHelp()
        registerSettingsHelp()
    }, [])

    return null
}

"use client"

import { useEffect } from "react"
// Core Modules
import { registerBillingHelp } from "@/modules/core/billing/help/init"
import { registerCRMHelp } from "@/modules/core/crm/help/init"
import { registerSettingsHelp } from "@/modules/core/settings/help/init"
import { registerMessagingHelp } from "@/modules/core/messaging/help/init"
import { registerDashboardHelp } from "@/modules/core/dashboard/help/init"
import { registerCatalogHelp } from "@/modules/core/catalog/help/init"
import { registerPortalHelp } from "@/modules/core/portal/help/init"
import { registerFormsHelp } from "@/modules/core/forms/help/init"

// Phase 1: Critical Modules
import { registerQuotesHelp } from "@/modules/core/quotes/help/init"
import { registerAutomationHelp } from "@/modules/core/automation/help/init"
import { registerMarketingHelp } from "@/modules/core/marketing/help/init"
import { registerIntegrationsHelp } from "@/modules/core/integrations/help/init"
import { registerWorkOrdersHelp } from "@/modules/core/work-orders/help/init"
import { registerBroadcastsHelp } from "@/modules/core/broadcasts/help/init"
import { registerChannelsHelp } from "@/modules/core/channels/help/init"
import { registerClientsHelp } from "@/modules/core/clients/help/init"
import { registerOrganizationsHelp } from "@/modules/core/organizations/help/init"
import { registerPaymentsHelp } from "@/modules/core/payments/help/init"
import { registerBrandingHelp } from "@/modules/core/branding/help/init"
import { registerKnowledgeHelp } from "@/modules/core/knowledge/help/init"

export function ClientInit() {
    useEffect(() => {
        // Register Core Help Modules
        registerBillingHelp()
        registerCRMHelp()
        registerSettingsHelp()
        registerMessagingHelp()
        registerDashboardHelp()
        registerCatalogHelp()
        registerPortalHelp()
        registerFormsHelp()

        // Register Phase 1 Critical Modules
        registerQuotesHelp()
        registerAutomationHelp()
        registerMarketingHelp()
        registerIntegrationsHelp()
        registerWorkOrdersHelp()
        registerBroadcastsHelp()
        registerChannelsHelp()
        registerClientsHelp()
        registerOrganizationsHelp()
        registerPaymentsHelp()
        registerBrandingHelp()
        registerKnowledgeHelp()

        console.log("CAA Help System Loaded: 20 Modules")
    }, [])

    return null
}

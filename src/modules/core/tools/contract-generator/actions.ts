"use server"

import { createClient } from "@/lib/supabase-server"
import { getEffectiveBranding } from "@/modules/core/branding/actions"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { AIEngine } from "@/modules/core/ai-engine/service"
import { getCurrentBrandingTier } from "@/modules/core/branding/tier-actions"
import { encryptBuffer } from "@/lib/security/encryption"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function exportContractAsPdf(payload: {
    contractId?: string
    htmlContent: string // Base64 of image or serialized HTML
    metadata: any
}) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No organization selected")

    // 1. Check White Label Rights
    const tierData = await getCurrentBrandingTier()
    const isWhiteLabel = tierData?.tier?.id === 'whitelabel'

    // 2. Prepare PDF Metadata (De-Pixification)
    const pdfMetadata = {
        title: `Contrato - ${payload.metadata.clientName}`,
        subject: isWhiteLabel ? "Acuerdo de Prestación de Servicios" : "Generado por Pixy Agency Manager",
        author: payload.metadata.agencyName,
        creator: isWhiteLabel ? payload.metadata.agencyName : "Pixy Platform",
        producer: isWhiteLabel ? payload.metadata.agencyName : "Pixy PDF Engine"
    }

    // 3. Convert HTML/Image to PDF Buffer (Simplified for now using standard Buffer)
    // In a real Puppeteer setup, this would be await page.pdf(...)
    // Here we assume the client sends the rendered blob or image
    const rawBuffer = Buffer.from(payload.htmlContent.split(',')[1], 'base64')

    // 4. Encrypt for Data Vault (AES-256)
    const vaultKey = process.env.DATA_VAULT_SECRET || "pixy-vault-standard-key-2025"
    const encryptedBuffer = await encryptBuffer(rawBuffer, vaultKey)

    // 5. Store in Supabase Contracts Bucket
    const fileName = `${orgId}/${Date.now()}_contract.pdf.vault`

    const { error: uploadError } = await supabaseAdmin.storage
        .from('contracts')
        .upload(fileName, encryptedBuffer, {
            contentType: 'application/octet-stream',
            upsert: true
        })

    if (uploadError) throw new Error(`Vault Storage Error: ${uploadError.message}`)

    // 6. Return reference
    return {
        success: true,
        fileName,
        isWhiteLabeled: isWhiteLabel,
        vaultPath: `contracts/${fileName}`
    }
}

export async function generateContractWithAi({
    clientId,
    serviceIds,
    prompt
}: {
    clientId: string,
    serviceIds: string[],
    prompt?: string
}) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No organization selected")

    const supabase = await createClient()

    // 1. Get Full Context
    const data = await getContractGeneratorData({ clientId, serviceIds })

    // 2. Execute AI Task
    console.log("[CONTRACT_GEN] 🚀 Calling AI Engine with data:", {
        orgId,
        clientId,
        serviceIds,
        prompt: prompt || "Generar contrato de prestación de servicios estándar.",
        hasTenantData: !!data.tenant,
        hasClientData: !!data.client,
        servicesCount: data.services?.length
    })

    const response = await AIEngine.executeTask({
        organizationId: orgId,
        taskType: 'contract.generate_v1',
        payload: {
            ...data,
            prompt: prompt || "Generar contrato de prestación de servicios estándar.",
            tone: "formal"
        }
    })

    console.log("[CONTRACT_GEN] 📨 AI Engine Response:", {
        success: response.success,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : null,
        provider: response.provider,
        usage: response.usage
    })

    if (!response.success) {
        console.error("[CONTRACT_GEN] ❌ AI Engine failed:", response.error)
        throw new Error(response.error || "Error al generar contrato con IA")
    }

    const result = response.data
    console.log("[CONTRACT_GEN] 🎯 Final result to return:", result)

    // 3. ASYNC ORCHESTRATION START
    try {
        // A. Generate Contract Number (Atomic)
        const { data: seqNum } = await supabase
            .rpc('get_next_sequence_value', {
                org_id: orgId,
                entity_key: 'contract'
            });

        const contractNumber = `CON-${(seqNum || Date.now()).toString().padStart(5, '0').slice(-6)}`;

        // B. Save to CRM (Contracts Table)
        const { data: contractRecord, error: saveError } = await supabase
            .from('contracts')
            .insert({
                organization_id: orgId,
                client_id: clientId,
                number: contractNumber,
                title: result.header || "Acuerdo de Servicios",
                content: result,
                status: 'draft',
                metadata: {
                    serviceIds: serviceIds,
                    ai_model: response.provider || 'unknown'
                }
            })
            .select()
            .single();

        if (saveError) {
            console.error("[CONTRACT_GEN] ❌ Error saving contract record:", saveError);
        } else {
            // C. Emit Inngest Event
            const { inngest } = await import("@/lib/inngest/client");
            await inngest.send({
                name: "contract.generated",
                data: {
                    contractId: contractRecord.id,
                    organizationId: orgId,
                    clientId: clientId,
                    usage: {
                        input_tokens: response.usage?.input_tokens || 0,
                        output_tokens: response.usage?.output_tokens || 0
                    }
                }
            });
            console.log(`[CONTRACT_GEN] ⚡ Inngest Event emitted for Contract ${contractRecord.id}`);
        }
    } catch (asyncErr) {
        console.error("[CONTRACT_GEN] ⚠️ Post-generation orchestration failed:", asyncErr);
    }
    // --- ASYNC ORCHESTRATION END ---

    return result // Structured JSON: { header, clauses, footer }
}

export async function getContractGeneratorData({ clientId, serviceIds }: { clientId?: string, serviceIds?: string[] }) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error("No organization selected")

    const results: any = {
        tenant: null,
        client: null,
        services: []
    }

    // 1. Fetch Tenant & Branding Details
    const [branding, orgSettings] = await Promise.all([
        getEffectiveBranding(orgId),
        supabase
            .from("organization_settings")
            .select("agency_name, agency_country, agency_email")
            .eq("organization_id", orgId)
            .single()
    ])

    results.tenant = {
        name: branding.name,
        legalName: orgSettings.data?.agency_name || branding.name,
        country: orgSettings.data?.agency_country || "Colombia",
        branding: branding
    }

    // 2. Fetch Client Details if selected
    if (clientId) {
        const { data: client } = await supabase
            .from("clients")
            .select("*")
            .eq("id", clientId)
            .single()
        results.client = client
    }

    // 3. Fetch Service Details if selected
    if (serviceIds && serviceIds.length > 0) {
        const { data: services } = await supabase
            .from("service_catalog")
            .select("*")
            .in("id", serviceIds)
        results.services = services || []
    }

    return results
}

export async function getClientsList() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) {
        console.warn("[CONTRACT_GEN] No organization context for getClientsList")
        return []
    }

    const supabase = await createClient()
    const { data: clients, error } = await supabase
        .from("clients")
        .select("id, name, email")
        .eq("organization_id", orgId)
        .order("name")

    if (error) {
        console.error("[CONTRACT_GEN] ❌ Error fetching clients:", error)
        throw error
    }

    console.log(`[CONTRACT_GEN] ✅ Fetched ${clients?.length || 0} clients for Org ${orgId}`)
    return clients
}

export async function getServicesList() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) {
        console.warn("[CONTRACT_GEN] ❌ No organization context for getServicesList")
        return []
    }

    const supabase = await createClient()
    const { data: services, error } = await supabase
        .from("service_catalog")
        .select("id, name, base_price, description")
        .eq("organization_id", orgId)
        .order("name")

    if (error) {
        console.error("[CONTRACT_GEN] ❌ Error fetching services:", error)
        throw error
    }

    console.log(`[CONTRACT_GEN] ✅ Fetched ${services?.length || 0} services for Org ${orgId}`)
    return services
}

// --- Contract Management Actions ---

export async function getContracts() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    const supabase = await createClient()
    const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
            id, 
            number, 
            title, 
            status, 
            created_at, 
            client:clients(name)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching contracts:", error)
        return []
    }
    return contracts
}

export async function deleteContract(id: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Unauthorized")

    const supabase = await createClient()
    const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) throw new Error(error.message)
    return { success: true }
}

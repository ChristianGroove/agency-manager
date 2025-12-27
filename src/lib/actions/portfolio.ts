"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { ServiceCatalogItem } from "@/types"
import { revalidatePath } from "next/cache"
import { slugify } from "@/lib/utils"

import { getCurrentOrganizationId } from "./organizations"

export async function getPortfolioItems() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    let query = supabase
        .from('services')
        .select('*')
        .eq('is_catalog_item', true)
        .order('category')
        .order('name')

    if (orgId) query = query.eq('organization_id', orgId)

    const { data, error } = await query

    if (error) throw error
    return data as ServiceCatalogItem[] // Types are compatible
}

/**
 * Get SaaS App assigned to organization via subscription
 * Single Subscription Model: Each org has ONE subscription_product_id
 */
export async function getSubscriptionApp() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return null

    // Get org's subscription product ID
    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('subscription_product_id')
        .eq('id', orgId)
        .single()

    if (orgError || !org?.subscription_product_id) {
        return null // No subscription assigned
    }

    // Get the SaaS product
    const { data: product, error: productError } = await supabase
        .from('saas_products')
        .select('*')
        .eq('id', org.subscription_product_id)
        .single()

    if (productError) throw productError
    return product
}

export async function upsertPortfolioItem(item: Partial<ServiceCatalogItem>) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    // CRITICAL: Get organization context
    const { getCurrentOrganizationId } = await import('./organizations')
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        throw new Error('No organization context found')
    }

    // 1. Upsert Service (as Catalog Item) using Admin Client to bypass RLS
    const { data: serviceData, error: serviceError } = await supabaseAdmin
        .from('services')
        .upsert({
            ...(item.id ? { id: item.id } : {}),
            name: item.name,
            description: item.description,
            category: item.category,
            type: item.type,
            frequency: item.frequency,
            base_price: item.base_price,
            is_visible_in_portal: item.is_visible_in_portal,
            is_catalog_item: true, // Force this flag
            client_id: null, // Ensure no client is assigned
            organization_id: orgId // CRITICAL FIX: Inject organization context
        })
        .select()
        .single()

    if (serviceError) {
        console.error("Upsert Service Error:", serviceError)
        throw serviceError
    }

    // 2. Sync with Briefing Template
    // We try to find a template with the same slug or name.
    const slug = slugify(item.name || "")

    // Check if template exists by slug (assuming slug is unique or we use it as key)
    // Or check by Name if slug isn't reliable.
    const { data: existingTemplate } = await supabaseAdmin
        .from('briefing_templates')
        .select('id')
        .eq('slug', slug)
        .single()

    let templateId = existingTemplate?.id

    if (existingTemplate) {
        // Update existing template
        await supabaseAdmin
            .from('briefing_templates')
            .update({
                name: item.name,
                description: item.description,
                updated_at: new Date().toISOString()
            })
            .eq('id', existingTemplate.id)
    } else {
        // Create new template
        const { data: newTemplate } = await supabaseAdmin
            .from('briefing_templates')
            .insert({
                name: item.name,
                description: item.description,
                slug: slug,
            })
            .select('id')
            .single()

        templateId = newTemplate?.id
    }

    // 3. Link Service to Template (Architecture Refactor Requirement)
    if (templateId && serviceData.id) {
        await supabaseAdmin.from('services').update({ briefing_template_id: templateId }).eq('id', serviceData.id)
    }

    revalidatePath('/dashboard/portfolio')
    revalidatePath('/dashboard/quotes/new')
    revalidatePath('/quotes/create')
    // Revalidate other paths where catalog is used
    return serviceData
}

export async function deletePortfolioItem(id: string) {
    const supabase = await createClient()

    // Soft delete or Hard delete?
    // Using Hard delete for now to match previous logic, but on services table.
    // Be careful deleting from 'services' if it has linked data?
    // User requested "deletePortfolioItem", implies managing the Catalog Entry.
    // If we delete the 'Master', we might break historical references if they are hard links.
    // But our architecture copies data to new instances.
    // So deleting the Master is "OK" for future, but might leave instances orphaned if they relied on it?
    // Our 'convertQuote' logic creates INDEPENDENT services (copies).
    // So deleting Master is safe-ish.

    const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id)

    if (error) throw error
    revalidatePath('/dashboard/portfolio')
}


// Helper for Template Configuration
const TEMPLATE_CONFIG: Record<string, { title: string, description: string, fields: any[] }[]> = {
    'Branding': [
        {
            title: "Identidad de Marca",
            description: "Define el alma y la apariencia de tu marca.",
            fields: [
                { label: "¿Cuál es la misión y visión de la empresa?", name: "mision_vision", type: "textarea", required: true, order: 1 },
                { label: "Describe a tu cliente ideal (Avatar)", name: "target_audience", type: "textarea", required: true, order: 2 },
                { label: "Adjetivos que describan la marca (Ej: Seria, Juvenil)", name: "brand_adjectives", type: "text", required: true, order: 3 },
                { label: "Preferencias de color", name: "color_preferences", type: "text", required: false, order: 4 },
                { label: "¿Qué marcas admiras? (Referencias)", name: "references", type: "textarea", required: false, order: 5 }
            ]
        }
    ],
    'Desarrollo Web': [
        {
            title: "Objetivos del Sitio",
            description: "Estructura y funcionalidad esperada.",
            fields: [
                { label: "¿Cuál es el objetivo principal? (Ventas, Informativo, Portafolio)", name: "site_objective", type: "text", required: true, order: 1 },
                { label: "Secciones requeridas (Inicio, Nosotros, Contacto...)", name: "sitemap", type: "textarea", required: true, order: 2 },
                { label: "Sitios web de referencia (Links)", name: "ref_sites", type: "textarea", required: true, order: 3 },
                { label: "¿Cuentas con Hosting/Dominio?", name: "hosting_domain", type: "radio", options: ["Si", "No", "Necesito Asesoría"], required: true, order: 4 }
            ]
        }
    ],
    'Marketing': [
        {
            title: "Estrategia de Campaña",
            description: "Detalles para la configuración de anuncios.",
            fields: [
                { label: "Presupuesto Mensual Estimado", name: "budget", type: "text", required: true, order: 1 },
                { label: "Objetivo de Campaña", name: "campaign_objective", type: "select", options: ["Reconocimiento", "Tráfico", "Leads", "Ventas"], required: true, order: 2 },
                { label: "Público Objetivo (Ubicación, Edad, Intereses)", name: "audience_details", type: "textarea", required: true, order: 3 },
                { label: "Material Creativo Disponible", name: "creatives", type: "checkbox", options: ["Fotos", "Videos", "Logos", "No tengo material"], required: false, order: 4 }
            ]
        }
    ],
    'Default': [
        {
            title: "Detalles del Proyecto",
            description: "Información general sobre el requerimiento.",
            fields: [
                { label: "Descripción detallada del requerimiento", name: "project_description", type: "textarea", required: true, order: 1 },
                { label: "¿Cuál es el objetivo principal?", name: "main_objective", type: "text", required: true, order: 2 },
                { label: "Fecha de entrega esperada", name: "deadline", type: "date", required: false, order: 3 },
                { label: "Archivos adjuntos o referencias", name: "attachments", type: "textarea", required: false, order: 4 }
            ]
        }
    ]
}

export async function syncAllBriefingTemplates() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // 1. Get all catalog services
    const { data: services } = await supabaseAdmin.from('services').select('*').eq('is_catalog_item', true)
    if (!services) return

    let createdCount = 0

    // 2. Iterate services to Ensure Template Exists AND has Steps
    for (const service of services) {
        const slug = slugify(service.name)

        // A. Upsert Template to ensure it exists
        // We use upsert to create it if missing, or get its ID if existing
        const { data: template, error: tmplError } = await supabaseAdmin
            .from('briefing_templates')
            .upsert({
                name: service.name,
                description: service.description || `Plantilla para ${service.name}`,
                slug: slug,
                updated_at: new Date().toISOString()
            }, { onConflict: 'slug' })
            .select('id')
            .single()

        if (tmplError || !template) {
            console.error("Error upserting template:", tmplError)
            continue
        }

        // B. Check if steps exist
        const { count } = await supabaseAdmin
            .from('briefing_steps')
            .select('*', { count: 'exact', head: true })
            .eq('template_id', template.id)

        // Only populate if NO steps exist (to avoid overwriting custom ones)
        if (count === 0) {
            // Determine config
            let config = TEMPLATE_CONFIG['Default']
            const lowerName = service.name.toLowerCase()
            const lowerCat = service.category.toLowerCase()

            if (lowerCat.includes('branding') || lowerName.includes('brand') || lowerName.includes('identidad')) config = TEMPLATE_CONFIG['Branding']
            else if (lowerCat.includes('web') || lowerName.includes('web') || lowerName.includes('landing') || lowerName.includes('ecommerce')) config = TEMPLATE_CONFIG['Desarrollo Web']
            else if (lowerCat.includes('marketing') || lowerName.includes('ads') || lowerName.includes('pauta')) config = TEMPLATE_CONFIG['Marketing']

            // Insert Steps and Fields
            for (const [stepIndex, stepConfig] of config.entries()) {
                const { data: newStep, error: stepError } = await supabaseAdmin
                    .from('briefing_steps')
                    .insert({
                        template_id: template.id,
                        title: stepConfig.title,
                        description: stepConfig.description,
                        order_index: stepIndex + 1
                    })
                    .select()
                    .single()

                if (stepError || !newStep) continue

                const fieldsToInsert = stepConfig.fields.map(f => ({
                    step_id: newStep.id,
                    label: f.label,
                    name: f.name,
                    type: f.type,
                    required: f.required,
                    options: f.options || null,
                    order_index: f.order
                }))

                await supabaseAdmin.from('briefing_fields').insert(fieldsToInsert)
            }
            createdCount++
        }
    }

    if (createdCount > 0) {
        revalidatePath('/dashboard/portfolio')
        revalidatePath('/dashboard/briefings')
    }

    return { success: true, count: createdCount }
}

'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import OpenAI from "openai"

export async function generateCatalogImage(params: {
    name: string
    description?: string
    category?: string
}) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No organization context")

    const supabase = await createClient()

    // 1. Quota Check (Max 5 per day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count, error: countError } = await supabase
        .from('ai_image_generation_logs')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .gte('created_at', today.toISOString())

    if (countError) throw countError
    if (count && count >= 5) {
        throw new Error("Daily limit of 5 AI images reached for this organization.")
    }

    // 2. Prompt Engineering
    const prompt = `Professional product photography of "${params.name}". 
    Context: ${params.description || 'Quality product'}. 
    Category: ${params.category || 'Professional'}. 
    Style: Minimalist studio lighting, high resolution, clean background, center composition, 4k, realistic.`

    try {
        // 3. Generate Image (DALL-E 2 for economy or DALL-E 3)
        // Using DALL-E 3 for better quality as requested "visual excellence"
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            quality: "standard",
            response_format: "b64_json"
        })

        if (!response.data || response.data.length === 0) throw new Error("No image data received from AI")
        const b64Data = response.data[0].b64_json
        if (!b64Data) throw new Error("No image data received")

        // 4. Upload to Supabase Storage
        const fileName = `ai_catalog_${orgId}_${Date.now()}.png`
        const buffer = Buffer.from(b64Data, 'base64')

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('catalog_images')
            .upload(fileName, buffer, {
                contentType: 'image/png',
                cacheControl: '3600'
            })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
            .from('catalog_images')
            .getPublicUrl(fileName)

        // 5. Log usage
        await supabase.from('ai_image_generation_logs').insert({
            organization_id: orgId,
            prompt_used: prompt,
            image_url: publicUrl,
            status: 'success',
            model_used: 'dall-e-3'
        })

        return { success: true, url: publicUrl }

    } catch (error: any) {
        console.error('[AI Image Generation] Error:', error)

        // Log failure
        await supabase.from('ai_image_generation_logs').insert({
            organization_id: orgId,
            prompt_used: prompt,
            status: 'failed',
            model_used: 'dall-e-3'
        })

        throw new Error(error.message || "Failed to generate image")
    }
}

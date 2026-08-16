'use server'

/**
 * ==============================================================================
 * AI COPYWRITER & MEDIA SERVER ACTIONS
 * File: src/modules/features/catalog/ai-actions.ts
 * AI Copywriting, SEO Enrichment, Description Refinement & Legacy DALL-E Generator
 * ==============================================================================
 */

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { CatalogClassification } from "@/types/catalog"
import OpenAI from "openai"

export type AICopyTone =
  | 'professional'
  | 'creative'
  | 'persuasive'
  | 'concise'
  | 'luxurious'
  | 'luxury'
  | 'playful'
  | 'casual'
  | 'technical'

export interface GenerateCatalogCopyParams {
  name: string
  category?: string
  classification?: CatalogClassification
  keywords?: string[]
  tone?: AICopyTone
  language?: string
}

export interface CatalogCopyData {
  title: string
  title_suggestions: string[]
  description: string
  features: string[]
  bullet_points: string[]
  seo_title: string
  seo_description: string
  search_tags: string[]
  seo: {
    meta_title: string
    meta_description: string
    search_tags: string[]
  }
}

export interface GenerateCatalogCopyResult {
  success: boolean
  data?: CatalogCopyData
  error?: string
}

export interface EnhanceCatalogDescriptionParams {
  currentText: string
  tone?: string
  focus?: 'sales' | 'seo' | 'technical'
}

export interface EnhanceCatalogDescriptionResult {
  success: boolean
  data?: {
    enhancedText: string
    improvements: string[]
  }
  error?: string
}

// ------------------------------------------------------------------------------
// Fallback Rule-Based Copy Generator
// ------------------------------------------------------------------------------

function generateFallbackCatalogCopy(
  params: GenerateCatalogCopyParams
): CatalogCopyData {
  const { name, category = 'General', classification = 'service', keywords = [], tone = 'persuasive' } = params

  const cleanName = name.trim()
  const cleanCategory = category.trim()
  const kwList = keywords.length > 0 ? keywords : [cleanCategory, 'calidad', 'servicio premium']

  let title = cleanName
  const titleSuggestions = [
    `${cleanName} Premium`,
    `${cleanName} - Solución Profesional`,
    `${cleanName} de Alta Calidad`,
    `Experiencia ${cleanName}`,
  ]

  let description = ''
  let features: string[] = []

  switch (classification) {
    case 'physical':
      description = `Descubre ${cleanName}, diseñado con materiales de primera calidad y altos estándares de durabilidad. Ideal para satisfacer tus necesidades en la categoría de ${cleanCategory} con máxima eficiencia y estilo.`
      features = [
        'Fabricación de alta durabilidad con acabados de primera calidad',
        'Empaque seguro y garantía de satisfacción garantizada',
        'Compatibilidad y rendimiento probado para uso exigente',
        'Atención personalizada y soporte posventa dedicado',
      ]
      break
    case 'digital':
      description = `${cleanName} es una solución digital avanzada en el área de ${cleanCategory}. Ofrece acceso instantáneo, herramientas optimizadas y recursos completos para potenciar tus proyectos de manera ágil.`
      features = [
        'Entrega inmediata y acceso directo desde cualquier dispositivo',
        'Actualizaciones periódicas y compatibilidad asegurada',
        'Licenciamiento transparente y documentación completa',
        'Soporte técnico prioritario y asistencia en implementación',
      ]
      break
    case 'subscription':
      description = `Suscríbete a ${cleanName} y disfruta de beneficios continuos en ${cleanCategory}. Un plan integral diseñado para brindarte soporte recurrente, innovación constante y total tranquilidad.`
      features = [
        'Facturación flexible y sin cláusulas de permanencia oculta',
        'Acceso prioritario a nuevas características y mejoras continuas',
        'Monitoreo proactivo y canales de atención preferencial',
        'Reportes periódicos y optimización constante de resultados',
      ]
      break
    case 'service':
    default:
      description = `Servicio profesional de ${cleanName} enfocado en entregar resultados tangibles y de alto valor en ${cleanCategory}. Nuestro equipo experto se encarga de cada detalle para asegurar excelencia operativa y cumplimiento riguroso.`
      features = [
        'Metodología probada con entregables claros y acuerdos de nivel de servicio (SLA)',
        'Acompañamiento personalizado de especialistas certificados',
        'Procesos transparentes con seguimiento y reportes de avance',
        'Garantía de calidad y adaptabilidad a las necesidades de tu empresa',
      ]
      break
  }

  if (tone === 'luxurious' || tone === 'luxury') {
    description = `Exclusividad y distinción se unen en ${cleanName}. Una propuesta de categoría superior en ${cleanCategory} pensada para los estándares más exigentes.`
  } else if (tone === 'concise') {
    description = `${cleanName}: máxima eficiencia y calidad garantizada en ${cleanCategory}.`
  }

  const seoTitle = `${cleanName} | ${cleanCategory} Profesional`
  const seoDescription = description.length > 155 ? `${description.substring(0, 152)}...` : description
  const searchTags = Array.from(
    new Set([
      cleanName.toLowerCase(),
      cleanCategory.toLowerCase(),
      classification,
      ...kwList.map((k) => k.toLowerCase()),
    ])
  ).slice(0, 8)

  return {
    title,
    title_suggestions: titleSuggestions,
    description,
    features,
    bullet_points: features,
    seo_title: seoTitle,
    seo_description: seoDescription,
    search_tags: searchTags,
    seo: {
      meta_title: seoTitle,
      meta_description: seoDescription,
      search_tags: searchTags,
    },
  }
}

/**
 * 1. Generate Structured Catalog Copy (OpenAI + Intelligent Fallback)
 */
export async function generateCatalogCopyAction(
  params: GenerateCatalogCopyParams
): Promise<GenerateCatalogCopyResult> {
  try {
    const { name, category = 'General', classification = 'service', keywords = [], tone = 'persuasive', language = 'es' } = params

    if (!name || typeof name !== 'string') {
      return { success: false, error: 'El nombre del producto o servicio es requerido' }
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      // Fallback generator when OpenAI is not configured
      const fallbackData = generateFallbackCatalogCopy(params)
      return { success: true, data: fallbackData }
    }

    try {
      const openai = new OpenAI({ apiKey })

      const prompt = `Eres un redactor profesional de comercio electrónico y catálogos de servicios en español (${language}).
Genera el contenido de venta completo para el siguiente item:
- Nombre: "${name}"
- Categoría: "${category}"
- Clasificación: "${classification}" (physical, digital, service, subscription)
- Tono: "${tone}"
- Palabras clave: ${keywords.join(', ') || 'Ninguna'}

Devuelve EXCLUSIVAMENTE un objeto JSON válido con la siguiente estructura exacta:
{
  "title": "Nombre optimizado para venta",
  "title_suggestions": ["Opción 1", "Opción 2", "Opción 3"],
  "description": "Descripción persuasiva de 2 a 4 párrafos cortos",
  "features": ["Beneficio clave 1", "Beneficio clave 2", "Beneficio clave 3", "Beneficio clave 4"],
  "bullet_points": ["Punto 1", "Punto 2", "Punto 3", "Punto 4"],
  "seo_title": "Título SEO corto y atractivo (máx 60 caracteres)",
  "seo_description": "Meta descripción optimizada para Google (máx 155 caracteres)",
  "search_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      })

      const rawContent = response.choices[0]?.message?.content
      if (!rawContent) {
        throw new Error('No se recibió contenido de OpenAI')
      }

      const parsed = JSON.parse(rawContent)
      const features = Array.isArray(parsed.features) ? parsed.features : parsed.bullet_points || []
      const bulletPoints = Array.isArray(parsed.bullet_points) ? parsed.bullet_points : features
      const searchTags = Array.isArray(parsed.search_tags) ? parsed.search_tags : []

      const resultData: CatalogCopyData = {
        title: parsed.title || name,
        title_suggestions: Array.isArray(parsed.title_suggestions) ? parsed.title_suggestions : [name],
        description: parsed.description || '',
        features,
        bullet_points: bulletPoints,
        seo_title: parsed.seo_title || `${name} | ${category}`,
        seo_description: parsed.seo_description || parsed.description?.slice(0, 155) || '',
        search_tags: searchTags,
        seo: {
          meta_title: parsed.seo_title || `${name} | ${category}`,
          meta_description: parsed.seo_description || parsed.description?.slice(0, 155) || '',
          search_tags: searchTags,
        },
      }

      return { success: true, data: resultData }
    } catch (apiErr: any) {
      console.warn('[generateCatalogCopyAction] OpenAI query failed, using rule fallback:', apiErr.message)
      const fallbackData = generateFallbackCatalogCopy(params)
      return { success: true, data: fallbackData }
    }
  } catch (err: any) {
    console.error('generateCatalogCopyAction error:', err)
    return { success: false, error: err.message || 'Error al generar copia con IA' }
  }
}

/**
 * 2. Enhance Existing Catalog Description
 */
export async function enhanceCatalogDescriptionAction(
  params: EnhanceCatalogDescriptionParams
): Promise<EnhanceCatalogDescriptionResult> {
  try {
    const { currentText, tone = 'persuasive', focus = 'sales' } = params

    if (!currentText || typeof currentText !== 'string') {
      return { success: false, error: 'El texto actual es requerido' }
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      const enhancedText = `${currentText.trim()}\n\n✓ Garantía de satisfacción y soporte profesional dedicado.`
      return {
        success: true,
        data: {
          enhancedText,
          improvements: [
            'Estructura formateada con viñetas de confianza',
            'Claridad de propuesta de valor agregada',
          ],
        },
      }
    }

    try {
      const openai = new OpenAI({ apiKey })

      const prompt = `Mejora y optimiza el siguiente texto de descripción de catálogo:
"${currentText}"

Criterios:
- Tono: ${tone}
- Enfoque: ${focus} (sales, seo, technical)
- Idioma: Español

Devuelve un JSON con:
{
  "enhancedText": "Texto mejorado, profesional y atractivo",
  "improvements": ["Mejora 1 realizada", "Mejora 2 realizada"]
}`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.6,
      })

      const rawContent = response.choices[0]?.message?.content
      if (!rawContent) throw new Error('Respuesta vacía de IA')

      const parsed = JSON.parse(rawContent)
      return {
        success: true,
        data: {
          enhancedText: parsed.enhancedText || currentText,
          improvements: Array.isArray(parsed.improvements) ? parsed.improvements : ['Texto optimizado'],
        },
      }
    } catch (apiErr: any) {
      console.warn('[enhanceCatalogDescriptionAction] Fallback used:', apiErr.message)
      return {
        success: true,
        data: {
          enhancedText: currentText.trim(),
          improvements: ['Manteniendo texto original'],
        },
      }
    }
  } catch (err: any) {
    console.error('enhanceCatalogDescriptionAction error:', err)
    return { success: false, error: err.message || 'Error al mejorar texto' }
  }
}

/**
 * 3. Legacy DALL-E Product Image Generator (100% Backwards Compatible)
 */
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
    // 3. Generate Image (DALL-E 3)
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

    const { error: uploadError } = await supabase.storage
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

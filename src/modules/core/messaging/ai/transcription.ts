"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { decrypt } from "@/modules/core/ai-engine/encryption"
import OpenAI from "openai"
import { GoogleGenerativeAI } from "@google/generative-ai"

export interface TranscriptionResult {
    success: boolean
    text?: string
    duration?: number
    language?: string
    error?: string // Detailed error for debugging
    debug?: any
}

export async function transcribeAudio(audioUrl: string, messageId?: string): Promise<TranscriptionResult> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "Unauthorized: No Org ID" }

    try {
        // 0. Cache Check (Optimized Cost)
        if (messageId) {
            const { data: msg } = await supabaseAdmin
                .from('messages')
                .select('metadata')
                .eq('id', messageId)
                .single()

            if (msg?.metadata && (msg.metadata as any).transcription) {
                return { success: true, text: (msg.metadata as any).transcription, debug: 'cache-hit' }
            }
        }

        const { data: credentials, error: dbError } = await supabaseAdmin
            .from('ai_credentials')
            .select('*, provider:ai_providers(name)')
            .eq('organization_id', orgId)
            .order('priority', { ascending: true });

        if (dbError || !credentials) {
            return { success: false, error: `DB Error: ${dbError?.message}` }
        }

        let lastProviderError: string | undefined;
        let finalResult: TranscriptionResult | null = null;

        // 1. Try Google Gemini first (Prioritized)
        const googleCred = credentials.find(c => c.provider_id === 'google' && c.status === 'active')
        if (googleCred) {
            const result = await transcribeWithGemini(audioUrl, googleCred, orgId)
            if (result.success) {
                finalResult = result;
            } else {
                lastProviderError = `GeminiError: ${result.error}`;
                console.warn('[Transcription] Gemini failed:', result.error);
            }
        }

        // 2. Fallback to OpenAI
        if (!finalResult) {
            const openaiCred = credentials.find(c => c.provider_id === 'openai' && c.status === 'active')

            // Check DB Credential OR Env Var
            if (openaiCred || process.env.OPENAI_API_KEY) {
                try {
                    // Create virtual credential if missing but env var exists
                    const effectiveCred = openaiCred || {
                        id: 'env-var-fallback',
                        // Mock encrypted key - logic below handles plain text if not encrypted
                        api_key_encrypted: process.env.OPENAI_API_KEY
                    }

                    finalResult = await transcribeWithOpenAI(audioUrl, effectiveCred, orgId)
                } catch (e: any) {
                    const errMsg = e?.message || "Unknown OpenAI Error";
                    lastProviderError = `OpenAIError: ${errMsg}. (Prev: ${lastProviderError})`;
                }
            }
        }

        // 3. Save to DB (Persistent Cache)
        if (finalResult?.success && finalResult.text && messageId) {
            // Fetch current metadata again to be safe
            const { data: currentMsg } = await supabaseAdmin
                .from('messages')
                .select('metadata')
                .eq('id', messageId)
                .single()

            const currentMetadata = (currentMsg?.metadata || {}) as Record<string, any>
            const newMetadata = { ...currentMetadata, transcription: finalResult.text }

            await supabaseAdmin.from('messages')
                .update({ metadata: newMetadata })
                .eq('id', messageId)
        }

        if (finalResult) return finalResult;

        if (lastProviderError) {
            return { success: false, error: `${lastProviderError}` }
        }

        const activeParams = credentials.map(c => `${c.provider_id}(${c.status})`);
        return {
            success: false,
            error: `No active AI credential found. Found: ${credentials.length} [${activeParams.join(', ')}]`
        }

    } catch (error: any) {
        console.error('[Transcription] Error:', error)
        return { success: false, error: `SysError: ${error.message}` }
    }
}

async function transcribeWithGemini(audioUrl: string, credential: any, orgId: string): Promise<TranscriptionResult> {
    try {
        const apiKey = decrypt(credential.api_key_encrypted)
        if (!apiKey) return { success: false, error: "API Key is empty" }

        const genAI = new GoogleGenerativeAI(apiKey)

        // Fetch audio ONCE
        const audioResponse = await fetch(audioUrl)
        if (!audioResponse.ok) return { success: false, error: "Failed to fetch audio file" }

        const arrayBuffer = await audioResponse.arrayBuffer()
        const base64Audio = Buffer.from(arrayBuffer).toString('base64')
        const mimeType = audioResponse.headers.get('content-type') || 'audio/ogg'

        // Model Fallback Chain
        // Try newest first, fall back to stable/older if 404
        const modelsToTry = [
            "gemini-2.0-flash-001",
            "gemini-2.0-flash",
            "gemini-2.5-flash",
            "gemini-1.5-flash",
            "gemini-1.5-flash-001",
            "gemini-1.5-pro",
            "gemini-pro"
        ];

        let lastModelError = "";

        for (const modelName of modelsToTry) {
            try {
                console.log(`[Gemini] Trying model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });

                const result = await model.generateContent([
                    "Transcribe this audio file exactly as spoken. Return ONLY the text, no other commentary.",
                    {
                        inlineData: { mimeType, data: base64Audio }
                    }
                ]);

                const response = await result.response;
                const text = response.text();

                // Success! Log and return
                void logUsage(orgId, credential.id, 'google', modelName);
                return { success: true, text: text, language: 'detected' };

            } catch (e: any) {
                console.warn(`[Gemini] Model ${modelName} failed: ${e.message}`);
                lastModelError = e.message;

                // CRITICAL: Stop fallback if Quota/Billing issue (429)
                // Otherwise we fall back to older models which also fail or 404, masking the real error.
                if (e.message.includes("429") || e.message.includes("RESOURCE_EXHAUSTED") || e.message.includes("quota")) {
                    return { success: false, error: `Google Quota Exceeded (429). Please check billing or wait.` };
                }

                // If it's NOT a 404, maybe it's auth? If auth, all will fail.
                // But we continue loop just in case.
                if (e.message.includes("403") || e.message.includes("API key")) {
                    return { success: false, error: `Auth Error: ${e.message}` };
                }
            }
        }

        return { success: false, error: `All models failed. Last: ${lastModelError}` }

    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

async function transcribeWithOpenAI(audioUrl: string, credential: any, orgId: string): Promise<TranscriptionResult> {
    try {
        let apiKey = ""

        // CRITICAL: Prioritize Env Var (Manual Override)
        // If the user put a key in .env, we use it over the DB credential
        if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
            apiKey = process.env.OPENAI_API_KEY
        } else {
            // Fallback to DB Credential
            apiKey = credential.api_key_encrypted
            if (!apiKey.startsWith('sk-')) {
                const decrypted = decrypt(apiKey)
                if (decrypted) apiKey = decrypted
            }
        }

        if (!apiKey || (!apiKey.startsWith('sk-') && apiKey.length < 20)) {
            return { success: false, error: "OpenAI API Key is invalid or missing" }
        }

        const client = new OpenAI({ apiKey })
        const audioResponse = await fetch(audioUrl)
        if (!audioResponse.ok) return { success: false, error: "Failed to fetch audio file" }

        const audioBlob = await audioResponse.blob()
        const audioFile = new File([audioBlob], 'audio.ogg', { type: audioBlob.type || 'audio/ogg' })

        const transcription = await client.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            response_format: 'verbose_json'
        })
        void logUsage(orgId, credential.id, 'openai', 'whisper-1')
        return { success: true, text: transcription.text, duration: transcription.duration, language: transcription.language }
    } catch (error: any) {
        throw error
    }
}

async function logUsage(orgId: string, credentialId: string, providerId: string, model: string) {
    try {
        await supabaseAdmin.from('ai_usage_logs').insert({
            organization_id: orgId, credential_id: credentialId, provider_id: providerId, model: model,
            task_type: 'media.transcribe_v1', input_tokens: 0, output_tokens: 0, status: 'success'
        })
    } catch (e) { console.error(e) }
}

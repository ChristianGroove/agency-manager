
'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { PDFDocument } from 'pdf-lib'
// removed top-level require

/**
 * Uploads a PDF manifest, extracts IMEIs, and keys them in the database.
 */
export async function uploadManifest(formData: FormData) {
    const file = formData.get('file') as File

    if (!file) {
        return { success: false, error: 'No file provided' }
    }

    if (file.type !== 'application/pdf') {
        return { success: false, error: 'File must be a PDF' }
    }

    try {
        const supabase = await createClient()

        // 1. Upload file to Storage
        // Generate a unique path: year/month/random-filename.pdf
        const date = new Date()
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const randomId = crypto.randomUUID()
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const storagePath = `${year}/${month}/${randomId}-${sanitizedName}`

        const buffer = await file.arrayBuffer()
        let fileBuffer = Buffer.from(buffer)
        let optimized = false

        // 1. OPTIMIZATION (Try-Catch to not block upload)
        try {
            const pdfDoc = await PDFDocument.load(buffer)
            pdfDoc.setTitle(file.name)
            pdfDoc.setProducer('Pixy Agency Manager')

            // Save with compression
            const optimizedUint8 = await pdfDoc.save({ useObjectStreams: true })
            const optimizedBuffer = Buffer.from(optimizedUint8)

            // Use optimized if smaller
            if (optimizedBuffer.length < fileBuffer.length) {
                fileBuffer = optimizedBuffer
                optimized = true
                console.log(`[Manifest] Optimized: ${file.size} -> ${fileBuffer.length} bytes`)
            }
        } catch (optError) {
            console.warn('[Manifest] Optimization failed, using original:', optError)
        }

        // 2. Upload (Optimized or Original)
        const { error: uploadError } = await supabase
            .storage
            .from('manifests')
            .upload(storagePath, fileBuffer, {
                contentType: 'application/pdf',
                upsert: false
            })

        if (uploadError) {
            console.error('Upload Error:', uploadError)
            return { success: false, error: 'Failed to upload file to storage' }
        }

        // 3. Extract Text (Try-Catch for robustness)
        let extractedText = ''
        try {
            // Polyfill DOMMatrix for pdf.js (used by pdf-parse legacy dependencies)
            if (typeof global.DOMMatrix === 'undefined') {
                (global as any).DOMMatrix = class DOMMatrix {
                    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
                    constructor() { }
                    translate() { return this; }
                    scale() { return this; }
                    multiply() { return this; }
                }
            }

            // START FIX: Direct import of pdf-parse lib to bypass index.js debug logic
            // This avoids ENOENT errors on serverless/nextjs environments
            const pdfParse = require('pdf-parse/lib/pdf-parse.js')

            // v1.1.1 API is simple: pdfParse(buffer) -> Promise<data>
            // We pass the Node Buffer directly, no Uint8Array conversion needed for v1
            // v1.1.1 API is simple: pdfParse(buffer) -> Promise<data>
            // We pass the Node Buffer directly, no Uint8Array conversion needed for v1
            const data = await pdfParse(fileBuffer)

            // Fix: Check data.text or fallback to data if it's a string
            if (data && data.text) {
                extractedText = data.text
            } else {
                extractedText = typeof data === 'string' ? data : ''
            }
            // END FIX
        } catch (parseError: any) {
            console.error('PDF Parse Error:', parseError)
            // If parsing fails, we STILL save the file but return a warning or partial success?
            // User requested "sigue el mismo error", implying failure to parse stops everything.
            // Let's return a specific error message.
            return { success: false, error: `Error leyendo PDF: ${parseError.message || 'Formato inválido'}` }
        }

        // Regex for 15-digit numbers (IMEI standard)
        // We use a Set to deduplicate IMEIs found in the same document
        const imeiRegex = /\b\d{15}\b/g
        const foundImeis = new Set(extractedText.match(imeiRegex) || [])
        const imeisCount = foundImeis.size

        // 3. Create Database Record (Document)
        // We need organization_id. efficient way is to get it from auth
        // but standard createClient already has context
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        // Get Org ID (helper or direct query)
        const { data: member } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id)
            .single()

        if (!member) throw new Error('No organization found')

        const { data: doc, error: dbError } = await supabase
            .from('manifest_documents')
            .insert({
                organization_id: member.organization_id,
                filename: file.name,
                storage_path: storagePath,
                file_size: file.size,
                status: 'processed',
                uploaded_by: user.id
            })
            .select()
            .single()

        if (dbError) {
            console.error('DB Insert Error:', dbError)
            // Cleanup storage if DB fails? For now, leave it.
            return { success: false, error: 'Failed to save document metadata' }
        }

        // 4. Insert Extracted IMEIs
        if (imeisCount > 0) {
            const imeiRecords = Array.from(foundImeis).map(imei => ({
                organization_id: member.organization_id,
                document_id: doc.id,
                imei: imei,
                page_number: 1 // pdf-parse basic doesn't give page numbers easily per match without advanced logic. 
                // For now default to 1, or we improve parsing later if "Jump to Page" is critical.
                // User requirement says "mark that imei", usually 1-page manifests or we search whole text.
                // Let's stick to global index for now.
            }))

            const { error: imeiError } = await supabase
                .from('manifest_imeis')
                .insert(imeiRecords)

            if (imeiError) {
                console.error('IMEI Insert Error:', imeiError)
                return { success: false, error: 'Document saved but failed to index IMEIs' }
            }
        }

        revalidatePath('/manifests')
        return { success: true, count: imeisCount }

    } catch (error: any) {
        console.error('Process Error:', error)
        return { success: false, error: error.message || 'Unknown error' }
    }
}

export async function getManifests() {
    const supabase = await createClient()

    // RLS handles filtering
    const { data, error } = await supabase
        .from('manifest_documents')
        .select(`
            *,
            manifest_imeis (count)
        `)
        .order('created_at', { ascending: false })

    if (error) return []
    return data
}

export async function searchIMEI(imeiFragment: string) {
    if (!imeiFragment || imeiFragment.length < 5) return [] // Minimum search length

    const supabase = await createClient()

    // Search in IMEIs table
    const { data, error } = await supabase
        .from('manifest_imeis')
        .select(`
            imei,
            document:manifest_documents (
                id,
                filename,
                created_at,
                storage_path
            )
        `)
        .ilike('imei', `%${imeiFragment}%`)
        .limit(20)

    if (error) {
        console.error('Search Error:', error)
        return []
    }

    // Deduplicate documents
    const uniqueDocs = new Map()
    data.forEach(item => {
        const doc = Array.isArray(item.document) ? item.document[0] : item.document
        if (doc && !uniqueDocs.has(doc.id)) {
            uniqueDocs.set(doc.id, {
                ...doc,
                matched_imei: item.imei
            })
        }
    })

    return Array.from(uniqueDocs.values())
}

/**
 * Gets a signed URL for viewing the PDF
 */
export async function getManifestUrl(storagePath: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .storage
        .from('manifests')
        .createSignedUrl(storagePath, 3600) // 1 hour valid

    if (error) return null
    return data.signedUrl
}

/**
 * Deletes a manifest document and its associated file
 */
export async function deleteManifest(documentId: string, storagePath: string) {
    const supabase = await createClient()

    // 1. Verify ownership (RLS handles this but good to be explicit for storage)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // 2. Delete from Storage
    const { error: storageError } = await supabase
        .storage
        .from('manifests')
        .remove([storagePath])

    if (storageError) {
        console.error('Storage Delete Error:', storageError)
        return { success: false, error: 'Failed to delete file from storage' }
    }

    // 3. Delete from Database (Cascades to IMEIs)
    const { error: dbError } = await supabase
        .from('manifest_documents')
        .delete()
        .eq('id', documentId)

    // Note: RLS checks org, but let's trust RLS 'USING' policy.
    // However, for delete, RLS is: 
    // USING (organization_id = ...)

    if (dbError) {
        console.error('DB Delete Error:', dbError)
        return { success: false, error: 'Failed to delete document record' }
    }

    revalidatePath('/manifests')
    return { success: true }
}

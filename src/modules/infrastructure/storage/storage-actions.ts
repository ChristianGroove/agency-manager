"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// ============================================
// TYPES
// ============================================

export interface StorageStatus {
    allowed: boolean
    currentUsageBytes: number
    limitBytes: number
    remainingBytes: number
    usagePercentage: number
    // Formatted for display
    currentUsageFormatted: string
    limitFormatted: string
    remainingFormatted: string
}

interface StorageLimitResult {
    allowed: boolean
    current_usage_bytes: number
    limit_bytes: number
    remaining_bytes: number
    usage_percentage: number
}

interface CalculateStorageResult {
    total_bytes: number
    file_count: number
}

// ============================================
// HELPERS
// ============================================

function formatBytes(bytes: number): string {
    if (bytes === -1 || bytes >= 9223372036854775807) return "Ilimitado"
    if (bytes === 0) return "0 B"

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// ============================================
// GET STORAGE STATUS
// ============================================

export async function getStorageStatus(
    organizationId: string
): Promise<StorageStatus | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .rpc('check_storage_limit', {
            p_organization_id: organizationId,
            p_file_size_bytes: 0
        })
        .single()

    if (error || !data) {
        console.error('Error checking storage status:', error)
        return null
    }

    const result = data as StorageLimitResult

    return {
        allowed: result.allowed,
        currentUsageBytes: result.current_usage_bytes,
        limitBytes: result.limit_bytes,
        remainingBytes: result.remaining_bytes,
        usagePercentage: result.usage_percentage,
        currentUsageFormatted: formatBytes(result.current_usage_bytes),
        limitFormatted: formatBytes(result.limit_bytes),
        remainingFormatted: formatBytes(result.remaining_bytes)
    }
}

// ============================================
// VALIDATE BEFORE UPLOAD
// ============================================

export async function validateStorageLimit(
    organizationId: string,
    fileSizeBytes: number
): Promise<{ allowed: boolean; message?: string }> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .rpc('check_storage_limit', {
            p_organization_id: organizationId,
            p_file_size_bytes: fileSizeBytes
        })
        .single()

    if (error || !data) {
        console.error('Error validating storage:', error)
        // Fail open - allow if we can't check
        return { allowed: true }
    }

    const result = data as StorageLimitResult

    if (!result.allowed) {
        const remaining = formatBytes(result.remaining_bytes)
        const requested = formatBytes(fileSizeBytes)
        return {
            allowed: false,
            message: `Límite de almacenamiento alcanzado. Espacio disponible: ${remaining}. Archivo: ${requested}`
        }
    }

    return { allowed: true }
}

// ============================================
// TRACK UPLOAD (Call after successful upload)
// ============================================

export async function trackStorageUpload(
    organizationId: string,
    fileSizeBytes: number
): Promise<{ success: boolean }> {
    const { error } = await supabaseAdmin
        .rpc('increment_storage_usage', {
            p_organization_id: organizationId,
            p_bytes: fileSizeBytes
        })

    if (error) {
        console.error('Error tracking upload:', error)
        return { success: false }
    }

    return { success: true }
}

// ============================================
// TRACK DELETE (Call after successful delete)
// ============================================

export async function trackStorageDelete(
    organizationId: string,
    fileSizeBytes: number
): Promise<{ success: boolean }> {
    const { error } = await supabaseAdmin
        .rpc('decrement_storage_usage', {
            p_organization_id: organizationId,
            p_bytes: fileSizeBytes
        })

    if (error) {
        console.error('Error tracking delete:', error)
        return { success: false }
    }

    return { success: true }
}

// ============================================
// RECALCULATE STORAGE (Admin function)
// ============================================

export async function recalculateStorage(
    organizationId: string
): Promise<{ totalBytes: number; fileCount: number } | null> {
    const { data, error } = await supabaseAdmin
        .rpc('calculate_org_storage', {
            p_organization_id: organizationId
        })
        .single()

    if (error || !data) {
        console.error('Error recalculating storage:', error)
        return null
    }

    const result = data as CalculateStorageResult

    return {
        totalBytes: result.total_bytes,
        fileCount: result.file_count
    }
}

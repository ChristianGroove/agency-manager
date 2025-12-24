"use server"

import { createClient } from "@/lib/supabase-server"
import { Emitter } from "@/types/billing"
import { unstable_noStore as noStore, revalidatePath } from "next/cache"

export async function getEmitters() {
    noStore()
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('emitters')
        .select('*')
        .order('is_default', { ascending: false }) // Default first
        .order('display_name', { ascending: true })

    if (error) {
        console.error('Error fetching emitters:', error)
        return []
    }

    return data as Emitter[]
}

export async function getActiveEmitters() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('emitters')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })

    if (error) {
        console.error('Error fetching active emitters:', error)
        return []
    }

    return data as Emitter[]
}

export async function createEmitter(emitterData: Partial<Emitter>) {
    const supabase = await createClient()

    // If making this one default, unset others first
    if (emitterData.is_default) {
        await supabase
            .from('emitters')
            .update({ is_default: false })
            .neq('id', '00000000-0000-0000-0000-000000000000') // Safety
    }

    const { data, error } = await supabase
        .from('emitters')
        .insert(emitterData)
        .select()
        .single()

    if (error) return { error: error.message }

    revalidatePath('/settings')
    return { data }
}

export async function updateEmitter(id: string, emitterData: Partial<Emitter>) {
    const supabase = await createClient()

    if (emitterData.is_default) {
        await supabase
            .from('emitters')
            .update({ is_default: false })
            .neq('id', id)
    }

    const { data, error } = await supabase
        .from('emitters')
        .update(emitterData)
        .eq('id', id)
        .select()
        .single()

    if (error) return { error: error.message }

    revalidatePath('/settings')
    return { data }
}

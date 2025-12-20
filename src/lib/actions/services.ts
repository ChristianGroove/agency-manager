"use client"

import { supabase } from "@/lib/supabase"
import { Service } from "@/types"

export async function getServices(clientId: string) {
    const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching services:", error)
        return []
    }

    return data as Service[]
}

export async function createService(service: Partial<Service>) {
    const { data, error } = await supabase
        .from('services')
        .insert(service)
        .select()
        .single()

    if (error) throw error
    return data as Service
}

export async function updateService(id: string, updates: Partial<Service>) {
    const { data, error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as Service
}

export async function deleteService(id: string) {
    const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id)

    if (error) throw error
}

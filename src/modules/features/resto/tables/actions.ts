'use server'

import { createClient } from "@/modules/core/database/supabase-server"
import { RestoTable, RestoZone, VisualElement } from "./store/use-tables-store"
import { revalidatePath } from "next/cache"

export async function getZonesAndTables(orgId: string) {
    const supabase = await createClient()

    const [zonesResponse, tablesResponse] = await Promise.all([
        supabase.from('resto_zones').select('*').eq('organization_id', orgId).order('created_at', { ascending: true }),
        supabase.from('resto_tables').select('*').eq('organization_id', orgId)
    ])

    return {
        zones: zonesResponse.data as RestoZone[] || [],
        tables: tablesResponse.data as RestoTable[] || [],
        error: zonesResponse.error?.message || tablesResponse.error?.message
    }
}

export async function saveLayout(orgId: string, zone: RestoZone, tables: RestoTable[]) {
    const supabase = await createClient()
    
    // 1. Upsert Zone
    const zoneData = {
        organization_id: orgId,
        name: zone.name,
        grid_width: zone.grid_width,
        grid_height: zone.grid_height,
        visual_elements: zone.visual_elements,
        background_style: zone.background_style || 'dots'
    }

    let zoneId = zone.id
    const isNewZone = zone.id.startsWith('temp_')

    if (isNewZone) {
        const { data: newZone, error: zoneError } = await supabase
            .from('resto_zones')
            .insert(zoneData)
            .select('id')
            .single()
            
        if (zoneError) return { success: false, error: zoneError.message }
        zoneId = newZone.id
    } else {
        const { error: zoneError } = await supabase
            .from('resto_zones')
            .update(zoneData)
            .eq('id', zone.id)
            
        if (zoneError) return { success: false, error: zoneError.message }
    }

    // 2. Upsert Tables
    // Separate new vs existing tables
    const tablesToInsert = tables.filter(t => t.id.startsWith('temp_') || t.isNew).map(t => ({
        organization_id: orgId,
        zone_id: zoneId,
        table_identifier: t.table_identifier,
        capacity: t.capacity,
        shape: t.shape,
        pos_x: t.pos_x,
        pos_y: t.pos_y,
        width: t.width,
        height: t.height,
        rotation: t.rotation,
        status: t.status === 'available' ? 'available' : t.status // ensure valid enum
    }))

    const tablesToUpdate = tables.filter(t => !t.id.startsWith('temp_') && !t.isNew)

    // Run sequentially to avoid Promise type issues and ensure reliability
    const errors: string[] = []
    let insertedTables: RestoTable[] = []

    if (tablesToInsert.length > 0) {
         const { data, error } = await supabase.from('resto_tables').insert(tablesToInsert).select('*')
         if (error) errors.push(error.message)
         else if (data) insertedTables = data as RestoTable[]
    }

    for (const table of tablesToUpdate) {
        const { error } = await supabase.from('resto_tables').update({
            table_identifier: table.table_identifier,
            capacity: table.capacity,
            shape: table.shape,
            pos_x: table.pos_x,
            pos_y: table.pos_y,
            width: table.width,
            height: table.height,
            rotation: table.rotation
        }).eq('id', table.id)
        
        if (error) errors.push(error.message)
    }

    // 3. Delete tables that no longer exist in the layout
    const existingTableIds = tables
        .filter(t => !t.id.startsWith('temp_') && !t.isNew)
        .map(t => t.id)

    // Fetch all current table IDs for this zone from DB
    const { data: dbTables } = await supabase
        .from('resto_tables')
        .select('id')
        .eq('zone_id', zoneId)

    if (dbTables && dbTables.length > 0) {
        const idsToDelete = dbTables
            .map(t => t.id)
            .filter(id => !existingTableIds.includes(id))

        if (idsToDelete.length > 0) {
            const { error } = await supabase
                .from('resto_tables')
                .delete()
                .in('id', idsToDelete)
            if (error) errors.push(error.message)
        }
    }

    if (errors.length > 0) {
        console.error("Errors saving layout:", errors)
        return { success: false, error: errors.join(', ') }
    }

    revalidatePath('/dashboard/resto-tables')
    revalidatePath('/dashboard/resto-orders')
    return { success: true, zoneId, insertedTables }
}

export async function deleteZone(zoneId: string) {
    const supabase = await createClient()

    // Delete all tables in zone first
    const { error: tablesError } = await supabase
        .from('resto_tables')
        .delete()
        .eq('zone_id', zoneId)

    if (tablesError) return { success: false, error: tablesError.message }

    // Delete zone
    const { error: zoneError } = await supabase
        .from('resto_zones')
        .delete()
        .eq('id', zoneId)

    if (zoneError) return { success: false, error: zoneError.message }

    revalidatePath('/dashboard/resto-tables')
    revalidatePath('/dashboard/resto-orders')
    return { success: true }
}

export async function updateTableStatus(tableId: string, status: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('resto_tables')
        .update({ status })
        .eq('id', tableId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/resto-tables')
    revalidatePath('/dashboard/resto-orders')
    return { success: true }
}

export async function renameZone(zoneId: string, name: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('resto_zones')
        .update({ name })
        .eq('id', zoneId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/resto-tables')
    return { success: true }
}

"use server"

import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { startOfDay, startOfWeek, startOfMonth } from "date-fns"

// ─── Types ───────────────────────────────────────────────────────────

export interface WaiterDashboard {
    staff: any
    zones: any[]
    tables: any[]
    activeSessions: any[]
    todayOrders: any[]
    todayTips: number
    totalTipsToday: number
}

export interface TipsBySession {
    sessionId: string
    tableIdentifier: string | null
    tipAmount: number
    date: string
}

export interface WaiterTipsSummary {
    totalTips: number
    tipCount: number
    tipsBySession: TipsBySession[]
}

// ─── Token Validation Helper ─────────────────────────────────────────

async function validateStaffToken(token: string) {
    const { data: staff, error } = await supabaseAdmin
        .from('organization_staff')
        .select('*')
        .eq('access_token', token)
        .is('is_active', true)
        .maybeSingle()

    if (error || !staff) {
        throw new Error('Token inválido o personal inactivo')
    }

    return staff
}

// ─── Get Waiter Dashboard ────────────────────────────────────────────

export async function getWaiterDashboard(token: string): Promise<WaiterDashboard> {
    try {
        const staff = await validateStaffToken(token)

        // 1. Fetch zone assignments with zone details
        const { data: zoneAssignments } = await supabaseAdmin
            .from('resto_staff_zone_assignments')
            .select('*, resto_zones(*)')
            .eq('staff_id', staff.id)

        const zones = (zoneAssignments || []).map((za: any) => za.resto_zones).filter(Boolean)
        const zoneIds = zones.map((z: any) => z.id)

        // 2. Fetch tables in those zones
        let tables: any[] = []
        if (zoneIds.length > 0) {
            const { data: zoneTables } = await supabaseAdmin
                .from('resto_tables')
                .select('*')
                .in('zone_id', zoneIds)
                .eq('organization_id', staff.organization_id)

            tables = zoneTables || []
        }

        const tableIds = tables.map((t: any) => t.id)

        const todayStart = startOfDay(new Date())
        const todayISO = todayStart.toISOString()

        // 3. Fetch active sessions for those tables where waiter_id matches, opened TODAY
        let activeSessions: any[] = []
        if (tableIds.length > 0) {
            const { data: sessions } = await supabaseAdmin
                .from('resto_table_sessions')
                .select(`
                    *,
                    resto_tables!resto_table_sessions_table_id_fkey (id, table_identifier, zone_id)
                `)
                .eq('waiter_id', staff.id)
                .neq('status', 'closed')
                .gte('opened_at', todayISO)
                .in('table_id', tableIds)
                .order('opened_at', { ascending: false })

            activeSessions = sessions || []
        }

        // 4. Fetch today's orders for those sessions
        const sessionIds = activeSessions.map((s: any) => s.id)
        let todayOrders: any[] = []

        if (sessionIds.length > 0) {
            const { data: orders } = await supabaseAdmin
                .from('resto_orders')
                .select('*')
                .in('session_id', sessionIds)
                .gte('created_at', todayISO)
                .order('created_at', { ascending: false })

            todayOrders = orders || []
        }

        // 5. Calculate today's tips: all orders in sessions where waiter_id = staff.id, created today
        let todayTips = 0
        const { data: tipSessions } = await supabaseAdmin
            .from('resto_table_sessions')
            .select('id')
            .eq('waiter_id', staff.id)
            .gte('opened_at', todayISO)

        if (tipSessions && tipSessions.length > 0) {
            const tipSessionIds = tipSessions.map((s: any) => s.id)
            const { data: tipOrders } = await supabaseAdmin
                .from('resto_orders')
                .select('tip_amount')
                .in('session_id', tipSessionIds)

            todayTips = (tipOrders || []).reduce(
                (sum: number, o: any) => sum + (Number(o.tip_amount) || 0), 0
            )
        }

        return {
            staff,
            zones,
            tables,
            activeSessions,
            todayOrders,
            todayTips,
            totalTipsToday: todayTips
        }
    } catch (error: any) {
        console.error('[getWaiterDashboard] Error:', error)
        throw error
    }
}

// ─── Get Waiter Tips Summary ─────────────────────────────────────────

export async function getWaiterTipsSummary(
    token: string,
    period: 'today' | 'week' | 'month'
): Promise<WaiterTipsSummary> {
    try {
        const staff = await validateStaffToken(token)

        const now = new Date()
        let periodStart: Date

        switch (period) {
            case 'today':
                periodStart = startOfDay(now)
                break
            case 'week':
                periodStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
                break
            case 'month':
                periodStart = startOfMonth(now)
                break
        }

        const periodISO = periodStart.toISOString()

        // Fetch sessions for this waiter within the period
        const { data: sessions } = await supabaseAdmin
            .from('resto_table_sessions')
            .select(`
                id, opened_at,
                resto_tables!resto_table_sessions_table_id_fkey (table_identifier)
            `)
            .eq('waiter_id', staff.id)
            .gte('opened_at', periodISO)

        if (!sessions || sessions.length === 0) {
            return { totalTips: 0, tipCount: 0, tipsBySession: [] }
        }

        const sessionIds = sessions.map((s: any) => s.id)

        // Fetch orders with tips for those sessions
        const { data: orders } = await supabaseAdmin
            .from('resto_orders')
            .select('session_id, tip_amount, created_at')
            .in('session_id', sessionIds)
            .gt('tip_amount', 0)

        if (!orders || orders.length === 0) {
            return { totalTips: 0, tipCount: 0, tipsBySession: [] }
        }

        // Build session lookup for table identifiers
        const sessionLookup = new Map<string, any>()
        for (const s of sessions) {
            sessionLookup.set(s.id, s)
        }

        // Aggregate tips by session
        const tipsBySessionMap = new Map<string, { tipAmount: number; date: string; tableIdentifier: string | null }>()

        for (const order of orders) {
            const tip = Number(order.tip_amount) || 0
            const existing = tipsBySessionMap.get(order.session_id)
            const session = sessionLookup.get(order.session_id)
            const tables = session?.resto_tables
            const tableIdentifier = Array.isArray(tables) ? tables[0]?.table_identifier : tables?.table_identifier || null

            if (existing) {
                existing.tipAmount += tip
            } else {
                tipsBySessionMap.set(order.session_id, {
                    tipAmount: tip,
                    date: order.created_at,
                    tableIdentifier
                })
            }
        }

        const tipsBySession: TipsBySession[] = Array.from(tipsBySessionMap.entries()).map(
            ([sessionId, data]) => ({
                sessionId,
                tableIdentifier: data.tableIdentifier,
                tipAmount: data.tipAmount,
                date: data.date
            })
        )

        const totalTips = tipsBySession.reduce((sum, t) => sum + t.tipAmount, 0)

        return {
            totalTips,
            tipCount: tipsBySession.length,
            tipsBySession
        }
    } catch (error: any) {
        console.error('[getWaiterTipsSummary] Error:', error)
        throw error
    }
}

// ─── Admin Staff & Zone Management Server Actions ───────────────────

export async function getStaffWithZoneAssignments(orgId: string) {
    try {
        const { data: staffList, error: staffError } = await supabaseAdmin
            .from('organization_staff')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })

        if (staffError) {
            console.error('[getStaffWithZoneAssignments] staffError:', staffError)
            return { success: false, error: staffError.message, staffList: [], assignments: [] }
        }

        let assignments: any[] = []
        try {
            const { data: assignData, error: assignError } = await supabaseAdmin
                .from('resto_staff_zone_assignments')
                .select('*')
                .eq('organization_id', orgId)

            if (!assignError && assignData) {
                assignments = assignData
            } else if (assignError) {
                console.warn('[getStaffWithZoneAssignments] Table missing or query error:', assignError.message)
            }
        } catch (e) {
            console.warn('[getStaffWithZoneAssignments] Exception when querying resto_staff_zone_assignments:', e)
        }

        return {
            success: true,
            staffList: staffList || [],
            assignments
        }
    } catch (error: any) {
        console.error('[getStaffWithZoneAssignments] Error:', error)
        return { success: true, staffList: [], assignments: [] }
    }
}

async function getUniquePinForOrg(orgId: string, requestedPin?: string): Promise<string> {
    const { data: existingStaff } = await supabaseAdmin
        .from('organization_staff')
        .select('id, pin_code')
        .eq('organization_id', orgId)

    const usedPins = new Set((existingStaff || []).map(s => s.pin_code).filter(Boolean))

    if (requestedPin && requestedPin.trim()) {
        const trimmed = requestedPin.trim()
        if (usedPins.has(trimmed)) {
            throw new Error(`El PIN ${trimmed} ya está en uso por otro colaborador. Elige un PIN único.`)
        }
        return trimmed
    }

    // Auto-generate random unique 4-digit PIN
    let attempts = 0
    while (attempts < 100) {
        const candidate = Math.floor(1000 + Math.random() * 9000).toString()
        if (!usedPins.has(candidate)) {
            return candidate
        }
        attempts++
    }
    return Math.floor(1000 + Math.random() * 9000).toString()
}

export async function createStaffMember(
    orgId: string,
    payload: {
        firstName: string
        lastName?: string
        role: string
        phone?: string
        pinCode?: string
    }
) {
    try {
        const pinCode = await getUniquePinForOrg(orgId, payload.pinCode)
        const accessToken = crypto.randomUUID()

        const { data: staff, error } = await supabaseAdmin
            .from('organization_staff')
            .insert({
                organization_id: orgId,
                first_name: payload.firstName.trim(),
                last_name: payload.lastName?.trim() || null,
                role: payload.role || 'waiter',
                phone: payload.phone?.trim() || null,
                pin_code: pinCode,
                access_token: accessToken,
                is_active: true
            })
            .select()
            .single()

        if (error) throw error

        return { success: true, staff }
    } catch (error: any) {
        console.error('[createStaffMember] Error:', error)
        return { success: false, error: error.message || 'Error al crear colaborador' }
    }
}

export async function updateStaffPin(
    orgId: string,
    staffId: string,
    newPin: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const trimmed = newPin.trim()
        if (!trimmed || trimmed.length < 4) {
            return { success: false, error: 'El PIN debe tener al menos 4 dígitos' }
        }

        // Check uniqueness across all staff in org
        const { data: existing } = await supabaseAdmin
            .from('organization_staff')
            .select('id')
            .eq('organization_id', orgId)
            .eq('pin_code', trimmed)
            .neq('id', staffId)
            .maybeSingle()

        if (existing) {
            return { success: false, error: `El PIN ${trimmed} ya está asignado a otro colaborador.` }
        }

        const { error } = await supabaseAdmin
            .from('organization_staff')
            .update({ pin_code: trimmed })
            .eq('id', staffId)
            .eq('organization_id', orgId)

        if (error) throw error

        return { success: true }
    } catch (error: any) {
        console.error('[updateStaffPin] Error:', error)
        return { success: false, error: error.message || 'Error al actualizar PIN' }
    }
}

export async function switchStaffByPin(
    orgId: string,
    pin: string
): Promise<{ success: boolean; staff?: any; token?: string; error?: string }> {
    try {
        const trimmedPin = pin.trim()
        if (!trimmedPin) {
            return { success: false, error: 'Ingresa tu PIN de 4 dígitos' }
        }

        const { data: staff, error } = await supabaseAdmin
            .from('organization_staff')
            .select('*')
            .eq('organization_id', orgId)
            .eq('pin_code', trimmedPin)
            .is('is_active', true)
            .maybeSingle()

        if (error || !staff) {
            return { success: false, error: 'PIN incorrecto o usuario no encontrado' }
        }

        return {
            success: true,
            staff,
            token: staff.access_token
        }
    } catch (error: any) {
        console.error('[switchStaffByPin] Error:', error)
        return { success: false, error: error.message || 'Error al validar PIN' }
    }
}

export async function toggleStaffZoneAssignment(
    orgId: string,
    staffId: string,
    zoneId: string,
    currentlyAssigned: boolean
) {
    try {
        if (currentlyAssigned) {
            // Remove assignment
            const { error: delError } = await supabaseAdmin
                .from('resto_staff_zone_assignments')
                .delete()
                .eq('organization_id', orgId)
                .eq('staff_id', staffId)
                .eq('zone_id', zoneId)

            if (delError) {
                if (delError.code === 'PGRST204' || delError.message?.includes('schema cache') || delError.message?.includes('does not exist')) {
                    return {
                        success: false,
                        error: "La tabla 'resto_staff_zone_assignments' no está creada en la base de datos de Supabase. Ejecuta la migración 20260726000000_create_resto_staff_system.sql en Supabase."
                    }
                }
                throw delError
            }
        } else {
            // Add assignment
            let existing: any[] = []
            try {
                const { data } = await supabaseAdmin
                    .from('resto_staff_zone_assignments')
                    .select('id')
                    .eq('staff_id', staffId)
                existing = data || []
            } catch (e) {
                // Ignore missing table check
            }

            const isPrimary = existing.length === 0

            const { error: insError } = await supabaseAdmin
                .from('resto_staff_zone_assignments')
                .upsert({
                    organization_id: orgId,
                    staff_id: staffId,
                    zone_id: zoneId,
                    is_primary: isPrimary
                }, { onConflict: 'staff_id,zone_id' })

            if (insError) {
                if (insError.code === 'PGRST204' || insError.message?.includes('schema cache') || insError.message?.includes('does not exist')) {
                    return {
                        success: false,
                        error: "La tabla 'resto_staff_zone_assignments' no está creada en la base de datos de Supabase. Ejecuta la migración 20260726000000_create_resto_staff_system.sql en Supabase."
                    }
                }
                throw insError
            }

            // Auto-assign ONLY unassigned active sessions in this zone (don't hijack in-progress sessions!)
            try {
                const { data: zoneTables } = await supabaseAdmin
                    .from('resto_tables')
                    .select('id')
                    .eq('zone_id', zoneId)
                    .eq('organization_id', orgId)

                if (zoneTables && zoneTables.length > 0) {
                    const tableIds = zoneTables.map(t => t.id)
                    await supabaseAdmin
                        .from('resto_table_sessions')
                        .update({ waiter_id: staffId })
                        .in('table_id', tableIds)
                        .is('waiter_id', null)
                        .neq('status', 'closed')
                }
            } catch (e) {
                console.warn("[toggleStaffZoneAssignment] Auto-session update skipped:", e)
            }
        }

        return { success: true }
    } catch (error: any) {
        console.error('[toggleStaffZoneAssignment] Error:', error)
        return { success: false, error: error.message || 'Error al actualizar asignación de zona' }
    }
}

export async function toggleStaffActiveStatus(
    orgId: string,
    staffId: string,
    currentIsActive: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const newStatus = !currentIsActive
        const { error } = await supabaseAdmin
            .from('organization_staff')
            .update({ is_active: newStatus })
            .eq('id', staffId)
            .eq('organization_id', orgId)

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        console.error('[toggleStaffActiveStatus] Error:', error)
        return { success: false, error: error.message || 'Error al cambiar estado' }
    }
}

export async function regenerateStaffToken(
    orgId: string,
    staffId: string
): Promise<{ success: boolean; newToken?: string; error?: string }> {
    try {
        const newToken = crypto.randomUUID()
        const { error } = await supabaseAdmin
            .from('organization_staff')
            .update({ access_token: newToken })
            .eq('id', staffId)
            .eq('organization_id', orgId)

        if (error) throw error
        return { success: true, newToken }
    } catch (error: any) {
        console.error('[regenerateStaffToken] Error:', error)
        return { success: false, error: error.message || 'Error al regenerar token' }
    }
}

export async function deleteStaffMember(
    orgId: string,
    staffId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabaseAdmin
            .from('organization_staff')
            .delete()
            .eq('id', staffId)
            .eq('organization_id', orgId)

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        console.error('[deleteStaffMember] Error:', error)
        return { success: false, error: error.message || 'Error al eliminar colaborador' }
    }
}

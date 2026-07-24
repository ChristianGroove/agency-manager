"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { revalidatePath } from "next/cache"

// ─── Types ───────────────────────────────────────────────────────────
export interface GroupedOrder {
    // Identifiers
    id: string                      // session_id for dine_in groups, order_id for individual
    type: 'session' | 'individual'  // grouped dine-in session vs individual delivery/pickup

    // Display
    clientName: string              // Lead name or "Invitado"
    tableIdentifier: string | null  // e.g. "M-01" for dine-in
    restoMode: 'dine_in' | 'delivery' | 'pickup'
    roundCount: number              // 1 for individual, N for sessions

    // Financials
    total: number                   // accumulated session total or individual order total
    tipAmount: number
    paymentStatus: 'unpaid' | 'payment_pending' | 'paid'

    // Kitchen
    kitchenStatus: string           // worst status across rounds (pending > preparing > ready > completed)
    
    // Timestamps
    createdAt: string               // earliest order in the group
    lastOrderAt: string             // latest order in the group

    // Session data (only for type='session')
    sessionId: string | null
    sessionStatus: string | null    // 'active' | 'payment_pending' | 'closed'

    // Delivery data (only for type='individual')
    deliveryAddress: string | null
    customerNotes: string | null

    // Nested orders (for detail view)
    orders: any[]
}

// Kitchen status priority (lower = more urgent)
const KITCHEN_PRIORITY: Record<string, number> = {
    pending: 0,
    preparing: 1,
    ready: 2,
    completed: 3,
    cancelled: 4
}

// ─── Fetch Raw Orders with JOINs ────────────────────────────────────
export async function getRestoOrders() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('resto_orders')
        .select(`
            *,
            leads (
                name,
                phone
            )
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching resto orders:", error)
        return []
    }

    return data
}

// ─── Fetch Grouped Orders (Session-based for dine-in) ───────────────
export async function getGroupedOrders(): Promise<GroupedOrder[]> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    const supabase = await createClient()

    // Fetch all orders with lead info
    const { data: orders, error: ordersError } = await supabase
        .from('resto_orders')
        .select(`
            *,
            leads ( name, phone )
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

    if (ordersError || !orders) {
        console.error("Error fetching resto orders:", ordersError)
        return []
    }

    // Fetch active/pending sessions with table info
    const { data: sessions } = await supabase
        .from('resto_table_sessions')
        .select(`
            id, table_id, status, total_accumulated, payment_status, payment_method, opened_at, closed_at, guest_count,
            resto_tables!resto_table_sessions_table_id_fkey ( id, table_identifier )
        `)
        .eq('organization_id', orgId)
        .order('opened_at', { ascending: false })

    // Build session lookup
    const sessionMap = new Map<string, any>()
    for (const s of sessions || []) {
        sessionMap.set(s.id, s)
    }

    // Also fetch all tables for fallback table_id → table_identifier mapping
    const { data: allTables } = await supabase
        .from('resto_tables')
        .select('id, table_identifier')
        .eq('organization_id', orgId)

    const tableMap = new Map<string, string>()
    for (const t of allTables || []) {
        tableMap.set(t.id, t.table_identifier)
    }

    // ─── Group dine-in orders by session_id ─────────────────────────
    const sessionGroups = new Map<string, any[]>()
    const individualOrders: any[] = []

    for (const order of orders) {
        if (order.resto_mode === 'dine_in' && order.session_id) {
            const group = sessionGroups.get(order.session_id) || []
            group.push(order)
            sessionGroups.set(order.session_id, group)
        } else {
            individualOrders.push(order)
        }
    }

    const grouped: GroupedOrder[] = []

    // ─── Process session groups ─────────────────────────────────────
    for (const [sessionId, sessionOrders] of sessionGroups) {
        const session = sessionMap.get(sessionId)
        const sortedOrders = sessionOrders.sort(
            (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )

        // Resolve table identifier
        let tableIdentifier: string | null = null
        if (session?.resto_tables) {
            const tables = Array.isArray(session.resto_tables) ? session.resto_tables : [session.resto_tables]
            tableIdentifier = tables[0]?.table_identifier || null
        }
        if (!tableIdentifier && session?.table_id) {
            tableIdentifier = tableMap.get(session.table_id) || null
        }
        // Fallback: try to resolve from order.table_id
        if (!tableIdentifier && sortedOrders[0]?.table_id) {
            tableIdentifier = tableMap.get(sortedOrders[0].table_id) || null
        }

        // Aggregate total from orders (more reliable than session.total_accumulated which may lag)
        const ordersTotal = sortedOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0)
        const totalTip = sortedOrders.reduce((sum: number, o: any) => sum + (Number(o.tip_amount) || 0), 0)

        // Determine worst kitchen status
        const worstKitchen = sortedOrders.reduce((worst: string, o: any) => {
            const currentPrio = KITCHEN_PRIORITY[o.kitchen_status] ?? 3
            const worstPrio = KITCHEN_PRIORITY[worst] ?? 3
            return currentPrio < worstPrio ? o.kitchen_status : worst
        }, 'completed')

        // Determine payment status
        let paymentStatus: 'unpaid' | 'payment_pending' | 'paid' = 'unpaid'
        if (session) {
            if (session.status === 'closed' || session.payment_status === 'paid') {
                paymentStatus = 'paid'
            } else if (session.status === 'payment_pending') {
                paymentStatus = 'payment_pending'
            }
        } else {
            // No session found, check if all orders are paid
            const allPaid = sortedOrders.every((o: any) => o.payment_status === 'paid')
            if (allPaid) paymentStatus = 'paid'
        }

        // Get client name from lead if any order has one
        const leadOrder = sortedOrders.find((o: any) => o.leads?.name)
        const clientName = leadOrder?.leads?.name || 'Invitado'

        grouped.push({
            id: sessionId,
            type: 'session',
            clientName,
            tableIdentifier,
            restoMode: 'dine_in',
            roundCount: sortedOrders.length,
            total: session?.total_accumulated ? Number(session.total_accumulated) : ordersTotal,
            tipAmount: totalTip,
            paymentStatus,
            kitchenStatus: worstKitchen,
            createdAt: sortedOrders[0].created_at,
            lastOrderAt: sortedOrders[sortedOrders.length - 1].created_at,
            sessionId,
            sessionStatus: session?.status || null,
            deliveryAddress: null,
            customerNotes: null,
            orders: sortedOrders
        })
    }

    // ─── Process individual orders (delivery/pickup/orphan dine-in) ──
    for (const order of individualOrders) {
        // Resolve table identifier for orphan dine-in
        let tableIdentifier: string | null = null
        if (order.resto_mode === 'dine_in' && order.table_id) {
            tableIdentifier = tableMap.get(order.table_id) || null
        }

        grouped.push({
            id: order.id,
            type: 'individual',
            clientName: order.leads?.name || 'Invitado',
            tableIdentifier,
            restoMode: order.resto_mode,
            roundCount: 1,
            total: Number(order.total) || 0,
            tipAmount: Number(order.tip_amount) || 0,
            paymentStatus: order.payment_status === 'paid' ? 'paid' : 'unpaid',
            kitchenStatus: order.kitchen_status,
            createdAt: order.created_at,
            lastOrderAt: order.created_at,
            sessionId: order.session_id || null,
            sessionStatus: null,
            deliveryAddress: order.delivery_address || null,
            customerNotes: order.customer_notes || null,
            orders: [order]
        })
    }

    // Sort by most recent activity
    grouped.sort((a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime())

    return grouped
}

// ─── Update Kitchen Status ──────────────────────────────────────────
export async function updateRestoOrderStatus(orderId: string, newStatus: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "Unauthorized" }

    const supabase = await createClient()

    const { error } = await supabase
        .from('resto_orders')
        .update({ kitchen_status: newStatus })
        .eq('id', orderId)
        .eq('organization_id', orgId)

    if (error) {
        console.error("Error updating resto order status:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/resto-orders')
    return { success: true }
}

// ─── Mark Session as Paid & Release Table ───────────────────────────
export async function markSessionPaid(sessionId: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "Unauthorized" }

    const supabase = supabaseAdmin

    try {
        const { data: session, error: sessionError } = await supabase
            .from('resto_table_sessions')
            .select('id, table_id')
            .eq('id', sessionId)
            .eq('organization_id', orgId)
            .single()

        if (sessionError || !session) throw new Error("Sesión no encontrada")

        // 1. Close session
        await supabase.from('resto_table_sessions').update({
            status: 'closed',
            closed_at: new Date().toISOString(),
            payment_status: 'paid'
        }).eq('id', sessionId)

        // 2. Release table
        await supabase.from('resto_tables').update({
            status: 'available',
            current_session_id: null
        }).eq('id', session.table_id)

        // 3. Mark all orders as paid
        await supabase.from('resto_orders').update({
            payment_status: 'paid'
        }).eq('session_id', sessionId)

        revalidatePath('/resto-orders')
        return { success: true }
    } catch (error: any) {
        console.error("Error marking session paid:", error)
        return { success: false, error: error.message }
    }
}

// ─── Admin Force Request Bill ───────────────────────────────────────
export async function forceRequestBill(sessionId: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "Unauthorized" }

    const supabase = supabaseAdmin

    try {
        const { data: session, error: sessionError } = await supabase
            .from('resto_table_sessions')
            .select('id, table_id, status')
            .eq('id', sessionId)
            .eq('organization_id', orgId)
            .single()

        if (sessionError || !session) throw new Error("Sesión no encontrada")
        if (session.status === 'closed') throw new Error("La sesión ya está cerrada")

        // Transition to payment_pending
        await supabase.from('resto_table_sessions').update({
            status: 'payment_pending'
        }).eq('id', sessionId)

        // Update table to billing
        await supabase.from('resto_tables').update({
            status: 'billing'
        }).eq('id', session.table_id)

        revalidatePath('/resto-orders')
        return { success: true }
    } catch (error: any) {
        console.error("Error forcing bill request:", error)
        return { success: false, error: error.message }
    }
}

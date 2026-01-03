'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"

export type DateFilter = 'today' | 'yesterday' | 'week' | 'month'

/**
 * Get accumulated debt for a staff member (all unpaid hours since last settlement)
 * This is mode-agnostic and calculates total owed regardless of date filters
 */
export async function getStaffAccumulatedDebt(staffId: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { totalHours: 0, totalEarned: 0, totalPaid: 0, amountOwed: 0 }

    try {
        // Get all unsettled work logs for this staff
        const { data: workLogs, error: logsError } = await supabase
            .from('staff_work_logs')
            .select('total_hours, calculated_amount')
            .eq('organization_id', orgId)
            .eq('staff_id', staffId)
            .is('settled_at', null) // Only unsettled hours

        if (logsError) throw logsError

        // Sum up total hours and earnings
        const totalHours = workLogs?.reduce((sum, log) => sum + parseFloat(log.total_hours), 0) || 0
        const totalEarned = workLogs?.reduce((sum, log) => sum + parseFloat(log.calculated_amount), 0) || 0

        // Get total paid amount for this staff
        const { data: payments, error: paymentsError } = await supabase
            .from('staff_payments')
            .select('amount')
            .eq('organization_id', orgId)
            .eq('staff_id', staffId)

        if (paymentsError) throw paymentsError

        const totalPaid = payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0

        // Calculate actual owed amount
        const amountOwed = totalEarned - totalPaid

        return {
            totalHours: Math.round(totalHours * 10) / 10,
            totalEarned: Math.round(totalEarned * 100) / 100,
            totalPaid: Math.round(totalPaid * 100) / 100,
            amountOwed: Math.round(amountOwed * 100) / 100
        }
    } catch (error: any) {
        console.error('Error calculating accumulated debt:', error)
        return { totalHours: 0, totalEarned: 0, totalPaid: 0, amountOwed: 0 }
    }
}

/**
 * Get payroll summary with support for hybrid modes
 * @param filter - Date filter for period mode (ignored in debt mode)
 * @param mode - 'period' for historical view or 'debt' for accumulated debt
 */
export async function getStaffPayrollSummary(filter: DateFilter = 'month', mode: 'period' | 'debt' = 'debt') {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    // Calculate date range based on filter (only used in period mode)
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (filter) {
        case 'today':
            startDate = startOfDay(now)
            endDate = endOfDay(now)
            break
        case 'yesterday':
            const yesterday = subDays(now, 1)
            startDate = startOfDay(yesterday)
            endDate = endOfDay(yesterday)
            break
        case 'week':
            startDate = startOfWeek(now, { weekStartsOn: 1 }) // Monday
            endDate = endOfWeek(now, { weekStartsOn: 1 })
            break
        case 'month':
            startDate = startOfMonth(now)
            endDate = endOfMonth(now)
            break
        default:
            startDate = startOfMonth(now)
            endDate = endOfMonth(now)
    }

    try {
        // Get all active staff
        const { data: staff, error: staffError } = await supabase
            .from('cleaning_staff_profiles')
            .select('id, first_name, last_name, email, avatar_url, hourly_rate')
            .eq('organization_id', orgId)
            .is('deleted_at', null)
            .eq('status', 'active')

        if (staffError) throw staffError
        if (!staff || staff.length === 0) return []

        // Aggregate data per staff
        const staffSummary = await Promise.all(staff.map(async (s) => {
            if (mode === 'debt') {
                // DEBT MODE: Calculate accumulated debt (ignore date filter)
                const debt = await getStaffAccumulatedDebt(s.id)

                return {
                    id: s.id,
                    name: `${s.first_name} ${s.last_name}`,
                    firstName: s.first_name,
                    lastName: s.last_name,
                    email: s.email,
                    avatar: s.avatar_url,
                    hourlyRate: parseFloat(s.hourly_rate),
                    totalHours: debt.totalHours,
                    totalEarned: debt.totalEarned,
                    amountOwed: debt.amountOwed,
                    status: debt.amountOwed > 0 ? 'debt' : 'clear',
                    hasActivity: debt.totalHours > 0
                }
            } else {
                // PERIOD MODE: Show data for specific date range
                const { data: workLogs } = await supabase
                    .from('staff_work_logs')
                    .select('total_hours, calculated_amount')
                    .eq('organization_id', orgId)
                    .eq('staff_id', s.id)
                    .gte('start_time', startDate.toISOString())
                    .lte('start_time', endDate.toISOString())

                const totalHours = workLogs?.reduce((sum, log) => sum + parseFloat(log.total_hours), 0) || 0
                const totalEarned = workLogs?.reduce((sum, log) => sum + parseFloat(log.calculated_amount), 0) || 0

                // IMPORTANT: Also calculate accumulated debt in period mode
                // This ensures debt is always visible regardless of mode
                const debt = await getStaffAccumulatedDebt(s.id)

                return {
                    id: s.id,
                    name: `${s.first_name} ${s.last_name}`,
                    firstName: s.first_name,
                    lastName: s.last_name,
                    email: s.email,
                    avatar: s.avatar_url,
                    hourlyRate: parseFloat(s.hourly_rate),
                    totalHours: Math.round(totalHours * 10) / 10, // Period hours
                    totalEarned: Math.round(totalEarned * 100) / 100, // Period earnings
                    amountOwed: debt.amountOwed, // ALWAYS show accumulated debt
                    status: debt.amountOwed > 0 ? 'debt' : 'clear',
                    hasActivity: totalHours > 0
                }
            }
        }))

        // Sort: debt first (in debt mode), then by amount owed/hours desc
        return staffSummary.sort((a, b) => {
            if (mode === 'debt') {
                if (a.status === 'debt' && b.status !== 'debt') return -1
                if (a.status !== 'debt' && b.status === 'debt') return 1
                return b.amountOwed - a.amountOwed
            } else {
                return b.totalHours - a.totalHours
            }
        })

    } catch (error: any) {
        console.error('Error fetching staff payroll summary:', error)
        return []
    }
}

/**
 * Get overall payroll stats for dashboard
 */
export async function getPayrollStats(filter: DateFilter = 'month', mode: 'period' | 'debt' = 'debt') {
    const summary = await getStaffPayrollSummary(filter, mode)

    const totalHours = summary.reduce((sum, s) => sum + s.totalHours, 0)
    const totalOwed = summary.reduce((sum, s) => sum + s.amountOwed, 0)
    const staffWithDebt = summary.filter(s => s.status === 'debt').length
    const activeStaff = summary.filter(s => s.hasActivity).length

    return {
        totalHours: Math.round(totalHours * 10) / 10,
        totalOwed: Math.round(totalOwed * 100) / 100,
        staffWithDebt,
        totalStaff: summary.length,
        activeStaff
    }
}

/**
 * Liquidate staff debt - settles all unpaid hours and creates payment record
 */
export async function liquidateStaffDebt(data: {
    staffId: string
    amount: number
    paymentMethod: string
    paymentDate: string
    notes?: string
}) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "No organization found" }

    try {
        // Get accumulated debt first
        const debt = await getStaffAccumulatedDebt(data.staffId)

        // Validate amount doesn't exceed debt
        if (data.amount > debt.amountOwed + 0.01) {
            return { success: false, error: "Payment amount exceeds total debt" }
        }

        // Create payment record (WITHOUT settlement_id since we're not using settlements anymore)
        const { data: payment, error: paymentError } = await supabase
            .from('staff_payments')
            .insert({
                organization_id: orgId,
                staff_id: data.staffId,
                amount: data.amount,
                payment_method: data.paymentMethod,
                payment_date: data.paymentDate,
                notes: data.notes || `Liquidación de ${debt.totalHours}h trabajadas`
            })
            .select()
            .single()

        if (paymentError) throw paymentError

        // Mark all unsettled work logs as settled
        const { error: updateError } = await supabase
            .from('staff_work_logs')
            .update({ settled_at: new Date().toISOString() })
            .eq('organization_id', orgId)
            .eq('staff_id', data.staffId)
            .is('settled_at', null)

        if (updateError) throw updateError

        return { success: true, paymentId: payment.id }
    } catch (error: any) {
        console.error('Error liquidating staff debt:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Quick pay - create payment and update settlements
 * @deprecated Use liquidateStaffDebt instead for new hybrid system
 */
export async function quickPayStaff(data: {
    staffId: string
    amount: number
    paymentMethod: string
    paymentDate: string
    notes?: string
}) {
    // Redirect to new liquidation system
    return await liquidateStaffDebt(data)
}

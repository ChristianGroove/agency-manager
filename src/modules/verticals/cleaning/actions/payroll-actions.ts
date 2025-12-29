'use server'

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"

const PAYROLL_PATH = "/cleaning/payroll"

// ============================================================================
// WORK LOGS - Time Tracking
// ============================================================================

/**
 * Auto-create work log from completed appointment
 * Called automatically when job status changes to 'completed'
 */
export async function createWorkLogFromAppointment(appointmentId: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "No organization found" }

    try {
        // Get appointment details
        const { data: appointment, error: aptError } = await supabase
            .from('appointments')
            .select('id, staff_id, start_time, end_time, service_vertical')
            .eq('id', appointmentId)
            .eq('status', 'completed')
            .single()

        if (aptError || !appointment) {
            return { success: false, error: "Appointment not found or not completed" }
        }

        // Only process cleaning jobs
        if (appointment.service_vertical !== 'cleaning') {
            return { success: true, message: "Not a cleaning job, skipping" }
        }

        // Skip if no staff assigned
        if (!appointment.staff_id) {
            return { success: true, message: "No staff assigned, skipping" }
        }

        // Get staff hourly rate
        const { data: staff, error: staffError } = await supabase
            .from('cleaning_staff_profiles')
            .select('hourly_rate')
            .eq('id', appointment.staff_id)
            .single()

        if (staffError || !staff) {
            return { success: false, error: "Staff not found" }
        }

        // Check if work log already exists for this appointment
        const { data: existing } = await supabase
            .from('staff_work_logs')
            .select('id')
            .eq('appointment_id', appointmentId)
            .single()

        if (existing) {
            return { success: true, message: "Work log already exists" }
        }

        // Create work log
        const { error: insertError } = await supabase
            .from('staff_work_logs')
            .insert({
                organization_id: orgId,
                staff_id: appointment.staff_id,
                appointment_id: appointmentId,
                start_time: appointment.start_time,
                end_time: appointment.end_time,
                hourly_rate: staff.hourly_rate,
                log_type: 'auto'
            })

        if (insertError) throw insertError

        revalidatePath(PAYROLL_PATH)
        return { success: true }
    } catch (error: any) {
        console.error('Error creating work log:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Get work logs for a staff member
 */
export async function getStaffWorkLogs(
    staffId: string,
    startDate?: string,
    endDate?: string
) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    let query = supabase
        .from('staff_work_logs')
        .select(`
            *,
            staff:cleaning_staff_profiles(first_name, last_name),
            appointment:appointments(title, client_id)
        `)
        .eq('organization_id', orgId)
        .eq('staff_id', staffId)
        .order('start_time', { ascending: false })

    if (startDate) {
        query = query.gte('start_time', startDate)
    }
    if (endDate) {
        query = query.lte('start_time', endDate)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching work logs:', error)
        return []
    }

    return data || []
}

/**
 * Create manual work log
 */
export async function createManualWorkLog(data: {
    staffId: string
    startTime: string
    endTime: string
    notes?: string
}) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "No organization found" }

    try {
        // Get staff hourly rate
        const { data: staff, error: staffError } = await supabase
            .from('cleaning_staff_profiles')
            .select('hourly_rate')
            .eq('id', data.staffId)
            .single()

        if (staffError || !staff) {
            return { success: false, error: "Staff not found" }
        }

        const { error } = await supabase
            .from('staff_work_logs')
            .insert({
                organization_id: orgId,
                staff_id: data.staffId,
                start_time: data.startTime,
                end_time: data.endTime,
                hourly_rate: staff.hourly_rate,
                log_type: 'manual',
                notes: data.notes
            })

        if (error) throw error

        revalidatePath(PAYROLL_PATH)
        return { success: true }
    } catch (error: any) {
        console.error('Error creating manual work log:', error)
        return { success: false, error: error.message }
    }
}

// ============================================================================
// PAYROLL PERIODS - Period Management
// ============================================================================

/**
 * Create new payroll period
 */
export async function createPayrollPeriod(data: {
    periodStart: string
    periodEnd: string
    periodName: string
    periodType?: 'weekly' | 'biweekly' | 'monthly'
}) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "No organization found" }

    try {
        const { error } = await supabase
            .from('staff_payroll_periods')
            .insert({
                organization_id: orgId,
                period_start: data.periodStart,
                period_end: data.periodEnd,
                period_name: data.periodName,
                period_type: data.periodType || 'biweekly',
                status: 'open'
            })

        if (error) throw error

        revalidatePath(PAYROLL_PATH)
        return { success: true }
    } catch (error: any) {
        console.error('Error creating payroll period:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Get all payroll periods
 */
export async function getPayrollPeriods() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('staff_payroll_periods')
        .select('*')
        .eq('organization_id', orgId)
        .order('period_start', { ascending: false })

    if (error) {
        console.error('Error fetching payroll periods:', error)
        return []
    }

    return data || []
}

/**
 * Get single payroll period with settlements
 */
export async function getPayrollPeriod(periodId: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return null

    const { data, error } = await supabase
        .from('staff_payroll_periods')
        .select(`
            *,
            settlements:staff_payroll_settlements(
                *,
                staff:cleaning_staff_profiles(first_name, last_name, email)
            )
        `)
        .eq('id', periodId)
        .eq('organization_id', orgId)
        .single()

    if (error) {
        console.error('Error fetching payroll period:', error)
        return null
    }

    return data
}

// ============================================================================
// PAYROLL PROCESSING - Calculate and Create Settlements
// ============================================================================

/**
 * Process payroll for a period - Create settlements for all staff
 */
export async function processPayrollPeriod(periodId: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "No organization found" }

    try {
        // Get period details
        const { data: period, error: periodError } = await supabase
            .from('staff_payroll_periods')
            .select('*')
            .eq('id', periodId)
            .eq('organization_id', orgId)
            .single()

        if (periodError || !period) {
            return { success: false, error: "Period not found" }
        }

        if (period.status !== 'open') {
            return { success: false, error: "Period is not open" }
        }

        // Get all work logs for this period
        const { data: workLogs, error: logsError } = await supabase
            .from('staff_work_logs')
            .select('staff_id, total_hours, calculated_amount, hourly_rate')
            .eq('organization_id', orgId)
            .gte('start_time', period.period_start)
            .lte('start_time', period.period_end)

        if (logsError) throw logsError

        if (!workLogs || workLogs.length === 0) {
            return { success: false, error: "No work logs found for this period" }
        }

        // Group by staff and calculate totals
        const staffSummaries = workLogs.reduce((acc: any, log) => {
            if (!acc[log.staff_id]) {
                acc[log.staff_id] = {
                    staff_id: log.staff_id,
                    total_hours: 0,
                    total_amount: 0,
                    hourly_rate: log.hourly_rate // Use most recent rate
                }
            }
            acc[log.staff_id].total_hours += parseFloat(log.total_hours)
            acc[log.staff_id].total_amount += parseFloat(log.calculated_amount)
            return acc
        }, {})

        // Create settlements for each staff
        const settlements = Object.values(staffSummaries).map((summary: any) => ({
            organization_id: orgId,
            payroll_period_id: periodId,
            staff_id: summary.staff_id,
            total_hours: summary.total_hours,
            hourly_rate: summary.hourly_rate,
            base_amount: summary.total_amount,
            payment_status: 'pending'
        }))

        const { error: insertError } = await supabase
            .from('staff_payroll_settlements')
            .insert(settlements)

        if (insertError) throw insertError

        // Update period status and totals
        await supabase.rpc('calculate_period_totals', { period_id: periodId })

        await supabase
            .from('staff_payroll_periods')
            .update({
                status: 'processing',
                processed_at: new Date().toISOString()
            })
            .eq('id', periodId)

        revalidatePath(PAYROLL_PATH)
        return { success: true, settlementsCount: settlements.length }
    } catch (error: any) {
        console.error('Error processing payroll:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Get all settlements for a period
 */
export async function getPayrollSettlements(periodId: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('staff_payroll_settlements')
        .select(`
            *,
            staff:cleaning_staff_profiles(first_name, last_name, email),
            payments:staff_payments(amount, payment_date, payment_method)
        `)
        .eq('payroll_period_id', periodId)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching settlements:', error)
        return []
    }

    return data || []
}

/**
 * Update settlement adjustments (bonuses/deductions)
 */
export async function updateSettlement(
    settlementId: string,
    data: {
        bonuses?: number
        deductions?: number
        notes?: string
    }
) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('staff_payroll_settlements')
            .update({
                bonuses: data.bonuses,
                deductions: data.deductions,
                notes: data.notes,
                updated_at: new Date().toISOString()
            })
            .eq('id', settlementId)

        if (error) throw error

        revalidatePath(PAYROLL_PATH)
        return { success: true }
    } catch (error: any) {
        console.error('Error updating settlement:', error)
        return { success: false, error: error.message }
    }
}

// ============================================================================
// PAYMENTS - Register Payments
// ============================================================================

/**
 * Register payment for a settlement
 */
export async function registerPayment(
    settlementId: string,
    data: {
        amount: number
        paymentMethod: string
        paymentDate: string
        referenceNumber?: string
        bankName?: string
        accountLast4?: string
        notes?: string
    }
) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "No organization found" }

    try {
        // Get settlement to validate amount and get staff_id
        const { data: settlement, error: settlementError } = await supabase
            .from('staff_payroll_settlements')
            .select('staff_id, amount_owed')
            .eq('id', settlementId)
            .single()

        if (settlementError || !settlement) {
            return { success: false, error: "Settlement not found" }
        }

        if (data.amount > parseFloat(settlement.amount_owed) + 0.01) {
            return { success: false, error: "Payment amount exceeds amount owed" }
        }

        // Create payment record
        const { error } = await supabase
            .from('staff_payments')
            .insert({
                organization_id: orgId,
                settlement_id: settlementId,
                staff_id: settlement.staff_id,
                amount: data.amount,
                payment_method: data.paymentMethod,
                payment_date: data.paymentDate,
                reference_number: data.referenceNumber,
                bank_name: data.bankName,
                account_last_4: data.accountLast4,
                notes: data.notes
            })

        if (error) throw error

        // Trigger will auto-update settlement payment_status and amount_paid

        revalidatePath(PAYROLL_PATH)
        return { success: true }
    } catch (error: any) {
        console.error('Error registering payment:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Get payments for a settlement
 */
export async function getSettlementPayments(settlementId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('staff_payments')
        .select('*')
        .eq('settlement_id', settlementId)
        .order('payment_date', { ascending: false })

    if (error) {
        console.error('Error fetching payments:', error)
        return []
    }

    return data || []
}

/**
 * Get all payments for a staff member
 */
export async function getStaffPayments(staffId: string, limit?: number) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    let query = supabase
        .from('staff_payments')
        .select(`
            *,
            settlement:staff_payroll_settlements(
                payroll_period_id,
                period:staff_payroll_periods(period_name)
            )
        `)
        .eq('organization_id', orgId)
        .eq('staff_id', staffId)
        .order('payment_date', { ascending: false })

    if (limit) {
        query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching staff payments:', error)
        return []
    }

    return data || []
}

// ============================================================================
// REPORTS - Analytics and Summaries
// ============================================================================

/**
 * Get staff payroll summary for a year
 */
export async function getStaffPayrollSummary(staffId: string, year: number) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return null

    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    const { data: settlements, error } = await supabase
        .from('staff_payroll_settlements')
        .select(`
            *,
            payments:staff_payments(amount, payment_date)
        `)
        .eq('organization_id', orgId)
        .eq('staff_id', staffId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)

    if (error) {
        console.error('Error fetching staff summary:', error)
        return null
    }

    // Calculate totals
    const totalHours = settlements.reduce((sum, s) => sum + parseFloat(s.total_hours), 0)
    const totalEarned = settlements.reduce((sum, s) => sum + parseFloat(s.final_amount), 0)
    const totalPaid = settlements.reduce((sum, s) => sum + parseFloat(s.amount_paid), 0)
    const totalOwed = totalEarned - totalPaid

    return {
        year,
        totalHours,
        totalEarned,
        totalPaid,
        totalOwed,
        settlements
    }
}

/**
 * Get organization payroll stats for date range
 */
export async function getOrganizationPayrollStats(startDate: string, endDate: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return null

    const { data: settlements, error } = await supabase
        .from('staff_payroll_settlements')
        .select('*')
        .eq('organization_id', orgId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)

    if (error) {
        console.error('Error fetching org stats:', error)
        return null
    }

    const totalStaff = new Set(settlements.map(s => s.staff_id)).size
    const totalHours = settlements.reduce((sum, s) => sum + parseFloat(s.total_hours), 0)
    const totalPayroll = settlements.reduce((sum, s) => sum + parseFloat(s.final_amount), 0)
    const totalPaid = settlements.reduce((sum, s) => sum + parseFloat(s.amount_paid), 0)
    const totalOwed = totalPayroll - totalPaid

    const pendingCount = settlements.filter(s => s.payment_status === 'pending').length
    const partialCount = settlements.filter(s => s.payment_status === 'partial').length
    const paidCount = settlements.filter(s => s.payment_status === 'paid').length

    return {
        totalStaff,
        totalHours,
        totalPayroll,
        totalPaid,
        totalOwed,
        pendingCount,
        partialCount,
        paidCount
    }
}

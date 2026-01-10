'use server'

import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

export interface Task {
    id: string
    lead_id: string
    title: string
    description?: string
    type: 'follow_up' | 'call' | 'meeting' | 'email' | 'other'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    due_date: string
    completed_at?: string
    reminder_at?: string
    assigned_to?: string
    created_by?: string
    created_at: string
    // Joined fields
    lead_name?: string
    assignee_name?: string
}

// Helper to get current user's org
async function getContext() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

    return data ? { userId: user.id, orgId: data.organization_id } : null
}

export async function createTask(data: {
    lead_id: string
    title: string
    description?: string
    type?: string
    priority?: string
    due_date: string
    assigned_to?: string
    reminder_at?: string
}) {
    try {
        const ctx = await getContext()
        if (!ctx) return { success: false, error: 'Unauthorized' }

        const { data: task, error } = await supabaseAdmin
            .from('crm_tasks')
            .insert({
                organization_id: ctx.orgId,
                lead_id: data.lead_id,
                title: data.title,
                description: data.description,
                type: data.type || 'follow_up',
                priority: data.priority || 'medium',
                due_date: data.due_date,
                assigned_to: data.assigned_to || ctx.userId,
                created_by: ctx.userId,
                reminder_at: data.reminder_at
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/crm')
        return { success: true, task }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function updateTask(taskId: string, data: Partial<{
    title: string
    description: string
    type: string
    priority: string
    status: string
    due_date: string
    assigned_to: string
    completed_at: string
}>) {
    try {
        const ctx = await getContext()
        if (!ctx) return { success: false, error: 'Unauthorized' }

        // If marking as completed, set completed_at
        if (data.status === 'completed' && !data.completed_at) {
            data.completed_at = new Date().toISOString()
        }

        const { error } = await supabaseAdmin
            .from('crm_tasks')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('id', taskId)
            .eq('organization_id', ctx.orgId) // Security

        if (error) throw error

        revalidatePath('/crm')
        return { success: true }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function deleteTask(taskId: string) {
    try {
        const ctx = await getContext()
        if (!ctx) return { success: false, error: 'Unauthorized' }

        const { error } = await supabaseAdmin
            .from('crm_tasks')
            .delete()
            .eq('id', taskId)
            .eq('organization_id', ctx.orgId)

        if (error) throw error

        revalidatePath('/crm')
        return { success: true }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function completeTask(taskId: string) {
    return updateTask(taskId, { status: 'completed', completed_at: new Date().toISOString() })
}

export async function getTasksForLead(leadId: string): Promise<{ success: boolean, tasks?: Task[], error?: string }> {
    try {
        const ctx = await getContext()
        if (!ctx) return { success: false, error: 'Unauthorized' }

        const { data, error } = await supabaseAdmin
            .from('crm_tasks')
            .select('*')
            .eq('lead_id', leadId)
            .eq('organization_id', ctx.orgId)
            .order('due_date', { ascending: true })

        if (error) throw error

        return { success: true, tasks: data as Task[] }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function getMyTasks(filters?: {
    status?: string
    showOverdue?: boolean
}): Promise<{ success: boolean, tasks?: Task[], error?: string }> {
    try {
        const ctx = await getContext()
        if (!ctx) return { success: false, error: 'Unauthorized' }

        let query = supabaseAdmin
            .from('crm_tasks')
            .select(`
                *,
                lead:leads(id, name)
            `)
            .eq('organization_id', ctx.orgId)
            .eq('assigned_to', ctx.userId)
            .order('due_date', { ascending: true })

        if (filters?.status) {
            query = query.eq('status', filters.status)
        } else {
            // Default: show pending and in_progress
            query = query.in('status', ['pending', 'in_progress'])
        }

        if (filters?.showOverdue) {
            query = query.lt('due_date', new Date().toISOString())
        }

        const { data, error } = await query

        if (error) throw error

        // Transform to include lead_name
        const tasks = data?.map(t => ({
            ...t,
            lead_name: (t.lead as any)?.name || 'Sin nombre'
        })) as Task[]

        return { success: true, tasks }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function getTodaysTasks(): Promise<{ success: boolean, tasks?: Task[], error?: string }> {
    try {
        const ctx = await getContext()
        if (!ctx) return { success: false, error: 'Unauthorized' }

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const { data, error } = await supabaseAdmin
            .from('crm_tasks')
            .select(`
                *,
                lead:leads(id, name)
            `)
            .eq('organization_id', ctx.orgId)
            .eq('assigned_to', ctx.userId)
            .in('status', ['pending', 'in_progress'])
            .gte('due_date', today.toISOString())
            .lt('due_date', tomorrow.toISOString())
            .order('due_date', { ascending: true })

        if (error) throw error

        const tasks = data?.map(t => ({
            ...t,
            lead_name: (t.lead as any)?.name || 'Sin nombre'
        })) as Task[]

        return { success: true, tasks }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function getOverdueTasks(): Promise<{ success: boolean, tasks?: Task[], count?: number, error?: string }> {
    try {
        const ctx = await getContext()
        if (!ctx) return { success: false, error: 'Unauthorized' }

        const { data, error, count } = await supabaseAdmin
            .from('crm_tasks')
            .select(`
                *,
                lead:leads(id, name)
            `, { count: 'exact' })
            .eq('organization_id', ctx.orgId)
            .eq('assigned_to', ctx.userId)
            .in('status', ['pending', 'in_progress'])
            .lt('due_date', new Date().toISOString())
            .order('due_date', { ascending: true })

        if (error) throw error

        const tasks = data?.map(t => ({
            ...t,
            lead_name: (t.lead as any)?.name || 'Sin nombre'
        })) as Task[]

        return { success: true, tasks, count: count || 0 }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function getTaskStats(): Promise<{ success: boolean, stats?: { pending: number, overdue: number, completedToday: number }, error?: string }> {
    try {
        const ctx = await getContext()
        if (!ctx) return { success: false, error: 'Unauthorized' }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Pending
        const { count: pending } = await supabaseAdmin
            .from('crm_tasks')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', ctx.orgId)
            .eq('assigned_to', ctx.userId)
            .eq('status', 'pending')

        // Overdue
        const { count: overdue } = await supabaseAdmin
            .from('crm_tasks')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', ctx.orgId)
            .eq('assigned_to', ctx.userId)
            .in('status', ['pending', 'in_progress'])
            .lt('due_date', new Date().toISOString())

        // Completed today
        const { count: completedToday } = await supabaseAdmin
            .from('crm_tasks')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', ctx.orgId)
            .eq('assigned_to', ctx.userId)
            .eq('status', 'completed')
            .gte('completed_at', today.toISOString())

        return {
            success: true,
            stats: {
                pending: pending || 0,
                overdue: overdue || 0,
                completedToday: completedToday || 0
            }
        }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

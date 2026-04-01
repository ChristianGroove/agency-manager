'use server'

import { createClient } from '@/lib/supabase-server'
import { getCurrentOrganizationId } from '@/modules/core/organizations/actions'
import { revalidatePath } from 'next/cache'
import { CRMTasksLegacyService } from './logic/services/crm-tasks-legacy.service'

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

async function getService() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    const { data: { user } } = await supabase.auth.getUser()
    if (!orgId || !user) throw new Error("Unauthorized")
    return new CRMTasksLegacyService(supabase, orgId, user.id)
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
        const service = await getService()
        const task = await service.createTask(data)
        revalidatePath('/crm')
        return { success: true, task }
    } catch (error: any) {
        return { success: false, error: String(error.message || error) }
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
        const service = await getService()
        await service.updateTask(taskId, data)
        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: String(error.message || error) }
    }
}

export async function deleteTask(taskId: string) {
    try {
        const service = await getService()
        await service.deleteTask(taskId)
        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: String(error.message || error) }
    }
}

export async function completeTask(taskId: string) {
    return updateTask(taskId, { status: 'completed' })
}

export async function getTasksForLead(leadId: string) {
    try {
        const service = await getService()
        const tasks = await service.getTasksForLead(leadId)
        return { success: true, tasks: tasks as Task[] }
    } catch (error: any) {
        return { success: false, error: String(error.message || error) }
    }
}

export async function getMyTasks(filters?: {
    status?: string
    showOverdue?: boolean
}) {
    try {
        const service = await getService()
        const tasks = await service.getMyTasks(filters)
        return { success: true, tasks: tasks as Task[] }
    } catch (error: any) {
        return { success: false, error: String(error.message || error) }
    }
}

export async function getTodaysTasks() {
    try {
        const service = await getService()
        const tasks = await service.getTodaysTasks()
        return { success: true, tasks: tasks as Task[] }
    } catch (error: any) {
        return { success: false, error: String(error.message || error) }
    }
}

export async function getOverdueTasks() {
    try {
        const service = await getService()
        const { tasks, count } = await service.getOverdueTasks()
        return { success: true, tasks: tasks as Task[], count }
    } catch (error: any) {
        return { success: false, error: String(error.message || error) }
    }
}

export async function getTaskStats() {
    try {
        const service = await getService()
        const stats = await service.getTaskStats()
        return { success: true, stats }
    } catch (error: any) {
        return { success: false, error: String(error.message || error) }
    }
}

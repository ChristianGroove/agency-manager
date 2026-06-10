'use server'

import { createClient } from '@/modules/core/database/supabase-server'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'
import { revalidatePath } from 'next/cache'
import { CRMTasksLegacyService } from "./services/crm-tasks-legacy.service"

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

const PUBLIC_TASK_ACTION_ERROR = "No se pudo completar la accion de tareas CRM"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function getTaskErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return error.message
    }
    if (typeof error === 'string') return error
    return ''
}

function summarizeTaskError(error: unknown) {
    if (error instanceof Error) return { name: error.name }

    if (error && typeof error === 'object') {
        return {
            code: (error as any).code,
            status: (error as any).status,
            statusCode: (error as any).statusCode,
            hasMessage: typeof (error as any).message === 'string' && (error as any).message.length > 0,
        }
    }

    return { type: typeof error }
}

function logTaskError(label: string, error: unknown) {
    console.error(label, isDeployedRuntime() ? summarizeTaskError(error) : error)
}

function taskActionFailure(label: string, error: unknown) {
    logTaskError(label, error)
    const message = getTaskErrorMessage(error)
    if (isDeployedRuntime()) {
        return { success: false, error: message === 'Unauthorized' ? message : PUBLIC_TASK_ACTION_ERROR }
    }
    return { success: false, error: message || PUBLIC_TASK_ACTION_ERROR }
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
        return taskActionFailure('Error creating CRM task:', error)
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
        return taskActionFailure('Error updating CRM task:', error)
    }
}

export async function deleteTask(taskId: string) {
    try {
        const service = await getService()
        await service.deleteTask(taskId)
        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        return taskActionFailure('Error deleting CRM task:', error)
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
        return taskActionFailure('Error fetching lead CRM tasks:', error)
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
        return taskActionFailure('Error fetching my CRM tasks:', error)
    }
}

export async function getTodaysTasks() {
    try {
        const service = await getService()
        const tasks = await service.getTodaysTasks()
        return { success: true, tasks: tasks as Task[] }
    } catch (error: any) {
        return taskActionFailure('Error fetching today CRM tasks:', error)
    }
}

export async function getOverdueTasks() {
    try {
        const service = await getService()
        const { tasks, count } = await service.getOverdueTasks()
        return { success: true, tasks: tasks as Task[], count }
    } catch (error: any) {
        return taskActionFailure('Error fetching overdue CRM tasks:', error)
    }
}

export async function getTaskStats() {
    try {
        const service = await getService()
        const stats = await service.getTaskStats()
        return { success: true, stats }
    } catch (error: any) {
        return taskActionFailure('Error fetching CRM task stats:', error)
    }
}


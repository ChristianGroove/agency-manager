'use server'

import { revalidatePath } from "next/cache"
import * as HostingService from "./services/hosting-service"

export async function getHostingAccounts() {
    try {
        return await HostingService.getHostingAccounts()
    } catch (error) {
        console.error('[HostingActions.getHostingAccounts] Error:', error)
        return []
    }
}

export async function getContactOptions() {
    try {
        return await HostingService.getContactOptions()
    } catch (error) {
        console.error('[HostingActions.getContactOptions] Error:', error)
        return []
    }
}

export async function createHostingAccount(data: any) {
    try {
        const res = await HostingService.createHostingAccount(data)
        revalidatePath('/platform/hosting-accounts')
        return res
    } catch (error: any) {
        console.error('[HostingActions.createHostingAccount] Error:', error)
        throw new Error(error.message || 'Error al crear la cuenta de hosting')
    }
}

export async function updateHostingAccount(id: string, data: any) {
    try {
        const res = await HostingService.updateHostingAccount(id, data)
        revalidatePath('/platform/hosting-accounts')
        return res
    } catch (error: any) {
        console.error('[HostingActions.updateHostingAccount] Error:', error)
        throw new Error(error.message || 'Error al actualizar la cuenta de hosting')
    }
}

export async function deleteHostingAccount(id: string) {
    try {
        const res = await HostingService.deleteHostingAccount(id)
        revalidatePath('/platform/hosting-accounts')
        return res
    } catch (error: any) {
        console.error('[HostingActions.deleteHostingAccount] Error:', error)
        throw new Error(error.message || 'Error al eliminar la cuenta de hosting')
    }
}

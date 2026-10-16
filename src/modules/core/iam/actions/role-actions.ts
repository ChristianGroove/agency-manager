"use server"

import * as roleService from "../services/role-service"
import { revalidatePath } from "next/cache"

export async function createRole(role: any) {
    const res = await roleService.upsertRole(role)
    revalidatePath("/platform/settings")
    return res
}

export async function updateRole(role: any) {
    const res = await roleService.upsertRole(role)
    revalidatePath("/platform/settings")
    return res
}

export async function duplicateRole(roleId: string, customName?: string) {
    const res = await roleService.duplicateRole(roleId, customName)
    revalidatePath("/platform/settings")
    return res
}

export async function deleteRole(roleId: string) {
    const res = await roleService.deleteRole(roleId)
    revalidatePath("/platform/settings")
    return res
}

export async function removeRole(roleId: string) {
    const res = await roleService.deleteRole(roleId)
    revalidatePath("/platform/settings")
    return res
}

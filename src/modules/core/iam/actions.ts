"use server"

import { revalidatePath } from "next/cache"
import { upsertRole, deleteRole as serviceDeleteRole } from "./services/role-service"

export async function createRole(data: any) {
    const role = await upsertRole(data)
    revalidatePath('/platform/settings/roles')
    return role
}

export async function updateRole(data: any) {
    const role = await upsertRole(data)
    revalidatePath('/platform/settings/roles')
    return role
}

export async function deleteRole(roleId: string) {
    await serviceDeleteRole(roleId)
    revalidatePath('/platform/settings/roles')
}

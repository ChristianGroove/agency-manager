"use server"

import * as roleService from "../services/role-service"

export async function createRole(role: any) {
    return await roleService.upsertRole(role)
}

export async function updateRole(role: any) {
    return await roleService.upsertRole(role)
}

export async function deleteRole(roleId: string) {
    return await roleService.deleteRole(roleId)
}

export async function removeRole(roleId: string) {
    return await roleService.deleteRole(roleId)
}

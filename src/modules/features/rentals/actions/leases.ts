// ==============================================================================
// PIXY RENTFLOW PRO — LEASE MANAGEMENT SERVER ACTIONS
// Module: module_rentals (Real Estate Space)
// Path: src/modules/features/rentals/actions/leases.ts
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import * as RentalsService from "../services/rentals-service";
import { createLeaseSchema, updateLeaseSchema } from "../schemas/rentals.schema";
import type {
  PropertyLease,
  CreateLeaseInput,
  LeaseFilters,
  ActionResponse,
} from "../types/rentals.types";

/**
 * Server action to create a new property lease contract
 */
export async function createLeaseAction(
  input: CreateLeaseInput
): Promise<ActionResponse<PropertyLease>> {
  try {
    const validated = createLeaseSchema.safeParse(input);
    if (!validated.success) {
      const errorMsg = validated.error.issues.map((i) => i.message).join(", ");
      return { success: false, error: errorMsg };
    }

    const result = await RentalsService.createLease(validated.data as CreateLeaseInput);
    if (result.success) {
      revalidatePath("/rentals");
      revalidatePath("/portfolio");
    }
    return result;
  } catch (err: any) {
    console.error("[ACTION:createLeaseAction] Error:", err);
    return { success: false, error: err?.message || "Error al crear el contrato de arrendamiento" };
  }
}

/**
 * Server action to update an existing property lease contract
 */
export async function updateLeaseAction(
  id: string,
  updates: Partial<CreateLeaseInput>
): Promise<ActionResponse<PropertyLease>> {
  try {
    const validated = updateLeaseSchema.safeParse({ ...updates, id });
    if (!validated.success) {
      const errorMsg = validated.error.issues.map((i) => i.message).join(", ");
      return { success: false, error: errorMsg };
    }

    const result = await RentalsService.updateLease(id, updates);
    if (result.success) {
      revalidatePath("/rentals");
      revalidatePath("/portfolio");
    }
    return result;
  } catch (err: any) {
    console.error("[ACTION:updateLeaseAction] Error:", err);
    return { success: false, error: err?.message || "Error al actualizar el contrato de arrendamiento" };
  }
}

/**
 * Server action to terminate a lease contract and release the property back to available
 */
export async function terminateLeaseAction(
  id: string,
  notes?: string
): Promise<ActionResponse<PropertyLease>> {
  try {
    if (!id) {
      return { success: false, error: "ID de contrato requerido" };
    }

    const result = await RentalsService.terminateLease(id, notes);
    if (result.success) {
      revalidatePath("/rentals");
      revalidatePath("/portfolio");
    }
    return result;
  } catch (err: any) {
    console.error("[ACTION:terminateLeaseAction] Error:", err);
    return { success: false, error: err?.message || "Error al terminar el contrato de arrendamiento" };
  }
}

/**
 * Server action to query property leases with optional filters
 */
export async function getLeasesAction(
  filters?: LeaseFilters
): Promise<ActionResponse<PropertyLease[]>> {
  try {
    return await RentalsService.getLeases(filters);
  } catch (err: any) {
    console.error("[ACTION:getLeasesAction] Error:", err);
    return { success: false, error: err?.message || "Error al consultar los contratos" };
  }
}

/**
 * Server action to get single lease by ID with relations
 */
export async function getLeaseByIdAction(
  id: string
): Promise<ActionResponse<PropertyLease | null>> {
  try {
    if (!id) {
      return { success: false, error: "ID de contrato requerido" };
    }
    return await RentalsService.getLeaseById(id);
  } catch (err: any) {
    console.error("[ACTION:getLeaseByIdAction] Error:", err);
    return { success: false, error: err?.message || "Error al consultar el contrato" };
  }
}

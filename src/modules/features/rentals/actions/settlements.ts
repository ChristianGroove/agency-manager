// ==============================================================================
// PIXY RENTFLOW PRO — SETTLEMENT & BILLING SERVER ACTIONS
// Module: module_rentals (Real Estate Space)
// Path: src/modules/features/rentals/actions/settlements.ts
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import * as RentalsService from "../services/rentals-service";
import {
  recordTenantPaymentSchema,
  recordOwnerPayoutSchema,
  deductionItemSchema,
} from "../schemas/rentals.schema";
import type {
  PropertyLeaseSettlement,
  RecordTenantPaymentInput,
  RecordOwnerPayoutInput,
  DeductionInput,
  SettlementFilters,
  ActionResponse,
} from "../types/rentals.types";

/**
 * Server action to generate monthly settlements for active leases in a period (YYYY-MM)
 */
export async function generateMonthlySettlementsAction(
  period: string,
  leaseIds?: string[]
): Promise<ActionResponse<PropertyLeaseSettlement[]>> {
  try {
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return { success: false, error: "El periodo debe tener el formato YYYY-MM (ej. 2026-09)" };
    }

    const result = await RentalsService.generateMonthlySettlements(period, leaseIds);
    if (result.success) {
      revalidatePath("/rentals");
    }
    return result;
  } catch (err: any) {
    console.error("[ACTION:generateMonthlySettlementsAction] Error:", err);
    return { success: false, error: err?.message || "Error al generar las liquidaciones mensuales" };
  }
}

/**
 * Server action to record a payment received from a tenant
 */
export async function recordTenantPaymentAction(
  input: RecordTenantPaymentInput
): Promise<ActionResponse<PropertyLeaseSettlement>> {
  try {
    const validated = recordTenantPaymentSchema.safeParse(input);
    if (!validated.success) {
      const errorMsg = validated.error.issues.map((i) => i.message).join(", ");
      return { success: false, error: errorMsg };
    }

    const result = await RentalsService.recordTenantPayment(input);
    if (result.success) {
      revalidatePath("/rentals");
    }
    return result;
  } catch (err: any) {
    console.error("[ACTION:recordTenantPaymentAction] Error:", err);
    return { success: false, error: err?.message || "Error al registrar el pago del inquilino" };
  }
}

/**
 * Server action to record payout disbursement to a property owner
 */
export async function recordOwnerPayoutAction(
  input: RecordOwnerPayoutInput
): Promise<ActionResponse<PropertyLeaseSettlement>> {
  try {
    const validated = recordOwnerPayoutSchema.safeParse(input);
    if (!validated.success) {
      const errorMsg = validated.error.issues.map((i) => i.message).join(", ");
      return { success: false, error: errorMsg };
    }

    const result = await RentalsService.recordOwnerPayout(input);
    if (result.success) {
      revalidatePath("/rentals");
    }
    return result;
  } catch (err: any) {
    console.error("[ACTION:recordOwnerPayoutAction] Error:", err);
    return { success: false, error: err?.message || "Error al registrar la liquidación del propietario" };
  }
}

/**
 * Server action to add a maintenance or repair deduction item to a monthly settlement
 */
export async function addDeductionAction(
  settlementId: string,
  deduction: DeductionInput
): Promise<ActionResponse<PropertyLeaseSettlement>> {
  try {
    if (!settlementId) {
      return { success: false, error: "ID de liquidación requerido" };
    }

    const validatedDeduction = deductionItemSchema.safeParse(deduction);
    if (!validatedDeduction.success) {
      const errorMsg = validatedDeduction.error.issues.map((i) => i.message).join(", ");
      return { success: false, error: errorMsg };
    }

    const result = await RentalsService.addDeduction(settlementId, validatedDeduction.data as DeductionInput);
    if (result.success) {
      revalidatePath("/rentals");
    }
    return result;
  } catch (err: any) {
    console.error("[ACTION:addDeductionAction] Error:", err);
    return { success: false, error: err?.message || "Error al agregar la deducción" };
  }
}

/**
 * Server action to query monthly settlements with optional filters
 */
export async function getSettlementsAction(
  filters?: SettlementFilters
): Promise<ActionResponse<PropertyLeaseSettlement[]>> {
  try {
    return await RentalsService.getSettlements(filters);
  } catch (err: any) {
    console.error("[ACTION:getSettlementsAction] Error:", err);
    return { success: false, error: err?.message || "Error al consultar las liquidaciones" };
  }
}

"use server";

import { supabaseAdmin } from "@/modules/core/database/supabase-admin";
import { revalidatePath } from "next/cache";
import {
  hashPin,
  verifyPin,
  isValid6DigitPin,
} from "../utils/pin-crypto";
import {
  setPortalSessionCookie,
  clearPortalSessionCookie,
} from "../utils/session-cookie";
import type {
  VerifyPinResult,
  SetupPinResult,
  RemovePinResult,
} from "../types";

/**
 * Verifies a 6-digit PIN entered by the collaborator on the lockscreen.
 * On success, issues a secure HttpOnly session cookie.
 */
export async function verifyPortalPinAction(
  token: string,
  pin: string,
  rememberDevice: boolean = false
): Promise<VerifyPinResult> {
  try {
    if (!token || !pin) {
      return { success: false, error: "Token o PIN no proporcionado." };
    }

    const trimmedPin = pin.trim();
    if (!isValid6DigitPin(trimmedPin)) {
      return { success: false, error: "El PIN debe tener exactamente 6 dígitos numéricos." };
    }

    // 1. Fetch staff member
    const { data: staff, error } = await supabaseAdmin
      .from("organization_staff")
      .select("id, pin_code, is_active")
      .eq("access_token", token)
      .maybeSingle();

    if (error || !staff) {
      console.error("Portal security: Colaborador no encontrado:", error);
      return { success: false, error: "Colaborador no encontrado o enlace inválido." };
    }

    if (!staff.is_active) {
      return { success: false, error: "Este acceso se encuentra desactivado temporalmente." };
    }

    // If staff has no PIN configured, treat as unlocked
    if (!staff.pin_code) {
      await setPortalSessionCookie(token, staff.id, rememberDevice);
      return { success: true };
    }

    // 2. Cryptographically verify PIN
    const isValid = verifyPin(trimmedPin, staff.pin_code);

    if (!isValid) {
      return {
        success: false,
        error: "PIN incorrecto. Verifica los 6 dígitos e intenta de nuevo.",
      };
    }

    // 3. Issue session cookie
    await setPortalSessionCookie(token, staff.id, rememberDevice);

    try {
      revalidatePath(`/portal/tasks/${token}`);
    } catch {
      // Non-request context safe
    }

    return { success: true };
  } catch (err: any) {
    console.error("Portal security verifyPin error:", err);
    return {
      success: false,
      error: err.message || "Error al verificar el PIN. Intenta nuevamente.",
    };
  }
}

/**
 * Configures or changes the collaborator's 6-digit PIN.
 * If a PIN is already configured, requires currentPin verification.
 */
export async function setupPortalPinAction(
  token: string,
  newPin: string,
  currentPin?: string
): Promise<SetupPinResult> {
  try {
    if (!token) return { success: false, error: "Token no válido." };

    const trimmedNewPin = newPin.trim();
    if (!isValid6DigitPin(trimmedNewPin)) {
      return { success: false, error: "El nuevo PIN debe tener exactamente 6 dígitos numéricos." };
    }

    // 1. Fetch staff
    const { data: staff, error } = await supabaseAdmin
      .from("organization_staff")
      .select("id, pin_code, is_active")
      .eq("access_token", token)
      .maybeSingle();

    if (error || !staff) {
      return { success: false, error: "Colaborador no encontrado." };
    }

    // 2. If staff has existing PIN, verify current PIN
    if (staff.pin_code) {
      if (!currentPin) {
        return { success: false, error: "Debes ingresar tu PIN actual para cambiarlo." };
      }
      const isCurrentValid = verifyPin(currentPin.trim(), staff.pin_code);
      if (!isCurrentValid) {
        return { success: false, error: "El PIN actual ingresado es incorrecto." };
      }
    }

    // 3. Hash the new PIN with PBKDF2 + random salt
    const hashed = hashPin(trimmedNewPin);

    // 4. Persist in database
    const { error: updateErr } = await supabaseAdmin
      .from("organization_staff")
      .update({
        pin_code: hashed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", staff.id);

    if (updateErr) {
      console.error("Error updating pin_code in database:", updateErr);
      return { success: false, error: "No se pudo guardar el PIN en la base de datos." };
    }

    // 5. Update session cookie so collaborator remains unlocked
    await setPortalSessionCookie(token, staff.id, true);

    try {
      revalidatePath(`/portal/tasks/${token}`);
    } catch {
      // Non-request context
    }

    return { success: true };
  } catch (err: any) {
    console.error("Portal security setupPin error:", err);
    return {
      success: false,
      error: err.message || "Error al configurar el PIN.",
    };
  }
}

/**
 * Removes the 6-digit PIN, reverting the portal to direct-link access.
 * Requires verification of the current PIN.
 */
export async function removePortalPinAction(
  token: string,
  currentPin: string
): Promise<RemovePinResult> {
  try {
    if (!token) return { success: false, error: "Token no válido." };

    const { data: staff, error } = await supabaseAdmin
      .from("organization_staff")
      .select("id, pin_code")
      .eq("access_token", token)
      .maybeSingle();

    if (error || !staff) {
      return { success: false, error: "Colaborador no encontrado." };
    }

    if (staff.pin_code) {
      const isCurrentValid = verifyPin(currentPin.trim(), staff.pin_code);
      if (!isCurrentValid) {
        return { success: false, error: "El PIN actual es incorrecto." };
      }
    }

    // Clear pin_code in database
    const { error: updateErr } = await supabaseAdmin
      .from("organization_staff")
      .update({
        pin_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", staff.id);

    if (updateErr) {
      return { success: false, error: "Error al remover el PIN de la base de datos." };
    }

    // Clear session cookie
    await clearPortalSessionCookie(token);

    try {
      revalidatePath(`/portal/tasks/${token}`);
    } catch {
      // Non-request context
    }

    return { success: true };
  } catch (err: any) {
    console.error("Portal security removePin error:", err);
    return { success: false, error: err.message || "Error al desactivar el PIN." };
  }
}

/**
 * Immediately locks the portal session by deleting the HttpOnly cookie.
 */
export async function lockPortalSessionAction(token: string): Promise<{ success: boolean }> {
  try {
    await clearPortalSessionCookie(token);
    try {
      revalidatePath(`/portal/tasks/${token}`);
    } catch {
      // Non-request context
    }
    return { success: true };
  } catch (err) {
    console.error("Error locking portal session:", err);
    return { success: false };
  }
}

/**
 * PM / Admin action to reset a collaborator's PIN if they forgot it.
 * Clears the pin_code so the collaborator can access directly and configure a new one.
 */
export async function adminResetCollaboratorPinAction(
  staffId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!staffId) return { success: false, error: "ID de colaborador requerido." };

    const { data: staff, error: fetchErr } = await supabaseAdmin
      .from("organization_staff")
      .select("id, access_token, first_name, last_name")
      .eq("id", staffId)
      .single();

    if (fetchErr || !staff) {
      return { success: false, error: "Colaborador no encontrado." };
    }

    const { error: updateErr } = await supabaseAdmin
      .from("organization_staff")
      .update({
        pin_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", staffId);

    if (updateErr) {
      console.error("Error resetting staff pin_code:", updateErr);
      return { success: false, error: "No se pudo restablecer el PIN en la base de datos." };
    }

    if (staff.access_token) {
      await clearPortalSessionCookie(staff.access_token);
      try {
        revalidatePath(`/portal/tasks/${staff.access_token}`);
      } catch {
        // Non-request context
      }
    }

    try {
      revalidatePath("/operations/tasks");
    } catch {
      // Non-request context
    }

    return { success: true };
  } catch (err: any) {
    console.error("adminResetCollaboratorPinAction error:", err);
    return { success: false, error: err.message || "Error al restablecer el PIN." };
  }
}

/**
 * PM / Admin action to assign a temporary 6-digit PIN to a collaborator.
 */
export async function adminSetCollaboratorPinAction(
  staffId: string,
  newPin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!staffId) return { success: false, error: "ID de colaborador requerido." };

    const trimmed = newPin.trim();
    if (!isValid6DigitPin(trimmed)) {
      return { success: false, error: "El PIN debe tener exactamente 6 dígitos numéricos." };
    }

    const hashed = hashPin(trimmed);

    const { data: staff, error: updateErr } = await supabaseAdmin
      .from("organization_staff")
      .update({
        pin_code: hashed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", staffId)
      .select("access_token")
      .single();

    if (updateErr) {
      return { success: false, error: "Error al actualizar el PIN del colaborador." };
    }

    if (staff?.access_token) {
      await clearPortalSessionCookie(staff.access_token);
      try {
        revalidatePath(`/portal/tasks/${staff.access_token}`);
      } catch {
        // Non-request context
      }
    }

    try {
      revalidatePath("/operations/tasks");
    } catch {
      // Non-request context
    }

    return { success: true };
  } catch (err: any) {
    console.error("adminSetCollaboratorPinAction error:", err);
    return { success: false, error: err.message || "Error al asignar el PIN." };
  }
}

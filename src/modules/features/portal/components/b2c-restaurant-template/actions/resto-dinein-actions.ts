"use server"

import { createClient } from "@/modules/core/database/supabase-server";
import { supabaseAdmin } from "@/modules/core/database/supabase-admin";

export interface DineInValidationResult {
    success: boolean;
    tableId?: string;
    tableIdentifier?: string;
    sessionId?: string;
    error?: string;
}

export async function validateTableQR(orgId: string, qrToken: string): Promise<DineInValidationResult> {
    const supabase = supabaseAdmin;

    try {
        // 1. Fetch table info
        const { data: table, error: tableError } = await supabase
            .from('resto_tables')
            .select('*')
            .eq('organization_id', orgId)
            .eq('qr_token', qrToken)
            .single();

        if (tableError || !table) {
            console.error("[validateTableQR] Table not found or error:", tableError);
            return { success: false, error: 'Mesa no encontrada o QR inválido.' };
        }

        // 2. Si la mesa está disponible, iniciar sesión
        if (table.status === 'available' || !table.current_session_id) {
            // Crear nueva sesión
            const { data: session, error: sessionError } = await supabase
                .from('resto_table_sessions')
                .insert({
                    organization_id: orgId,
                    table_id: table.id,
                    status: 'active'
                })
                .select('id')
                .single();

            if (sessionError || !session) {
                console.error("[validateTableQR] Error creating session:", sessionError);
                return { success: false, error: 'No se pudo iniciar la sesión en la mesa.' };
            }

            // Actualizar mesa a ocupada y asignar session_id
            const { error: updateError } = await supabase
                .from('resto_tables')
                .update({
                    status: 'occupied',
                    current_session_id: session.id
                })
                .eq('id', table.id);

            if (updateError) {
                console.error("[validateTableQR] Error updating table status:", updateError);
                return { success: false, error: 'Error al actualizar el estado de la mesa.' };
            }

            return {
                success: true,
                tableId: table.id,
                tableIdentifier: table.table_identifier,
                sessionId: session.id
            };
        }

        // 3. Si la mesa ya está ocupada o facturando, unirse a la sesión existente
        if (table.status === 'occupied' || table.status === 'billing') {
            return {
                success: true,
                tableId: table.id,
                tableIdentifier: table.table_identifier,
                sessionId: table.current_session_id
            };
        }

        // Si está reservada o en limpieza
        if (table.status === 'cleaning') {
             return { success: false, error: 'La mesa se está limpiando, por favor espera un momento.' };
        }

        if (table.status === 'reserved') {
            // Asumimos que si escanea, la reclama
             const { data: session, error: sessionError } = await supabase
                .from('resto_table_sessions')
                .insert({
                    organization_id: orgId,
                    table_id: table.id,
                    status: 'active'
                })
                .select('id')
                .single();

            if (!sessionError && session) {
                 await supabase.from('resto_tables').update({ status: 'occupied', current_session_id: session.id }).eq('id', table.id);
                 return { success: true, tableId: table.id, tableIdentifier: table.table_identifier, sessionId: session.id };
            }
        }

        return { success: false, error: `Estado de mesa no permitido (${table.status}).` };

    } catch (err: any) {
        console.error("[validateTableQR] Internal error:", err);
        return { success: false, error: 'Error interno de validación.' };
    }
}

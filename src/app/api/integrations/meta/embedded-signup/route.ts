import { consumeMetaOAuthSession } from '@/modules/infrastructure/meta/services/oauth-session';
import { NextRequest, NextResponse } from "next/server";
import { embeddedSignupHandler } from "@/modules/infrastructure/meta/services/onboarding/embedded-signup-handler";
import { createClient } from "@/modules/core/database/supabase-server";
import { getCurrentOrgRole } from "@/modules/core/iam/services/org-roles";
import { isProductionRuntime } from "@/app/api/_guards/request-guards";

function sanitizeEmbeddedSignupLogDetails(details: Record<string, unknown> = {}) {
    const sensitiveKeys = new Set(['connectionId', 'orgId', 'wabaId']);

    return Object.fromEntries(
        Object.entries(details).map(([key, value]) => {
            if (sensitiveKeys.has(key)) {
                return [`${key}Present`, Boolean(value)];
            }

            return [key, value];
        })
    );
}

function summarizeEmbeddedSignupError(error: unknown) {
    return error instanceof Error
        ? { name: error.name }
        : { type: typeof error };
}

function logEmbeddedSignupInfo(label: string, details: Record<string, unknown> = {}) {
    if (!isProductionRuntime()) {
        console.log(label, details);
        return;
    }

    console.log(label, sanitizeEmbeddedSignupLogDetails(details));
}

function logEmbeddedSignupError(label: string, error: unknown, details?: Record<string, unknown>) {
    if (!isProductionRuntime()) {
        if (details) console.error(label, error, details);
        else console.error(label, error);
        return;
    }

    console.error(label, {
        ...(details ? sanitizeEmbeddedSignupLogDetails(details) : {}),
        detail: summarizeEmbeddedSignupError(error),
    });
}

const PUBLIC_ONBOARDING_ERRORS = new Map([
    ['Missing selected WhatsApp Business Account', 'Meta no identificó la cuenta de WhatsApp. Selecciona una cuenta y vuelve a intentarlo.'],
    ['Select exactly one authorized phone number', 'Meta no identificó un número concreto. Selecciona un solo número en la ventana de Meta y vuelve a intentarlo.'],
    ['Coexistence Cloud API is not ready', 'El número de WhatsApp Business aún no está listo para conectarse con Pixy.'],
    ['Phone mode does not match the completed Meta flow', 'El tipo de número no coincide con la opción elegida. Vuelve a empezar con la opción correcta.'],
    ['Este número está reconectándose. Espera la confirmación de Meta antes de iniciar otra alta.', 'Este número está reconectándose. Espera la confirmación de Meta antes de iniciar otra alta.'],
    ['Desconecta primero la plataforma empresarial desde WhatsApp Business y completa una nueva alta.', 'Desconecta primero la plataforma empresarial desde WhatsApp Business y completa una nueva alta.'],
    ['Could not save channel; this asset may already belong to another organization', 'No se pudo guardar el canal. Este número podría pertenecer ya a otra organización de Pixy.'],
]);

async function requireMetaOnboardingAccess(orgId: string) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = await getCurrentOrgRole(orgId);
    if (role === "owner" || role === "admin") {
        return null;
    }

    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
}

/**
 * POST /api/integrations/meta/embedded-signup
 * 
 * Receives the authorization code from the Facebook SDK Embedded Signup modal
 * and completes the full onboarding: token exchange, WABA resolution, 
 * phone number discovery, DB registration, webhook subscription + smb_message_echoes.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { orgId, code, wabaId, phoneNumberId, mode, state } = body;
        if (typeof orgId !== 'string' || !orgId) return NextResponse.json({ error: 'Missing organization' }, { status: 400 });
        const unauthorized = await requireMetaOnboardingAccess(orgId);
        if (unauthorized) return unauthorized;
        if (typeof code !== 'string' || typeof state !== 'string' || !['cloud','coexistence'].includes(mode)) return NextResponse.json({ error: 'Invalid signup session' }, { status: 400 });
        let session;
        try { session = await consumeMetaOAuthSession(state); } catch { return NextResponse.json({ error: 'Invalid or expired signup session' }, { status: 403 }); }
        if (session.orgId !== orgId || session.flow !== 'embedded') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        if (!orgId || !code) {
            return NextResponse.json(
                { success: false, error: "Missing required fields: orgId, code" },
                { status: 400 }
            );
        }


        logEmbeddedSignupInfo("[EmbeddedSignup API] Processing request", { orgId });

        const result = await embeddedSignupHandler.completeOnboarding(orgId, code, wabaId, phoneNumberId, mode);

        if (!result.success) {
            logEmbeddedSignupError("[EmbeddedSignup API] Onboarding failed:", result.error);
            return NextResponse.json(
                { success: false, error: PUBLIC_ONBOARDING_ERRORS.get(result.error || '')
                    || (!isProductionRuntime() ? result.error : null) || 'Embedded signup failed' },
                { status: 422 }
            );
        }

        logEmbeddedSignupInfo("[EmbeddedSignup API] Onboarding completed", {
            connectionId: result.connectionId,
            wabaId: result.wabaId,
            syncStatus: result.syncStatus,
        });

        return NextResponse.json({
            success: true,
            connectionId: result.connectionId,
            wabaId: result.wabaId,
            syncStatus: result.syncStatus,
        });

    } catch (error: any) {
        logEmbeddedSignupError("[EmbeddedSignup API] Unexpected error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from "next/server";
import { embeddedSignupHandler } from "@/modules/infrastructure/meta/services/onboarding/embedded-signup-handler";
import { createClient } from "@/modules/core/database/supabase-server";
import { getCurrentOrgRole } from "@/modules/core/iam/services/org-roles";
import { isProductionRuntime } from "@/app/api/_guards/request-guards";

function logEmbeddedSignupError(label: string, error: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, error);
        return;
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error });
}

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
        const { orgId, code } = body;

        if (!orgId || !code) {
            return NextResponse.json(
                { success: false, error: "Missing required fields: orgId, code" },
                { status: 400 }
            );
        }

        const unauthorized = await requireMetaOnboardingAccess(orgId);
        if (unauthorized) return unauthorized;

        console.log(`[EmbeddedSignup API] Processing for org: ${orgId}`);

        const result = await embeddedSignupHandler.completeOnboarding(orgId, code);

        if (!result.success) {
            logEmbeddedSignupError("[EmbeddedSignup API] Onboarding failed:", result.error);
            return NextResponse.json(
                { success: false, error: "Embedded signup failed" },
                { status: 422 }
            );
        }

        console.log(`[EmbeddedSignup API] ✅ Success! Connection: ${result.connectionId}, WABA: ${result.wabaId}`);

        return NextResponse.json({
            success: true,
            connectionId: result.connectionId,
            wabaId: result.wabaId,
        });

    } catch (error: any) {
        logEmbeddedSignupError("[EmbeddedSignup API] Unexpected error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

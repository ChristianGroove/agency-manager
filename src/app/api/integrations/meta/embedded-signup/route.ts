import { NextRequest, NextResponse } from "next/server";
import { embeddedSignupHandler } from "@/lib/meta/onboarding/embedded-signup-handler";

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

        console.log(`[EmbeddedSignup API] Processing for org: ${orgId}`);

        const result = await embeddedSignupHandler.completeOnboarding(orgId, code);

        if (!result.success) {
            console.error("[EmbeddedSignup API] Onboarding failed:", result.error);
            return NextResponse.json(
                { success: false, error: result.error },
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
        console.error("[EmbeddedSignup API] Unexpected error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

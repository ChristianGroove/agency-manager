
import { createClient } from "@/modules/core/database/supabase-server";
import { AssistantContext } from "../types";
import { logAssistantError, logAssistantInfo } from "../safe-logging";

/**
 * CREATE BRIEF ACTION (Standardized Adapter)
 * 
 * Scope: Agency
 * Risk: High
 * Required Params: client_id, title
 * Optional Params: description
 */

type CreateBriefParams = {
    client_id: string;
    title: string;
    description?: string;
};

export async function createBriefAction(
    params: CreateBriefParams,
    context: AssistantContext,
    injectedClient?: any
) {
    logAssistantInfo("[ACTION] createBriefAction entered");
    logAssistantInfo("[ACTION] Create Brief", {
        userId: context.user_id,
        organizationId: context.tenant_id,
        clientId: params.client_id,
    });

    // 1. Strict Validation
    if (!params.client_id || !params.title) {
        throw new Error("Missing required parameters: client_id, title");
    }

    if (params.title.length > 120) {
        throw new Error("Title exceeds strict limit of 120 characters.");
    }

    // 2. Initialize Client
    // Use injected client (for tests/scripts/optimization) or default server client
    const supabase = injectedClient || await createClient();

    // 3. Execution (Insert Draft)
    const { data, error } = await supabase
        .from('briefings')
        .insert({
            organization_id: context.tenant_id, // Context Enforced
            client_id: params.client_id,
            title: params.title,
            description: params.description || null,
            status: 'draft',
            created_by: context.user_id // Audit trail
        })
        .select('id')
        .single();

    if (error) {
        logAssistantError("[ACTION] Create Brief Failed:", error, {
            userId: context.user_id,
            organizationId: context.tenant_id,
            clientId: params.client_id,
        });
        throw new Error(`Database Error: ${error.message}`);
    }

    logAssistantInfo("[ACTION] Created Brief", {
        briefId: data.id,
        userId: context.user_id,
        organizationId: context.tenant_id,
    });

    return {
        success: true,
        brief_id: data.id,
        status: 'draft',
        message: 'Brief created successfully as draft.'
    };
}


import { createClient } from "@/lib/supabase-server";
import { AssistantContext } from "../types";

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
    console.log("⚡ [DEBUG] createBriefAction Entered");
    console.log(`[ACTION] Create Brief | User: ${context.user_id} | Org: ${context.tenant_id}`);

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
        console.error("[ACTION] Create Brief Failed. Message:", error.message);
        console.error("Details:", error.details);
        console.error("Hint:", error.hint);
        throw new Error(`Database Error: ${error.message}`);
    }

    console.log(`[ACTION] Created Brief ${data.id}`);

    return {
        success: true,
        brief_id: data.id,
        status: 'draft',
        message: 'Brief created successfully as draft.'
    };
}

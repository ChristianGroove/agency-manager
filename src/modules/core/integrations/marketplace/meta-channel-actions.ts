"use server"

import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { requireOrgRole } from "@/lib/auth/org-roles"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { MetaGraphAPI } from "@/lib/meta/graph-api"

/**
 * Input from UI (IntegrationSetupSheet) - uses parentConnectionId
 */
interface UIActivateInput {
    parentConnectionId: string
    assetId: string
    assetType: "page" | "instagram" | "whatsapp"
    assetName: string
    accessToken: string
    wabaId?: string
}

/**
 * Input from OAuth callback - uses orgId directly
 */
interface CallbackActivateInput {
    orgId: string
    providerKey: 'facebook_page' | 'instagram_dm' | 'whatsapp_cloud'
    assetId: string
    assetName: string
    accessToken: string
    pageAccessToken?: string  // For pages only
    displayPhoneNumber?: string
    wabaId?: string
}

type ActivateInput = UIActivateInput | CallbackActivateInput;

function isCallbackInput(input: ActivateInput): input is CallbackActivateInput {
    return 'orgId' in input && 'providerKey' in input;
}

/**
 * Activate a Meta asset as an independent channel
 * 
 * SIMPLE DESIGN:
 * - Each asset becomes ONE connection with a SPECIFIC provider_key
 * - Supports both UI calls and callback auto-creation
 * - Handles reactivation of deleted channels
 */
export async function activateMetaChannel(input: ActivateInput): Promise<{ success: boolean; channelId?: string; error?: string; reactivated?: boolean }> {

    // Determine orgId based on input type
    let orgId: string;
    let providerKey: string;
    let accessToken: string;
    let assetId: string;
    let assetName: string;
    let wabaId: string | undefined;
    let displayPhoneNumber: string | undefined;

    if (isCallbackInput(input)) {
        // Called from OAuth callback - orgId is provided
        orgId = input.orgId;
        providerKey = input.providerKey;
        accessToken = input.pageAccessToken || input.accessToken;
        assetId = input.assetId;
        assetName = input.assetName;
        wabaId = input.wabaId;
        displayPhoneNumber = input.displayPhoneNumber;
    } else {
        // Called from UI - get orgId from session
        const sessionOrgId = await getCurrentOrganizationId();
        if (!sessionOrgId) {
            return { success: false, error: "No organization found" };
        }
        orgId = sessionOrgId;
        await requireOrgRole("admin");

        const providerKeyMap = {
            'page': 'facebook_page',
            'instagram': 'instagram_dm',
            'whatsapp': 'whatsapp_cloud'
        };
        providerKey = providerKeyMap[input.assetType];
        accessToken = input.accessToken;
        assetId = input.assetId;
        assetName = input.assetName;
        wabaId = input.wabaId;
    }

    try {
        const metaApi = new MetaGraphAPI();

        // For pages: exchange for long-lived token and subscribe webhooks
        let finalAccessToken = accessToken;
        let webhookStatus = "pending";
        const assetType = isCallbackInput(input)
            ? (input.providerKey === 'facebook_page' ? 'page' : input.providerKey === 'whatsapp_cloud' ? 'whatsapp' : 'instagram')
            : input.assetType;

        if (assetType === "page" && accessToken) {
            try {
                finalAccessToken = await metaApi.exchangeForLongLivedPageToken(accessToken);
                const webhookResult = await metaApi.subscribePageWebhooks(assetId, finalAccessToken);
                webhookStatus = webhookResult.success ? "subscribed" : "failed";
            } catch (e: any) {
                console.warn(`[activateMetaChannel] Token/webhook setup warning: ${e.message}`);
            }
        }

        if (assetType === "whatsapp") {
            webhookStatus = "app_level";
        }

        // Check if channel already exists (including deleted ones)
        const { data: existing } = await supabaseAdmin
            .from('integration_connections')
            .select('id, status')
            .eq('organization_id', orgId)
            .eq('provider_key', providerKey)
            .eq('metadata->>asset_id', assetId)
            .limit(1);

        if (existing && existing.length > 0) {
            const existingChannel = existing[0];

            if (existingChannel.status === 'active') {
                return {
                    success: false,
                    error: `Este canal ya está activado`
                };
            }

            // Reactivate deleted/disconnected channel
            const { error } = await supabaseAdmin
                .from('integration_connections')
                .update({
                    status: 'active',
                    credentials: { access_token: finalAccessToken },
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingChannel.id);

            if (error) {
                return { success: false, error: error.message };
            }

            revalidatePath("/platform/integrations");
            revalidatePath("/crm/settings/channels");

            return {
                success: true,
                channelId: existingChannel.id,
                reactivated: true
            };
        }

        // Create new channel connection
        const channelData = {
            organization_id: orgId,
            provider_key: providerKey,
            connection_name: assetName,
            credentials: {
                access_token: finalAccessToken
            },
            metadata: {
                asset_id: assetId,
                asset_type: assetType,
                asset_name: assetName,
                waba_id: wabaId,
                display_phone_number: displayPhoneNumber,
                webhook_status: webhookStatus
            },
            config: {
                asset_type: assetType
            },
            status: 'active',
            is_primary: false
        };

        const { data: channel, error } = await supabaseAdmin
            .from('integration_connections')
            .insert(channelData)
            .select()
            .single();

        if (error) {
            console.error("[activateMetaChannel] DB error:", error);
            return { success: false, error: error.message };
        }

        console.log(`[activateMetaChannel] Channel created: ${channel.id}`);

        revalidatePath("/platform/integrations");
        revalidatePath("/crm/settings/channels");

        return {
            success: true,
            channelId: channel.id
        };

    } catch (error: any) {
        console.error("[activateMetaChannel] Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Deactivate a Meta channel
 */
export async function deactivateMetaChannel(channelId: string): Promise<{ success: boolean; error?: string }> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) {
        return { success: false, error: "No organization found" }
    }

    await requireOrgRole("admin")

    try {
        const { error } = await supabaseAdmin
            .from('integration_connections')
            .update({ status: 'deleted' })
            .eq('id', channelId)
            .eq('organization_id', orgId)

        if (error) throw error

        revalidatePath("/platform/integrations")
        revalidatePath("/crm/settings/channels")

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

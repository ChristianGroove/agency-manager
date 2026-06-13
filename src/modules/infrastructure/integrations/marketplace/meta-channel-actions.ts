"use server"

import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { requireOrgRole } from "@/modules/core/iam/services/org-roles"
import { revalidatePath } from "next/cache"
import { MetaGraphAPI } from "@/modules/infrastructure/meta/services/graph-api"
import { wabaSubscriptionManager } from "@/modules/infrastructure/meta/services/waba-subscription-manager"
import { createClient } from "@/modules/core/database/supabase-server";

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV
}

function summarizeMetaChannelError(error: unknown) {
    return error instanceof Error
        ? { name: error.name }
        : { type: typeof error }
}

function sanitizeMetaChannelLogDetails(details: Record<string, unknown>) {
    const sensitiveKeys = new Set([
        'assetId',
        'channelId',
        'pageId',
        'wabaId',
    ])

    return Object.fromEntries(
        Object.entries(details).map(([key, value]) => {
            if (sensitiveKeys.has(key)) {
                return [`${key}Present`, Boolean(value)]
            }

            return [key, value]
        })
    )
}

function logMetaChannelInfo(label: string, details: Record<string, unknown>) {
    if (!isDeployedRuntime()) {
        console.log(label, details)
        return
    }

    console.log(label, sanitizeMetaChannelLogDetails(details))
}

function logMetaChannelError(label: string, error: unknown, level: 'error' | 'warn' = 'error') {
    const logger = level === 'warn' ? console.warn : console.error

    if (!isDeployedRuntime()) {
        logger(label, error)
        return
    }

    logger(label, summarizeMetaChannelError(error))
}

function publicMetaChannelError(error: unknown, fallback: string) {
    if (isDeployedRuntime()) {
        return fallback
    }

    return error instanceof Error
        ? error.message
        : fallback
}

/**
 * Input from UI (IntegrationSetupSheet) - uses parentConnectionId
 */
interface UIActivateInput {
    parentConnectionId: string
    assetId: string
    assetType: "page" | "instagram" | "whatsapp"
    assetName: string
    wabaId?: string
    pageId?: string
}

/**
 * Input from OAuth callback - uses orgId directly
 */
interface CallbackActivateInput {
    orgId: string
    providerKey: 'facebook_page' | 'instagram_dm' | 'instagram_dme' | 'whatsapp_cloud'
    assetId: string
    assetName: string
    accessToken: string
    pageAccessToken?: string  // For pages only
    displayPhoneNumber?: string
    wabaId?: string
    pageId?: string
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
            'instagram': 'instagram_dme',
            'whatsapp': 'whatsapp_cloud'
        };
        providerKey = providerKeyMap[input.assetType];
        assetId = input.assetId;
        assetName = input.assetName;
        wabaId = input.wabaId;

        const { data: parentConnection, error: parentError } = await (await createClient())
            .from('integration_connections')
            .select('credentials')
            .eq('id', input.parentConnectionId)
            .eq('organization_id', orgId)
            .eq('provider_key', 'meta_business')
            .maybeSingle();

        const parentCredentials = parentConnection?.credentials as { access_token?: string } | undefined;
        if (parentError || !parentCredentials?.access_token) {
            logMetaChannelError(
                '[activateMetaChannel] Parent Meta connection unavailable:',
                parentError || new Error('missing_parent_access_token')
            );
            return { success: false, error: 'Meta parent connection is not available' };
        }

        accessToken = parentCredentials.access_token;
    }

    try {
        const metaApi = new MetaGraphAPI();

        // For pages: exchange for long-lived token and subscribe webhooks
        let finalAccessToken = accessToken;
        let webhookStatus = "pending";
        const assetType = isCallbackInput(input)
            ? (input.providerKey === 'facebook_page' ? 'page' : input.providerKey === 'whatsapp_cloud' ? 'whatsapp' : 'instagram')
            : input.assetType;

        if ((assetType === "page" || assetType === "instagram") && accessToken) {
            try {
                // For both Page and Instagram, we need a Long-Lived Page Access Token
                finalAccessToken = await metaApi.exchangeForLongLivedPageToken(accessToken);

                // For Instagram, we still subscribe the Page ID because Meta delivers 
                // Instagram Webhooks via the Page's subscribed_apps entry.
                const pageIdToSubscribe = input.pageId || (input as any).page_id || assetId;

                const webhookResult = await metaApi.subscribePageWebhooks(pageIdToSubscribe, finalAccessToken);
                webhookStatus = webhookResult.success ? "active" : "failed";
                logMetaChannelInfo('[activateMetaChannel] Webhook setup finished', {
                    webhookStatus,
                    assetType,
                    assetId,
                    pageId: pageIdToSubscribe,
                });
            } catch (e: any) {
                logMetaChannelError('[activateMetaChannel] Token/webhook setup warning:', e, 'warn');
            }
        }

        if (assetType === "whatsapp") {
            try {
                // Subscribe WABA to app webhooks (Critical for inbound messages)
                if (wabaId) {
                    logMetaChannelInfo('[activateMetaChannel] Subscribing WABA', { wabaId });
                    const subResult = await wabaSubscriptionManager.subscribeWABA(wabaId, finalAccessToken);
                    webhookStatus = subResult.success ? "app_level" : "failed";
                    if (!subResult.success) {
                        logMetaChannelError('[activateMetaChannel] WABA Subscription Failed:', subResult.error);
                    }
                } else {
                    console.warn('[activateMetaChannel] No WABA ID available for subscription');
                    webhookStatus = "app_level_pending";
                }
            } catch (e: any) {
                logMetaChannelError('[activateMetaChannel] WABA subscription error:', e);
                webhookStatus = "failed";
            }
        }

        // Check if channel already exists (including deleted ones)
        const { data: existing } = await (await createClient())
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
            const { error } = await (await createClient())
                .from('integration_connections')
                .update({
                    status: 'active',
                    credentials: { access_token: finalAccessToken },
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingChannel.id)
                .eq('organization_id', orgId);

            if (error) {
                logMetaChannelError("[activateMetaChannel] Reactivation DB error:", error);
                return { success: false, error: publicMetaChannelError(error, 'Meta channel activation failed') };
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
                webhook_status: webhookStatus,
                page_id: input.pageId || (input as any).page_id
            },
            config: {
                asset_type: assetType
            },
            status: 'active',
            is_primary: false
        };

        const { data: channel, error } = await (await createClient())
            .from('integration_connections')
            .insert(channelData)
            .select()
            .single();

        if (error) {
            logMetaChannelError("[activateMetaChannel] DB error:", error);
            return { success: false, error: publicMetaChannelError(error, 'Meta channel activation failed') };
        }

        logMetaChannelInfo('[activateMetaChannel] Channel created', { channelId: channel.id });

        revalidatePath("/platform/integrations");
        revalidatePath("/crm/settings/channels");

        return {
            success: true,
            channelId: channel.id
        };

    } catch (error: any) {
        logMetaChannelError("[activateMetaChannel] Error:", error);
        return { success: false, error: publicMetaChannelError(error, 'Meta channel activation failed') };
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
        const { error } = await (await createClient())
            .from('integration_connections')
            .update({ status: 'deleted' })
            .eq('id', channelId)
            .eq('organization_id', orgId)

        if (error) throw error

        revalidatePath("/platform/integrations")
        revalidatePath("/crm/settings/channels")

        return { success: true }
    } catch (error: any) {
        logMetaChannelError("[deactivateMetaChannel] Error:", error)
        return { success: false, error: publicMetaChannelError(error, 'Meta channel deactivation failed') }
    }
}


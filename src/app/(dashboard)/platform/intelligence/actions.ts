'use server';

import { AiConfigService } from "@/modules/assistant/services";
import { revalidatePath } from "next/cache";

export async function updateGlobalSettings(key: string, value: boolean | number) {
    // In a real app, verify Admin Permissions here!
    // const session = await getSession();
    // if (!session.user.isAdmin) throw new Error("Unauthorized");

    try {
        await AiConfigService.updateSettings('global', 'system', {
            [key]: value
        });

        revalidatePath('/platform/intelligence');
        return { success: true };
    } catch (error) {
        console.error("Failed to update settings:", error);
        return { success: false, error: "Failed to update settings" };
    }
}

import { getSettings } from "@/modules/core/settings/settings-actions"
import { getDictionary as getBaseDictionary, Locale } from "./dictionaries"

/**
 * Server-side helper to get the translation dictionary based on 
 * the current organization's language settings.
 */
export async function getDictionary() {
    const settings = await getSettings()
    const locale = (settings?.default_language as Locale) || 'es'
    return getBaseDictionary(locale)
}

import { IntegrationAdapter, ConnectionCredentials, VerificationResult } from "./types"

export class MetaAdapter implements IntegrationAdapter {
    key = "meta_whatsapp"

    async verifyCredentials(credentials: ConnectionCredentials): Promise<VerificationResult> {
        const { phoneNumberId, accessToken } = credentials

        if (!phoneNumberId || !accessToken) {
            return { isValid: false, error: "Missing Phone Number ID or Access Token" }
        }

        try {
            // Verify token and phone ID by fetching phone number details
            const response = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}`, {
                headers: {
                    "Authorization": `Bearer ${accessToken}`
                }
            })

            const data = await response.json()

            if (response.ok && data.id === phoneNumberId) {
                return {
                    isValid: true,
                    metadata: {
                        display_phone_number: data.display_phone_number,
                        verified_name: data.verified_name,
                        quality_rating: data.quality_rating
                    }
                }
            } else {
                return {
                    isValid: false,
                    error: data.error?.message || "Invalid Credentials or Permissions"
                }
            }
        } catch (err: any) {
            return { isValid: false, error: `Facebook Graph API Error: ${err.message}` }
        }
    }
}

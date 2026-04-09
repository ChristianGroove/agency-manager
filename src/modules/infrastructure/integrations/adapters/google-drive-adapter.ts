import { IntegrationAdapter, ConnectionCredentials, VerificationResult, StorageProvider } from "./types"
import { google } from "googleapis"
import { Readable } from "stream"

/**
 * Google Drive Adapter for "Bring Your Own Storage" Backups
 * 
 * Uses googleapis library for Service Account auth.
 */
export class GoogleDriveAdapter implements IntegrationAdapter {
    key = 'google_drive'

    storage: StorageProvider = {
        uploadFile: async (credentials, path, content, contentType) => {
            console.log(`[GDrive] Uploading to folder ${credentials.folder_id}: ${path}`)

            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: credentials.client_email,
                    private_key: credentials.private_key?.replace(/\\n/g, '\n'),
                },
                scopes: ['https://www.googleapis.com/auth/drive.file']
            })

            const drive = google.drive({ version: 'v3', auth })

            // Create file metadata
            const fileMetadata = {
                name: path.split('/').pop(), // filename
                parents: [credentials.folder_id]
            };

            // Create media
            let mediaBody: any = content;
            if (typeof content === 'string') {
                mediaBody = Readable.from([content])
            }

            const media = {
                mimeType: contentType,
                body: mediaBody
            };

            const file = await drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id, webViewLink'
            });

            return {
                url: file.data.webViewLink || `https://drive.google.com/file/d/${file.data.id}`,
                fileId: file.data.id || undefined
            }
        }
    }

    async verifyCredentials(credentials: ConnectionCredentials): Promise<VerificationResult> {
        if (!credentials.client_email || !credentials.private_key || !credentials.folder_id) {
            return { isValid: false, error: "Missing required fields: client_email, private_key, folder_id" }
        }

        try {
            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: credentials.client_email,
                    private_key: credentials.private_key?.replace(/\\n/g, '\n'),
                },
                scopes: ['https://www.googleapis.com/auth/drive.metadata.readonly']
            })

            const drive = google.drive({ version: 'v3', auth })

            // Verify folder access
            await drive.files.get({ fileId: credentials.folder_id })

            return {
                isValid: true,
                metadata: {
                    provider: 'google',
                    account: credentials.client_email
                }
            }
        } catch (error: any) {
            console.error("GDrive Verification Failed:", error)
            return { isValid: false, error: `Google Drive Access Denied: ${error.message}` }
        }
    }
}

import { IntegrationAdapter, ConnectionCredentials, VerificationResult, StorageProvider } from "./types"
import { google } from "googleapis"
import { Readable } from "stream"

const PUBLIC_GDRIVE_VERIFICATION_ERROR = "Google Drive credentials could not be verified"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeGoogleDriveError(error: unknown) {
    if (error instanceof Error) {
        const detail = error as Error & { code?: unknown; status?: unknown; response?: { status?: unknown } }
        return {
            name: error.name,
            code: detail.code,
            status: detail.status || detail.response?.status,
        }
    }

    if (error && typeof error === 'object') {
        return {
            code: (error as any).code,
            status: (error as any).status || (error as any).response?.status,
            hasMessage: typeof (error as any).message === 'string' && (error as any).message.length > 0,
        }
    }

    return { type: typeof error }
}

function logGoogleDriveError(label: string, error: unknown) {
    console.error(label, isDeployedRuntime() ? summarizeGoogleDriveError(error) : error)
}

function googleDriveVerificationError(error: unknown) {
    if (isDeployedRuntime()) return PUBLIC_GDRIVE_VERIFICATION_ERROR
    if (error instanceof Error && error.message) return `Google Drive Access Denied: ${error.message}`
    return PUBLIC_GDRIVE_VERIFICATION_ERROR
}

function logGoogleDriveUpload(credentials: ConnectionCredentials, path: string) {
    if (!isDeployedRuntime()) {
        console.log(`[GDrive] Uploading to folder ${credentials.folder_id}: ${path}`)
        return
    }

    console.log('[GDrive] Uploading file', {
        folderPresent: !!credentials.folder_id,
        pathPresent: !!path,
    })
}

/**
 * Google Drive Adapter for "Bring Your Own Storage" Backups
 * 
 * Uses googleapis library for Service Account auth.
 */
export class GoogleDriveAdapter implements IntegrationAdapter {
    key = 'google_drive'

    storage: StorageProvider = {
        uploadFile: async (credentials, path, content, contentType) => {
            logGoogleDriveUpload(credentials, path)

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

            const { globalCircuitBreaker } = await import('@/modules/infrastructure/resilience/circuit-breaker');
            return await globalCircuitBreaker.execute('gdrive_io', async () => {
                const file = await drive.files.create({
                    requestBody: fileMetadata,
                    media: media,
                    fields: 'id, webViewLink'
                });

                return {
                    url: file.data.webViewLink || `https://drive.google.com/file/d/${file.data.id}`,
                    fileId: file.data.id || undefined
                }
            });
        }
    }

    async verifyCredentials(credentials: ConnectionCredentials): Promise<VerificationResult> {
        if (!credentials.client_email || !credentials.private_key || !credentials.folder_id) {
            return { isValid: false, error: "Missing required fields: client_email, private_key, folder_id" }
        }

        const { globalCircuitBreaker } = await import('@/modules/infrastructure/resilience/circuit-breaker');
        return await globalCircuitBreaker.execute('gdrive_status', async () => {
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
            } catch (error: unknown) {
                logGoogleDriveError("GDrive Verification Failed:", error)
                return { isValid: false, error: googleDriveVerificationError(error) }
            }
        });
    }
}

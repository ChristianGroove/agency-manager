import { IntegrationAdapter, ConnectionCredentials, VerificationResult, StorageProvider } from "./types"
import { S3Client, PutObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3"

/**
 * AWS S3 Adapter for "Bring Your Own Storage" Backups
 * 
 * Uses @aws-sdk/client-s3 for direct communication.
 */
export class S3StorageAdapter implements IntegrationAdapter {
    key = 'aws_s3'

    // Storage Capability Implementation
    storage: StorageProvider = {
        uploadFile: async (credentials, path, content, contentType = 'application/octet-stream') => {
            console.log(`[S3] Uploading to bucket ${credentials.bucket}: ${path}`)

            const client = new S3Client({
                region: credentials.region,
                credentials: {
                    accessKeyId: credentials.access_key,
                    secretAccessKey: credentials.secret_key
                }
            })

            const command = new PutObjectCommand({
                Bucket: credentials.bucket,
                Key: path,
                Body: content,
                ContentType: contentType
            })

            await client.send(command)

            return {
                url: `https://${credentials.bucket}.s3.${credentials.region}.amazonaws.com/${path}`,
                fileId: path
            }
        }
    }

    async verifyCredentials(credentials: ConnectionCredentials): Promise<VerificationResult> {
        // Validate required fields
        if (!credentials.access_key || !credentials.secret_key || !credentials.bucket || !credentials.region) {
            return { isValid: false, error: "Missing required S3 fields: access_key, secret_key, bucket, region" }
        }

        try {
            const client = new S3Client({
                region: credentials.region,
                credentials: {
                    accessKeyId: credentials.access_key,
                    secretAccessKey: credentials.secret_key
                }
            })

            // Verify bucket access
            await client.send(new HeadBucketCommand({ Bucket: credentials.bucket }))

            return {
                isValid: true,
                metadata: {
                    provider: 'aws',
                    bucket: credentials.bucket,
                    region: credentials.region
                }
            }
        } catch (error: any) {
            console.error("S3 Verification Failed:", error)
            return { isValid: false, error: `S3 Access Denied: ${error.message}` }
        }
    }
}

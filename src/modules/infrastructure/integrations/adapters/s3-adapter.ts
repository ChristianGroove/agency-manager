import { IntegrationAdapter, ConnectionCredentials, VerificationResult, StorageProvider } from "./types"
import { S3Client, PutObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3"

const PUBLIC_S3_VERIFICATION_ERROR = "S3 credentials could not be verified"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeS3Error(error: unknown) {
    if (error instanceof Error) {
        const detail = error as Error & { code?: unknown; $metadata?: { httpStatusCode?: unknown } }
        return {
            name: error.name,
            code: detail.code,
            statusCode: detail.$metadata?.httpStatusCode,
        }
    }

    if (error && typeof error === 'object') {
        return {
            code: (error as any).code,
            statusCode: (error as any).$metadata?.httpStatusCode,
            hasMessage: typeof (error as any).message === 'string' && (error as any).message.length > 0,
        }
    }

    return { type: typeof error }
}

function logS3Error(label: string, error: unknown) {
    console.error(label, isDeployedRuntime() ? summarizeS3Error(error) : error)
}

function s3VerificationError(error: unknown) {
    if (isDeployedRuntime()) return PUBLIC_S3_VERIFICATION_ERROR
    if (error instanceof Error && error.message) return `S3 Access Denied: ${error.message}`
    return PUBLIC_S3_VERIFICATION_ERROR
}

function logS3Upload(credentials: ConnectionCredentials, path: string) {
    if (!isDeployedRuntime()) {
        console.log(`[S3] Uploading to bucket ${credentials.bucket}: ${path}`)
        return
    }

    console.log('[S3] Uploading file', {
        bucketPresent: !!credentials.bucket,
        pathPresent: !!path,
    })
}

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
            logS3Upload(credentials, path)

            const client = new S3Client({
                region: credentials.region,
                credentials: {
                    accessKeyId: credentials.access_key,
                    secretAccessKey: credentials.secret_key
                }
            })

            const { globalCircuitBreaker } = await import('@/modules/infrastructure/resilience/circuit-breaker');
            return await globalCircuitBreaker.execute('aws_s3_io', async () => {
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
            });
        }
    }

    async verifyCredentials(credentials: ConnectionCredentials): Promise<VerificationResult> {
        // Validate required fields
        if (!credentials.access_key || !credentials.secret_key || !credentials.bucket || !credentials.region) {
            return { isValid: false, error: "Missing required S3 fields: access_key, secret_key, bucket, region" }
        }

        const { globalCircuitBreaker } = await import('@/modules/infrastructure/resilience/circuit-breaker');
        return await globalCircuitBreaker.execute('aws_s3_status', async () => {
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
            } catch (error: unknown) {
                logS3Error("S3 Verification Failed:", error)
                return { isValid: false, error: s3VerificationError(error) }
            }
        });
    }
}

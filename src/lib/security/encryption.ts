import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

/**
 * Encrypt a buffer using AES-256-GCM
 * Used for Data Vault storage of sensitive documents
 */
export async function encryptBuffer(buffer: Buffer, secretKey: string): Promise<Buffer> {
    // Generate a secure IV
    const iv = crypto.randomBytes(IV_LENGTH)

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, crypto.scryptSync(secretKey, 'salt', 32), iv)

    // Encrypt
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()])

    // Get auth tag
    const authTag = cipher.getAuthTag()

    // Combine IV + AuthTag + EncryptedData for storage
    return Buffer.concat([iv, authTag, encrypted])
}

/**
 * Decrypt a buffer using AES-256-GCM
 */
export async function decryptBuffer(encryptedBuffer: Buffer, secretKey: string): Promise<Buffer> {
    // Extract metadata
    const iv = encryptedBuffer.subarray(0, IV_LENGTH)
    const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const encryptedData = encryptedBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, crypto.scryptSync(secretKey, 'salt', 32), iv)
    decipher.setAuthTag(authTag)

    // Decrypt
    return Buffer.concat([decipher.update(encryptedData), decipher.final()])
}

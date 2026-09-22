import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

// Existing key derivation is retained so deployed ciphertext remains readable.
const IV_LENGTH = 16

// Helper to ensure key is 32 bytes
function getKey() {
    const key = process.env.ENCRYPTION_KEY
    if (!key || Buffer.byteLength(key) < 32) throw new Error('ENCRYPTION_KEY must contain at least 32 bytes')
    return Buffer.from(key.padEnd(32, '0').slice(0, 32))
}

export function encrypt(text: string): string {
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag().toString('hex')
    return iv.toString('hex') + ':' + authTag + ':' + encrypted
}

export function decrypt(text: string): string {
    const parts = text.split(':')
    if (parts.length !== 3) throw new Error('Invalid encrypted string format')

    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encryptedText = parts[2]

    const decipher = createDecipheriv('aes-256-gcm', getKey(), iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
}

export function encryptObject(obj: any): any {
    return { _encrypted: encrypt(JSON.stringify(obj)) }
}

export function decryptObject(obj: any): any {
    if (obj && obj._encrypted) {
        try {
            return JSON.parse(decrypt(obj._encrypted))
        } catch (e) {
            console.error("Decryption failed", e)
            return null
        }
    }
    return obj
}

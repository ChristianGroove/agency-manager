import crypto from 'crypto';

// Use a consistent encryption key (In prod, this MUST be an env var)
// For now, we fallback to a derived key if specific env is missing to ensure it works
const ENCRYPTION_KEY = process.env.AI_ENGINE_SECRET_KEY || 'default-dev-secret-key-must-change-in-prod-32chars';
const ALGORITHM = 'aes-256-cbc';

// Ensure key is 32 bytes
const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest('base64').substr(0, 32);

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
    if (!text || !text.includes(':')) {
        // Fallback: If not encrypted format (iv:content), assume plain text
        // This handles legacy keys or manually inserted credentials
        return text;
    }

    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

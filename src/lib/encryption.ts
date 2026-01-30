import crypto from 'crypto';

// Use a secure key from environment or fallback (WARN: Fallback is only for dev comfort, should be set in prod)
// The key must be 32 bytes (256 bits) for aes-256-cbc
const ENCRYPTION_KEY = process.env.SMTP_ENC_KEY || '12345678901234567890123456789012'; // 32 chars
const IV_LENGTH = 16; // For AES, this is always 16

export function encrypt(text: string): { encryptedData: string, iv: string } {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return {
        encryptedData: encrypted.toString('hex'),
        iv: iv.toString('hex')
    };
}

export function decrypt(text: string, iv: string): string {
    const ivBuffer = Buffer.from(iv, 'hex');
    const encryptedText = Buffer.from(text, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), ivBuffer);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
}

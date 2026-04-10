/**
 * WhatsApp Flows Encryption Engine
 * 
 * Implements RSA-OAEP + AES-128-GCM encryption for Flows v5.0 endpoint
 * with X-Hub-Signature-256 validation for security.
 * 
 * Meta Spec: https://developers.facebook.com/docs/whatsapp/flows/guides/implementingdataexchange
 */

import crypto from 'crypto';

/**
 * Encrypted request from WhatsApp
 */
export interface EncryptedFlowRequest {
    encrypted_flow_data: string;      // Base64 encoded
    encrypted_aes_key: string;        // Base64 encoded
    initial_vector: string;           // Base64 encoded
}

/**
 * Decrypted flow data payload
 */
export interface FlowDataPayload {
    version: string;
    screen: string;
    data: Record<string, any>;
    action_payload?: Record<string, any>;
}

/**
 * Flows Crypto Engine
 */
export class FlowsCrypto {
    private privateKey: Buffer;
    private publicKey: Buffer;
    private appSecret: string;

    constructor(privateKeyPath?: string, publicKeyPath?: string) {
        // Load keys from environment or file system
        const privateKeyPem = process.env.FLOWS_PRIVATE_KEY ||
            this.loadKeyFromFile(privateKeyPath || './keys/private.pem');
        const publicKeyPem = process.env.FLOWS_PUBLIC_KEY ||
            this.loadKeyFromFile(publicKeyPath || './keys/public.pem');

        this.privateKey = Buffer.from(privateKeyPem);
        this.publicKey = Buffer.from(publicKeyPem);
        this.appSecret = process.env.META_APP_SECRET || '';

        if (!this.appSecret) {
            console.warn('[FlowsCrypto] META_APP_SECRET not set - signature validation disabled');
        }
    }

    /**
     * Validate X-Hub-Signature-256 from Meta
     * CRITICAL for App Review: Ensures requests come from Meta only
     */
    validateSignature(rawBody: string, signature: string): boolean {
        if (!this.appSecret) {
            console.warn('[FlowsCrypto] Cannot validate signature - no app secret');
            return false;
        }

        if (!signature || !signature.startsWith('sha256=')) {
            return false;
        }

        const expectedSignature = 'sha256=' + crypto
            .createHmac('sha256', this.appSecret)
            .update(rawBody)
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    /**
     * Decrypt incoming Flow request
     * 
     * Process:
     * 1. Decrypt AES key with RSA-OAEP (SHA-256)
     * 2. Decrypt payload with AES-128-GCM
     */
    decryptRequest(request: EncryptedFlowRequest): FlowDataPayload {
        try {
            // Step 1: Decrypt AES key using RSA-OAEP
            const encryptedAesKey = Buffer.from(request.encrypted_aes_key, 'base64');

            const aesKey = crypto.privateDecrypt(
                {
                    key: this.privateKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                encryptedAesKey
            );

            // Step 2: Decrypt payload using AES-128-GCM
            const encryptedData = Buffer.from(request.encrypted_flow_data, 'base64');
            const iv = Buffer.from(request.initial_vector, 'base64');

            // Extract auth tag (last 16 bytes)
            const authTag = encryptedData.slice(-16);
            const ciphertext = encryptedData.slice(0, -16);

            const decipher = crypto.createDecipheriv('aes-128-gcm', aesKey, iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(ciphertext);
            decrypted = Buffer.concat([decrypted, decipher.final()]);

            const payload = JSON.parse(decrypted.toString('utf8'));

            console.log('[FlowsCrypto] Successfully decrypted request');

            return payload;

        } catch (error: any) {
            console.error('[FlowsCrypto] Decryption failed:', error.message);
            throw new Error('Failed to decrypt Flow request');
        }
    }

    /**
     * Encrypt response for WhatsApp
     * 
     * Uses same AES key and IV from request for encryption
     */
    encryptResponse(
        data: any,
        aesKey: Buffer,
        iv: Buffer
    ): string {
        try {
            const cipher = crypto.createCipheriv('aes-128-gcm', aesKey, iv);

            const payload = JSON.stringify(data);
            let encrypted = cipher.update(payload, 'utf8');
            encrypted = Buffer.concat([encrypted, cipher.final()]);

            const authTag = cipher.getAuthTag();
            const result = Buffer.concat([encrypted, authTag]);

            console.log('[FlowsCrypto] Successfully encrypted response');

            return result.toString('base64');

        } catch (error: any) {
            console.error('[FlowsCrypto] Encryption failed:', error.message);
            throw new Error('Failed to encrypt Flow response');
        }
    }

    /**
     * Decrypt and store AES key for response encryption
     */
    extractAESKey(encryptedAesKey: string): Buffer {
        const encryptedKey = Buffer.from(encryptedAesKey, 'base64');

        return crypto.privateDecrypt(
            {
                key: this.privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256'
            },
            encryptedKey
        );
    }

    /**
     * Get public key for Flow configuration
     */
    getPublicKey(): string {
        return this.publicKey.toString('utf8');
    }

    /**
     * Load key from file system (fallback)
     */
    private loadKeyFromFile(path: string): string {
        try {
            const fs = require('fs');
            return fs.readFileSync(path, 'utf8');
        } catch (error) {
            console.warn(`[FlowsCrypto] Could not load key from ${path}`);
            return '';
        }
    }
}

// Singleton instance
let flowsCryptoInstance: FlowsCrypto | null = null;

export function getFlowsCrypto(): FlowsCrypto {
    if (!flowsCryptoInstance) {
        flowsCryptoInstance = new FlowsCrypto();
    }
    return flowsCryptoInstance;
}

export const flowsCrypto = getFlowsCrypto();

/**
 * Generate RSA keypair for development
 * Run: node -e "require('./flows-crypto').generateKeypair()"
 */
export function generateKeypair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    console.log('=== RSA Keypair Generated ===\n');
    console.log('Public Key (upload to Meta):\n');
    console.log(publicKey);
    console.log('\nPrivate Key (store securely):\n');
    console.log(privateKey);
    console.log('\n=== Save to .env ===');
    console.log('FLOWS_PRIVATE_KEY=');
    console.log('FLOWS_PUBLIC_KEY=');
}

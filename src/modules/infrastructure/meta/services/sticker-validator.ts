export interface StickerValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Basic WebP dimension and size validator for Meta's strict WhatsApp Sticker requirements
 * - Format: .webp only
 * - Size: < 100KB (static) or < 500KB (animated)
 * - Dimensions: 512x512 px exactly
 */
export async function validateStickerUrl(mediaUrl: string): Promise<StickerValidationResult> {
    try {
        if (!mediaUrl.toLowerCase().endsWith('.webp') && !mediaUrl.includes('.webp?')) {
            // Some signed URLs might not end in .webp but have it as a parameter, or have no extension. 
            // We proceed to check the actual file buffer but this is a quick warning heuristics.
        }

        const response = await fetch(mediaUrl);
        if (!response.ok) {
            return { isValid: false, error: 'Cannot download sticker image for validation' };
        }

        const buffer = await response.arrayBuffer();
        const sizeKB = buffer.byteLength / 1024;

        // Size Check (Arbitrary ceiling for both types for now since animated detection is complex without heavy parsing, max 500KB)
        if (sizeKB > 500) {
            return { isValid: false, error: `Sticker size (${sizeKB.toFixed(1)}KB) exceeds Meta limit (500KB)` };
        }

        const view = new DataView(buffer);

        // 1. Verify RIFF Header
        if (view.getUint32(0, false) !== 0x52494646) { // "RIFF"
            return { isValid: false, error: 'Not a valid RIFF file' };
        }

        // 2. Verify WEBP Signature
        if (view.getUint32(8, false) !== 0x57454250) { // "WEBP"
            return { isValid: false, error: 'Not a valid WEBP image' };
        }

        // 3. Extract dimensions (Simple WebP chunk parsing)
        const chunkHeader = view.getUint32(12, false);
        let width = 0;
        let height = 0;
        let isAnimated = false;

        if (chunkHeader === 0x56503820) { // "VP8 " (Lossy)
            // Dimensions in VP8 are at offset 26
            const sig = view.getUint32(23, false) & 0xFFFFFF; // 0x9d012a
            if (sig === 0x2a019d) {
                width = view.getUint16(26, true) & 0x3FFF;
                height = view.getUint16(28, true) & 0x3FFF;
            }
        } else if (chunkHeader === 0x5650384C) { // "VP8L" (Lossless)
            // Dimensions in VP8L are at offset 21
            const b1 = view.getUint8(21);
            const b2 = view.getUint8(22);
            const b3 = view.getUint8(23);
            const b4 = view.getUint8(24);
            width = 1 + (((b2 & 0x3F) << 8) | b1);
            height = 1 + (((b4 & 0x0F) << 10) | (b3 << 2) | ((b2 & 0xC0) >> 6));
        } else if (chunkHeader === 0x56503858) { // "VP8X" (Extended)
            // Extended format could be animated
            const flags = view.getUint8(20);
            isAnimated = (flags & 0x02) !== 0; // Check animation flag

            // Dimensions are 24-bit little endian at offset 24 and 27
            const w1 = view.getUint8(24);
            const w2 = view.getUint8(25);
            const w3 = view.getUint8(26);
            width = 1 + (w1 | (w2 << 8) | (w3 << 16));

            const h1 = view.getUint8(27);
            const h2 = view.getUint8(28);
            const h3 = view.getUint8(29);
            height = 1 + (h1 | (h2 << 8) | (h3 << 16));
        } else {
            return { isValid: false, error: 'Unsupported WebP internal format' };
        }

        // Strict Dimension Checking
        if (width !== 512 || height !== 512) {
            return { isValid: false, error: `Sticker dimensions must be exactly 512x512px (Got ${width}x${height})` };
        }

        // Strict Size Checking based on animation type
        if (!isAnimated && sizeKB > 100) {
            return { isValid: false, error: `Static sticker size (${sizeKB.toFixed(1)}KB) exceeds Meta limit (100KB)` };
        }

        return { isValid: true };

    } catch (e: any) {
        return { isValid: false, error: `Sticker validation error: ${e.message}` };
    }
}

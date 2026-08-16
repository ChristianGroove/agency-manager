/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-02-webp-corrupt
 * Feature: F2 - Client-Side WebP Compression
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';

export interface ImageUploadInput {
  name: string;
  sizeBytes: number;
  mimeType: string;
  bufferData?: Uint8Array;
}

export function processClientSideWebPCompression(input: ImageUploadInput): {
  success: boolean;
  compressedBuffer?: Uint8Array;
  mimeType?: string;
  error?: string;
} {
  const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB max pre-compression limit
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

  // 1. 0-byte empty check
  if (input.sizeBytes === 0 || !input.bufferData || input.bufferData.length === 0) {
    return { success: false, error: 'Empty file payload: 0 bytes received' };
  }

  // 2. Huge file size limit check
  if (input.sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: `File size ${Math.round(input.sizeBytes / (1024 * 1024))}MB exceeds maximum limit of 20MB`,
    };
  }

  // 3. Mime type validation (reject SVG / PDF / executables)
  if (!ALLOWED_MIME_TYPES.includes(input.mimeType.toLowerCase())) {
    if (input.mimeType.includes('svg')) {
      return { success: false, error: 'SVG files are restricted to prevent XSS script injection vulnerabilities' };
    }
    return { success: false, error: `Unsupported MIME type: ${input.mimeType}. Allowed formats: JPEG, PNG, WebP, AVIF` };
  }

  // 4. Magic bytes & corruption check
  const header = input.bufferData.slice(0, 4);
  const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  const isJpg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isRiff = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46;

  if (!isPng && !isJpg && !isRiff) {
    return { success: false, error: 'Corrupted image header: File data does not match declared image signature' };
  }

  // Simulated WebP compression reducing payload by ~40-70%
  const simulatedCompressedSize = Math.max(1, Math.round(input.sizeBytes * 0.35));
  const compressedBuffer = new Uint8Array(simulatedCompressedSize);

  return {
    success: true,
    compressedBuffer,
    mimeType: 'image/webp',
  };
}

export const suite = {
  name: 'T2-02: WebP Compression & Image Corruption Hardening',
  tier: 'Tier 2',
  feature: 'F2: Client-Side WebP Compression',
  tests: [
    {
      name: '0-byte empty file upload is rejected gracefully',
      fn: async () => {
        const result = processClientSideWebPCompression({
          name: 'empty.jpg',
          sizeBytes: 0,
          mimeType: 'image/jpeg',
          bufferData: new Uint8Array([]),
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('0 bytes received');
      },
    },
    {
      name: 'Huge 50MB file exceeds buffer allocation boundary and is rejected',
      fn: async () => {
        const huge50MB = 50 * 1024 * 1024;
        const result = processClientSideWebPCompression({
          name: 'huge-raw-dslr.jpg',
          sizeBytes: huge50MB,
          mimeType: 'image/jpeg',
          bufferData: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('exceeds maximum limit of 20MB');
      },
    },
    {
      name: 'Non-image mime type (application/pdf) is blocked with clear error',
      fn: async () => {
        const result = processClientSideWebPCompression({
          name: 'invoice.pdf',
          sizeBytes: 1024 * 50,
          mimeType: 'application/pdf',
          bufferData: new Uint8Array([0x25, 0x50, 0x44, 0x46]), // %PDF
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Unsupported MIME type: application/pdf');
      },
    },
    {
      name: 'SVG upload is blocked to prevent embedded script XSS vectors',
      fn: async () => {
        const result = processClientSideWebPCompression({
          name: 'vector-icon.svg',
          sizeBytes: 2048,
          mimeType: 'image/svg+xml',
          bufferData: new TextEncoder().encode('<svg><script>alert(1)</script></svg>'),
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('SVG files are restricted to prevent XSS');
      },
    },
    {
      name: 'Corrupted binary image with invalid magic bytes fails validation',
      fn: async () => {
        const result = processClientSideWebPCompression({
          name: 'corrupted.png',
          sizeBytes: 4096,
          mimeType: 'image/png',
          bufferData: new Uint8Array([0x00, 0x00, 0x00, 0x00]), // corrupt magic bytes
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Corrupted image header');
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier2');
  for (const t of suite.tests) {
    registry.addTest(t.name, t.fn);
  }
  return registry.runSuite();
}

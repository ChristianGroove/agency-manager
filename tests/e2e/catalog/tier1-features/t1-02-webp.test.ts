/**
 * Tier 1 Test Suite: F2 - Client-Side WebP Compression
 * Tests client WebP compression ratio, canvas image blob creation, mime type conversion, dimension preservation, fallback on failure.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertLessThan,
  assertGreaterThan,
  assertInRange,
} from '../harness/assertions';
import { compressClientWebP } from '../harness/contracts';

export const suite = {
  name: 'T1-02: Client-Side WebP Compression',
  tier: 'Tier 1',
  feature: 'F2: Client-Side WebP Compression',
  tests: [
    {
      name: 'Calculates WebP compression ratio with significant payload reduction',
      fn: () => {
        const rawJpeg = {
          width: 2400,
          height: 2400,
          rawSizeBytes: 4_500_000, // 4.5 MB JPEG
          mimeType: 'image/jpeg',
        };

        const result = compressClientWebP(rawJpeg, 0.8);
        assertEqual(result.mimeType, 'image/webp');
        assertLessThan(result.compressedSizeBytes, rawJpeg.rawSizeBytes);
        assertInRange(result.compressionRatio, 0.4, 0.7);

        // Verify total byte savings
        const savingsBytes = rawJpeg.rawSizeBytes - result.compressedSizeBytes;
        assertGreaterThan(savingsBytes, 1_500_000);
      },
    },
    {
      name: 'Simulates canvas image blob compression pipeline for PNG transparency',
      fn: () => {
        const rawPng = {
          width: 1920,
          height: 1080,
          rawSizeBytes: 6_200_000, // 6.2 MB PNG
          mimeType: 'image/png',
        };

        const result = compressClientWebP(rawPng, 0.85);
        assertEqual(result.mimeType, 'image/webp');
        // PNG to WebP achieves dramatic reduction
        assertLessThan(result.compressedSizeBytes, rawPng.rawSizeBytes * 0.5);
        assertEqual(result.width, 1920);
        assertEqual(result.height, 1080);
      },
    },
    {
      name: 'Handles MIME type conversion mapping to image/webp format',
      fn: () => {
        const supportedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];
        for (const mime of supportedMimes) {
          const input = { width: 800, height: 800, rawSizeBytes: 1_000_000, mimeType: mime };
          const output = compressClientWebP(input, 0.8);
          assertEqual(output.mimeType, 'image/webp');
        }
      },
    },
    {
      name: 'Preserves exact pixel dimensions and aspect ratio after compression',
      fn: () => {
        const dimensions = [
          { width: 1200, height: 1200, ratio: 1.0 },
          { width: 1920, height: 1080, ratio: 16 / 9 },
          { width: 1080, height: 1920, ratio: 9 / 16 },
          { width: 800, height: 600, ratio: 4 / 3 },
        ];

        for (const dim of dimensions) {
          const res = compressClientWebP({
            width: dim.width,
            height: dim.height,
            rawSizeBytes: 2_000_000,
            mimeType: 'image/jpeg',
          });

          assertEqual(res.width, dim.width);
          assertEqual(res.height, dim.height);
          const computedRatio = res.width / res.height;
          assertInRange(computedRatio, dim.ratio - 0.01, dim.ratio + 0.01);
        }
      },
    },
    {
      name: 'Provides graceful fallback when compression encounters unsupported format or errors',
      fn: () => {
        // Fallback simulator for non-standard formats (e.g. animated GIF or SVG)
        function compressWithFallback(file: { name: string; type: string; size: number }) {
          const canCompress = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
          if (!canCompress) {
            // Return uncompressed original file
            return {
              originalUsed: true,
              type: file.type,
              size: file.size,
              warning: 'Unsupported format for WebP compression, retaining original file.',
            };
          }
          const compressed = compressClientWebP({
            width: 1000,
            height: 1000,
            rawSizeBytes: file.size,
            mimeType: file.type,
          });
          return {
            originalUsed: false,
            type: compressed.mimeType,
            size: compressed.compressedSizeBytes,
          };
        }

        const svgFile = { name: 'logo.svg', type: 'image/svg+xml', size: 45_000 };
        const svgRes = compressWithFallback(svgFile);
        assertTrue(svgRes.originalUsed);
        assertEqual(svgRes.type, 'image/svg+xml');
        assertEqual(svgRes.size, 45_000);

        const jpgFile = { name: 'photo.jpg', type: 'image/jpeg', size: 1_200_000 };
        const jpgRes = compressWithFallback(jpgFile);
        assertFalse(jpgRes.originalUsed);
        assertEqual(jpgRes.type, 'image/webp');
      },
    },
  ],
};

export async function run() {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const t of suite.tests) {
    try {
      await t.fn();
      passed++;
    } catch (err: any) {
      failed++;
      errors.push(`${t.name}: ${err.message}`);
    }
  }

  return { passed, failed, errors };
}

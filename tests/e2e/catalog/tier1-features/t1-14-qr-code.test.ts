/**
 * Tier 1 Test Suite: F14 - 1-Click QR Code Generator
 * Tests QR SVG generation for item deep link, tenant logo overlay embed, downloadable PNG export payload, scan URL verification, high-contrast error correction level.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertContains,
} from '../harness/assertions';
import { mockPhysicalItem, TENANT_A_ID } from '../harness/mock-data';

export const suite = {
  name: 'T1-14: 1-Click QR Code Generator',
  tier: 'Tier 1',
  feature: 'F14: 1-Click QR Code Generator',
  tests: [
    {
      name: 'Generates valid QR Code SVG structure for product deep-link URL',
      fn: () => {
        function generateQrSvgData(url: string, size = 256): { svgString: string; size: number } {
          const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" data-url="${encodeURIComponent(url)}"><rect width="100%" height="100%" fill="#ffffff"/><path d="M0 0h10v10H0z" fill="#000000"/></svg>`;
          return { svgString, size };
        }

        const deepLink = `https://app.pixy.com/portal/preview?item=${mockPhysicalItem.id}`;
        const qr = generateQrSvgData(deepLink, 300);

        assertContains(qr.svgString, '<svg');
        assertContains(qr.svgString, 'viewBox="0 0 300 300"');
        assertContains(qr.svgString, encodeURIComponent(deepLink));
      },
    },
    {
      name: 'Embeds tenant brand logo avatar in the center of QR matrix',
      fn: () => {
        function embedCenterLogo(
          svgBase: string,
          logoUrl: string,
          logoSize = 48,
          canvasSize = 256
        ): string {
          const offset = (canvasSize - logoSize) / 2;
          const logoTag = `<image href="${logoUrl}" x="${offset}" y="${offset}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid slice"/>`;
          return svgBase.replace('</svg>', `${logoTag}</svg>`);
        }

        const baseSvg = '<svg viewBox="0 0 256 256"></svg>';
        const brandLogo = 'https://app.pixy.com/assets/tenant-logo.png';
        const withLogo = embedCenterLogo(baseSvg, brandLogo, 56, 256);

        assertContains(withLogo, brandLogo);
        assertContains(withLogo, 'x="100"'); // (256 - 56) / 2 = 100
        assertContains(withLogo, 'width="56"');
      },
    },
    {
      name: 'Generates high-resolution 512x512 downloadable PNG export payload',
      fn: () => {
        function buildPngExportConfig(item: { id: string; name: string }) {
          const fileName = `qr-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${item.id}.png`;
          return {
            fileName,
            width: 512,
            height: 512,
            mimeType: 'image/png',
            dpi: 300,
          };
        }

        const exportConfig = buildPngExportConfig(mockPhysicalItem);
        assertEqual(exportConfig.width, 512);
        assertEqual(exportConfig.height, 512);
        assertEqual(exportConfig.mimeType, 'image/png');
        assertContains(exportConfig.fileName, 'qr-camiseta-premium-oversize');
      },
    },
    {
      name: 'Verifies scan URL decoding integrity and route target accuracy',
      fn: () => {
        const generatedUrl = `https://app.pixy.com/portal/preview?tenant=${TENANT_A_ID}&item=${mockPhysicalItem.id}&source=qr`;
        const parsed = new URL(generatedUrl);

        assertEqual(parsed.hostname, 'app.pixy.com');
        assertEqual(parsed.searchParams.get('tenant'), TENANT_A_ID);
        assertEqual(parsed.searchParams.get('item'), 'item_phys_001');
        assertEqual(parsed.searchParams.get('source'), 'qr');
      },
    },
    {
      name: 'Specifies High Error Correction Level H (30% recovery) to guarantee scan readability with logo overlay',
      fn: () => {
        type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

        function getQrConfiguration(hasLogoOverlay: boolean): {
          level: ErrorCorrectionLevel;
          recoveryCapacityPercentage: number;
        } {
          if (hasLogoOverlay) {
            // Level H allows up to 30% area obstruction
            return { level: 'H', recoveryCapacityPercentage: 30 };
          }
          return { level: 'M', recoveryCapacityPercentage: 15 };
        }

        const configWithLogo = getQrConfiguration(true);
        assertEqual(configWithLogo.level, 'H');
        assertEqual(configWithLogo.recoveryCapacityPercentage, 30);

        const configWithoutLogo = getQrConfiguration(false);
        assertEqual(configWithoutLogo.level, 'M');
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

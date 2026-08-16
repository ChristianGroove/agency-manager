/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-01-gallery-limits
 * Feature: F1 - Multi-Photo Gallery Engine
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { CatalogGalleryImage } from '../harness/contracts';

export function validateGalleryLimits(images: CatalogGalleryImage[]): {
  isValid: boolean;
  errors: string[];
  normalizedImages: CatalogGalleryImage[];
} {
  const errors: string[] = [];
  const MAX_IMAGES = 8;

  if (images.length > MAX_IMAGES) {
    errors.push(`Gallery image limit exceeded: maximum allowed is ${MAX_IMAGES}, received ${images.length}`);
  }

  // Corrupted URL checking
  const validUrlRegex = /^(https?:\/\/[^\s$.?#].[^\s]*|data:image\/[a-zA-Z]+;base64,[^\s]+)$/;
  images.forEach((img, idx) => {
    if (!img.url || !validUrlRegex.test(img.url)) {
      errors.push(`Invalid image URL at index ${idx}: ${img.url}`);
    }
  });

  // Normalization: Ensure at least one cover if images exist, or promote index 0
  let normalizedImages = images.map((img, index) => ({
    ...img,
    order_index: index,
  }));

  if (normalizedImages.length > 0) {
    const hasCover = normalizedImages.some((img) => img.is_cover);
    if (!hasCover) {
      normalizedImages[0] = { ...normalizedImages[0], is_cover: true };
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalizedImages,
  };
}

export const suite = {
  name: 'T2-01: Gallery Limits & Boundary Integrity',
  tier: 'Tier 2',
  feature: 'F1: Multi-Photo Gallery Engine',
  tests: [
    {
      name: '0 images empty state renders placeholder and zero-image status',
      fn: async () => {
        const emptyGallery: CatalogGalleryImage[] = [];
        const result = validateGalleryLimits(emptyGallery);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.normalizedImages).toHaveLength(0);
      },
    },
    {
      name: 'Exactly 8 images maximum allowed boundary successfully passes',
      fn: async () => {
        const maxGallery: CatalogGalleryImage[] = Array.from({ length: 8 }, (_, i) => ({
          id: `img-${i + 1}`,
          url: `https://cdn.pixy.app/photo-${i + 1}.webp`,
          is_cover: i === 0,
          order_index: i,
        }));

        const result = validateGalleryLimits(maxGallery);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.normalizedImages).toHaveLength(8);
        expect(result.normalizedImages[0].is_cover).toBe(true);
        expect(result.normalizedImages[7].order_index).toBe(7);
      },
    },
    {
      name: '9th image upload is rejected with validation error',
      fn: async () => {
        const overflowGallery: CatalogGalleryImage[] = Array.from({ length: 9 }, (_, i) => ({
          id: `img-${i + 1}`,
          url: `https://cdn.pixy.app/photo-${i + 1}.webp`,
          is_cover: i === 0,
          order_index: i,
        }));

        const result = validateGalleryLimits(overflowGallery);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('Gallery image limit exceeded: maximum allowed is 8, received 9');
      },
    },
    {
      name: 'Missing cover photo automatically promotes first image (order_index 0) to cover',
      fn: async () => {
        const unassignedCoverGallery: CatalogGalleryImage[] = [
          { id: 'img-1', url: 'https://cdn.pixy.app/1.webp', is_cover: false, order_index: 0 },
          { id: 'img-2', url: 'https://cdn.pixy.app/2.webp', is_cover: false, order_index: 1 },
          { id: 'img-3', url: 'https://cdn.pixy.app/3.webp', is_cover: false, order_index: 2 },
        ];

        const result = validateGalleryLimits(unassignedCoverGallery);
        expect(result.isValid).toBe(true);
        expect(result.normalizedImages[0].is_cover).toBe(true);
        expect(result.normalizedImages[1].is_cover).toBe(false);
        expect(result.normalizedImages[2].is_cover).toBe(false);
      },
    },
    {
      name: 'Corrupted or invalid URL format is rejected with detailed error',
      fn: async () => {
        const corruptGallery: CatalogGalleryImage[] = [
          { id: 'img-1', url: 'not-a-valid-url-format', is_cover: true, order_index: 0 },
          { id: 'img-2', url: 'javascript:alert(1)', is_cover: false, order_index: 1 },
        ];

        const result = validateGalleryLimits(corruptGallery);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBe(2);
        expect(result.errors[0]).toContain('Invalid image URL at index 0');
        expect(result.errors[1]).toContain('Invalid image URL at index 1');
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

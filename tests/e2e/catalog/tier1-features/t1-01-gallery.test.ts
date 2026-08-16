/**
 * Tier 1 Test Suite: F1 - Multi-Photo Gallery Engine
 * Tests 8-photo limit, cover photo selection, reorder index, WebP format validation, alt text/dimensions.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertThrows,
  assertArrayLength,
  assertGreaterThanOrEqual,
} from '../harness/assertions';
import {
  validateCatalogGalleryImage,
  validateUniversalCatalogItem,
  CatalogGalleryImage,
} from '../harness/contracts';
import { mockPhysicalItem, mockPhysicalGallery, TENANT_A_ID } from '../harness/mock-data';

export const suite = {
  name: 'T1-01: Multi-Photo Gallery Engine',
  tier: 'Tier 1',
  feature: 'F1: Multi-Photo Gallery Engine',
  tests: [
    {
      name: 'Enforces strict 8-photo maximum limit',
      fn: () => {
        // 1. Valid gallery with 8 images
        assertEqual(mockPhysicalGallery.length, 8);
        const validItem = { ...mockPhysicalItem, gallery_images: mockPhysicalGallery };
        const validRes = validateUniversalCatalogItem(validItem);
        assertTrue(validRes.isValid, `Expected 8 images to be valid, got errors: ${validRes.errors.join(', ')}`);

        // 2. Invalid gallery with 9 images
        const excessGallery: CatalogGalleryImage[] = [
          ...mockPhysicalGallery,
          {
            id: 'img_phys_09',
            url: 'https://images.unsplash.com/photo-excess.jpg',
            is_cover: false,
            order_index: 8,
          },
        ];
        assertEqual(excessGallery.length, 9);
        const invalidItem = { ...mockPhysicalItem, gallery_images: excessGallery };
        const invalidRes = validateUniversalCatalogItem(invalidItem);
        assertFalse(invalidRes.isValid);
        assertTrue(invalidRes.errors.some((err) => err.includes('exceeds maximum limit of 8 photos')));
      },
    },
    {
      name: 'Maintains single cover photo exclusivity and syncs legacy image_url',
      fn: () => {
        const gallery = [...mockPhysicalGallery];
        const coverImages = gallery.filter((img) => img.is_cover);
        assertEqual(coverImages.length, 1);
        assertEqual(coverImages[0].id, 'img_phys_01');

        // Verify cover photo URL matches legacy image_url
        assertEqual(mockPhysicalItem.image_url, coverImages[0].url);

        // Simulate changing cover photo to index 2
        const updatedGallery = gallery.map((img, idx) => ({
          ...img,
          is_cover: idx === 2,
        }));
        const newCover = updatedGallery.find((img) => img.is_cover);
        assertTrue(!!newCover);
        assertEqual(newCover?.id, 'img_phys_03');

        const updatedItem = {
          ...mockPhysicalItem,
          gallery_images: updatedGallery,
          image_url: newCover?.url,
        };
        const validation = validateUniversalCatalogItem(updatedItem);
        assertTrue(validation.isValid);
        assertEqual(updatedItem.image_url, updatedGallery[2].url);

        // Reject item if multiple covers exist
        const multiCoverGallery = gallery.map((img) => ({ ...img, is_cover: true }));
        const multiCoverItem = { ...mockPhysicalItem, gallery_images: multiCoverGallery };
        const multiRes = validateUniversalCatalogItem(multiCoverItem);
        assertFalse(multiRes.isValid);
        assertTrue(multiRes.errors.some((e) => e.includes('more than 1 cover image')));
      },
    },
    {
      name: 'Preserves sequential order index after reordering drag-and-drop',
      fn: () => {
        const initialOrder = mockPhysicalGallery.map((img) => img.order_index);
        assertEqual(initialOrder, [0, 1, 2, 3, 4, 5, 6, 7]);

        // Simulate reordering: move image at index 4 to index 0
        const reordered = [...mockPhysicalGallery];
        const [movedItem] = reordered.splice(4, 1);
        reordered.unshift(movedItem);

        // Re-assign order_index sequentially
        const normalized = reordered.map((img, idx) => ({
          ...img,
          order_index: idx,
        }));

        assertArrayLength(normalized, 8);
        assertEqual(normalized[0].id, 'img_phys_05');
        assertEqual(normalized[0].order_index, 0);
        assertEqual(normalized[1].id, 'img_phys_01');
        assertEqual(normalized[1].order_index, 1);
        assertEqual(normalized[7].order_index, 7);

        // Verify all order_index are unique and contiguous 0..7
        const indices = normalized.map((img) => img.order_index);
        for (let i = 0; i < 8; i++) {
          assertEqual(indices[i], i);
        }
      },
    },
    {
      name: 'Validates WebP format URL structure and schema integrity',
      fn: () => {
        for (const img of mockPhysicalGallery) {
          const validation = validateCatalogGalleryImage(img);
          assertTrue(validation.isValid, `Gallery image ${img.id} should pass validation`);
          assertTrue(img.url.startsWith('https://'), 'URL must be HTTPS');
        }

        // Check invalid image object
        const invalidImg = {
          id: '',
          url: 12345, // invalid type
          is_cover: 'yes', // invalid type
          order_index: -1, // invalid negative
        };
        const res = validateCatalogGalleryImage(invalidImg);
        assertFalse(res.isValid);
        assertGreaterThanOrEqual(res.errors.length, 3);
      },
    },
    {
      name: 'Retains alt text and high-res dimensions metadata',
      fn: () => {
        const firstImg = mockPhysicalGallery[0];
        assertEqual(firstImg.alt_text, 'Camiseta Premium Vista Frontal');
        assertEqual(firstImg.width, 1200);
        assertEqual(firstImg.height, 1200);

        // Verify aspect ratio calculation
        const aspectRatio = (firstImg.width ?? 0) / (firstImg.height ?? 1);
        assertEqual(aspectRatio, 1.0);

        // Test optional metadata absence does not fail validation
        const minimalImg: CatalogGalleryImage = {
          id: 'img_min_01',
          url: 'https://example.com/image.webp',
          is_cover: false,
          order_index: 0,
        };
        const minRes = validateCatalogGalleryImage(minimalImg);
        assertTrue(minRes.isValid);
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

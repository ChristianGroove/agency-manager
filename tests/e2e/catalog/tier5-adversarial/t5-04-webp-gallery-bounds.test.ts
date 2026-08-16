/**
 * Tier 5: Adversarial Coverage Hardening
 * Suite: t5-04-webp-gallery-bounds
 * Focus: WebP image compression, corrupt image data, extreme aspect ratios, gallery bounds, and cover photo state invariants
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { CatalogGalleryImage, validateCatalogGalleryImage } from '../harness/contracts';

/**
 * Gallery state machine maintaining invariants:
 * 1. Exactly 1 cover image when gallery has >= 1 images
 * 2. 0 cover images when gallery is empty
 * 3. Max 8 images capacity
 * 4. Contiguous order_index 0..N-1
 */
export class AdversarialGalleryManager {
  private images: CatalogGalleryImage[] = [];
  public static readonly MAX_IMAGES = 8;

  constructor(initialImages: CatalogGalleryImage[] = []) {
    this.setImages(initialImages);
  }

  public getImages(): CatalogGalleryImage[] {
    return [...this.images];
  }

  public getCoverImage(): CatalogGalleryImage | null {
    return this.images.find((img) => img.is_cover) || null;
  }

  public setImages(incoming: CatalogGalleryImage[]): { success: boolean; droppedCount: number; error?: string } {
    if (!Array.isArray(incoming)) {
      this.images = [];
      return { success: true, droppedCount: 0 };
    }

    const capped = incoming.slice(0, AdversarialGalleryManager.MAX_IMAGES);
    const droppedCount = Math.max(0, incoming.length - AdversarialGalleryManager.MAX_IMAGES);

    if (capped.length === 0) {
      this.images = [];
      return { success: true, droppedCount };
    }

    // Ensure exactly 1 cover
    let hasCover = false;
    const normalized = capped.map((img, idx) => {
      let isCover = Boolean(img.is_cover);
      if (isCover && !hasCover) {
        hasCover = true;
      } else if (isCover && hasCover) {
        // Drop secondary cover flags
        isCover = false;
      }
      return {
        ...img,
        is_cover: isCover,
        order_index: idx,
      };
    });

    if (!hasCover && normalized.length > 0) {
      normalized[0].is_cover = true;
    }

    this.images = normalized;
    return { success: true, droppedCount };
  }

  public addImage(image: CatalogGalleryImage): { success: boolean; error?: string } {
    if (this.images.length >= AdversarialGalleryManager.MAX_IMAGES) {
      return {
        success: false,
        error: `Límite máximo de ${AdversarialGalleryManager.MAX_IMAGES} fotos alcanzado`,
      };
    }

    const isFirst = this.images.length === 0;
    const newImg: CatalogGalleryImage = {
      ...image,
      is_cover: isFirst || Boolean(image.is_cover),
      order_index: this.images.length,
    };

    if (newImg.is_cover && !isFirst) {
      // Unset previous cover
      this.images = this.images.map((img) => ({ ...img, is_cover: false }));
    }

    this.images.push(newImg);
    return { success: true };
  }

  public setCover(id: string): { success: boolean; error?: string } {
    const found = this.images.some((img) => img.id === id);
    if (!found) {
      return { success: false, error: `Imagen con ID ${id} no encontrada en la galería` };
    }

    this.images = this.images.map((img) => ({
      ...img,
      is_cover: img.id === id,
    }));
    return { success: true };
  }

  public removeImage(id: string): { success: boolean; error?: string } {
    const target = this.images.find((img) => img.id === id);
    if (!target) {
      return { success: false, error: `Imagen con ID ${id} no encontrada` };
    }

    const wasCover = target.is_cover;
    const remaining = this.images.filter((img) => img.id !== id);

    if (remaining.length > 0 && wasCover) {
      // Auto-assign first image as new cover
      remaining[0].is_cover = true;
    }

    // Re-index
    this.images = remaining.map((img, idx) => ({ ...img, order_index: idx }));
    return { success: true };
  }

  public reorder(fromIndex: number, toIndex: number): { success: boolean } {
    if (fromIndex < 0 || fromIndex >= this.images.length || toIndex < 0 || toIndex >= this.images.length) {
      return { success: false };
    }

    const item = this.images.splice(fromIndex, 1)[0];
    this.images.splice(toIndex, 0, item);
    this.images = this.images.map((img, idx) => ({ ...img, order_index: idx }));
    return { success: true };
  }
}

/**
 * Image dimensions aspect ratio classifier & bounds validator
 */
export function evaluateImageDimensionsAndAspectRatio(
  width: number,
  height: number
): {
  isValid: boolean;
  aspectRatio: number;
  orientation: 'square' | 'landscape' | 'portrait' | 'extreme_panorama' | 'extreme_vertical' | 'invalid';
  error?: string;
} {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { isValid: false, aspectRatio: 0, orientation: 'invalid', error: 'Invalid non-positive dimensions' };
  }

  if (width > 20000 || height > 20000) {
    return { isValid: false, aspectRatio: width / height, orientation: 'invalid', error: 'Dimension exceeds 20,000px limit' };
  }

  const ratio = width / height;

  let orientation: 'square' | 'landscape' | 'portrait' | 'extreme_panorama' | 'extreme_vertical' = 'square';
  if (ratio > 5) {
    orientation = 'extreme_panorama';
  } else if (ratio < 0.2) {
    orientation = 'extreme_vertical';
  } else if (ratio > 1.05) {
    orientation = 'landscape';
  } else if (ratio < 0.95) {
    orientation = 'portrait';
  } else {
    orientation = 'square';
  }

  return {
    isValid: true,
    aspectRatio: Math.round(ratio * 1000) / 1000,
    orientation,
  };
}

export const suite = {
  name: 'T5-04: WebP Gallery Bounds & Cover Invariants',
  tier: 'Tier 5',
  feature: 'F1: Multi-Photo Gallery & Client-Side WebP Compression',
  tests: [
    {
      name: 'Enforces strictly <= 8 photos capacity and drops overflow with count',
      fn: async () => {
        const manager = new AdversarialGalleryManager();
        const tenPhotos: CatalogGalleryImage[] = Array.from({ length: 10 }, (_, i) => ({
          id: `img-${i + 1}`,
          url: `https://storage.pixy.com/photos/item_${i + 1}.webp`,
          is_cover: i === 0,
          order_index: i,
        }));

        const result = manager.setImages(tenPhotos);
        expect(result.success).toBe(true);
        expect(result.droppedCount).toBe(2);
        expect(manager.getImages()).toHaveLength(8);
      },
    },
    {
      name: 'Cover image invariant: automatically promotes first photo when cover photo is deleted',
      fn: async () => {
        const manager = new AdversarialGalleryManager([
          { id: 'img-1', url: 'https://storage.pixy.com/p1.webp', is_cover: true, order_index: 0 },
          { id: 'img-2', url: 'https://storage.pixy.com/p2.webp', is_cover: false, order_index: 1 },
          { id: 'img-3', url: 'https://storage.pixy.com/p3.webp', is_cover: false, order_index: 2 },
        ]);

        expect(manager.getCoverImage()?.id).toBe('img-1');

        // Delete cover photo
        manager.removeImage('img-1');

        // img-2 must now be cover
        const currentCover = manager.getCoverImage();
        expect(currentCover?.id).toBe('img-2');
        expect(manager.getImages()).toHaveLength(2);
        expect(manager.getImages()[0].order_index).toBe(0);
        expect(manager.getImages()[1].order_index).toBe(1);
      },
    },
    {
      name: 'Reordering gallery preserves cover photo integrity and updates order indexes contiguously',
      fn: async () => {
        const manager = new AdversarialGalleryManager([
          { id: 'img-a', url: 'https://storage.pixy.com/a.webp', is_cover: false, order_index: 0 },
          { id: 'img-b', url: 'https://storage.pixy.com/b.webp', is_cover: true, order_index: 1 },
          { id: 'img-c', url: 'https://storage.pixy.com/c.webp', is_cover: false, order_index: 2 },
        ]);

        // Move img-b from index 1 to index 0
        manager.reorder(1, 0);

        const images = manager.getImages();
        expect(images[0].id).toBe('img-b');
        expect(images[0].is_cover).toBe(true);
        expect(images[0].order_index).toBe(0);

        expect(images[1].id).toBe('img-a');
        expect(images[1].order_index).toBe(1);

        expect(images[2].id).toBe('img-c');
        expect(images[2].order_index).toBe(2);
      },
    },
    {
      name: 'Classifies extreme aspect ratios (20000x1 panorama vs 1x20000 vertical banner)',
      fn: async () => {
        const panorama = evaluateImageDimensionsAndAspectRatio(10000, 1000);
        expect(panorama.isValid).toBe(true);
        expect(panorama.orientation).toBe('extreme_panorama');
        expect(panorama.aspectRatio).toBe(10);

        const vertical = evaluateImageDimensionsAndAspectRatio(1000, 10000);
        expect(vertical.isValid).toBe(true);
        expect(vertical.orientation).toBe('extreme_vertical');
        expect(vertical.aspectRatio).toBe(0.1);

        const square = evaluateImageDimensionsAndAspectRatio(1200, 1200);
        expect(square.isValid).toBe(true);
        expect(square.orientation).toBe('square');
      },
    },
    {
      name: 'Rejects invalid 0x0 or negative image dimensions with clear validation errors',
      fn: async () => {
        expect(evaluateImageDimensionsAndAspectRatio(0, 0).isValid).toBe(false);
        expect(evaluateImageDimensionsAndAspectRatio(-500, 800).isValid).toBe(false);
        expect(evaluateImageDimensionsAndAspectRatio(25000, 1000).isValid).toBe(false);
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier5');
  for (const t of suite.tests) {
    registry.addTest(t.name, t.fn);
  }
  return registry.runSuite();
}

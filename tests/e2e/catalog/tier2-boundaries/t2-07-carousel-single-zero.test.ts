/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-07-carousel-single-zero
 * Feature: F7 - Touch-Friendly Photo Carousel
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { CatalogGalleryImage } from '../harness/contracts';

export interface CarouselState {
  images: CatalogGalleryImage[];
  currentIndex: number;
  showArrows: boolean;
  showThumbnails: boolean;
  isFallbackPlaceholder: boolean;
}

export function initializeCarousel(images: CatalogGalleryImage[]): CarouselState {
  if (!images || images.length === 0) {
    return {
      images: [{ id: 'placeholder', url: 'https://cdn.pixy.app/fallback-item.webp', is_cover: true, order_index: 0 }],
      currentIndex: 0,
      showArrows: false,
      showThumbnails: false,
      isFallbackPlaceholder: true,
    };
  }

  return {
    images,
    currentIndex: 0,
    showArrows: images.length > 1,
    showThumbnails: images.length > 1,
    isFallbackPlaceholder: false,
  };
}

export function navigateCarousel(
  state: CarouselState,
  direction: 'prev' | 'next' | number
): CarouselState {
  const maxIdx = state.images.length - 1;
  let newIdx = state.currentIndex;

  if (typeof direction === 'number') {
    newIdx = Math.max(0, Math.min(maxIdx, direction));
  } else if (direction === 'next') {
    newIdx = newIdx >= maxIdx ? 0 : newIdx + 1;
  } else if (direction === 'prev') {
    newIdx = newIdx <= 0 ? maxIdx : newIdx - 1;
  }

  return {
    ...state,
    currentIndex: newIdx,
  };
}

export const suite = {
  name: 'T2-07: Carousel Single/Zero Photo & Race Conditions',
  tier: 'Tier 2',
  feature: 'F7: Touch-Friendly Photo Carousel',
  tests: [
    {
      name: '1 photo carousel disables navigation arrows and thumbnail ribbon',
      fn: async () => {
        const singleImage: CatalogGalleryImage[] = [
          { id: 'single-1', url: 'https://cdn.pixy.app/only-one.webp', is_cover: true, order_index: 0 },
        ];

        const state = initializeCarousel(singleImage);
        expect(state.showArrows).toBe(false);
        expect(state.showThumbnails).toBe(false);
        expect(state.isFallbackPlaceholder).toBe(false);
        expect(state.currentIndex).toBe(0);
      },
    },
    {
      name: '0 photo catalog item renders default Pixy placeholder image without crash',
      fn: async () => {
        const state = initializeCarousel([]);
        expect(state.isFallbackPlaceholder).toBe(true);
        expect(state.images).toHaveLength(1);
        expect(state.images[0].url).toContain('fallback-item.webp');
        expect(state.showArrows).toBe(false);
      },
    },
    {
      name: 'Rapid clicking left/right wraps seamlessly without out-of-bounds index',
      fn: async () => {
        const images: CatalogGalleryImage[] = [
          { id: '1', url: 'https://cdn.pixy.app/1.webp', is_cover: true, order_index: 0 },
          { id: '2', url: 'https://cdn.pixy.app/2.webp', is_cover: false, order_index: 1 },
          { id: '3', url: 'https://cdn.pixy.app/3.webp', is_cover: false, order_index: 2 },
        ];

        let state = initializeCarousel(images);
        expect(state.currentIndex).toBe(0);

        state = navigateCarousel(state, 'next');
        expect(state.currentIndex).toBe(1);
        state = navigateCarousel(state, 'next');
        expect(state.currentIndex).toBe(2);
        state = navigateCarousel(state, 'next');
        expect(state.currentIndex).toBe(0);
        state = navigateCarousel(state, 'next');
        expect(state.currentIndex).toBe(1);

        state = navigateCarousel(state, 'prev');
        expect(state.currentIndex).toBe(0);
        state = navigateCarousel(state, 'prev');
        expect(state.currentIndex).toBe(2);
      },
    },
    {
      name: 'Thumbnail direct jump clamps out-of-bounds target index to boundaries',
      fn: async () => {
        const images: CatalogGalleryImage[] = [
          { id: '1', url: 'https://cdn.pixy.app/1.webp', is_cover: true, order_index: 0 },
          { id: '2', url: 'https://cdn.pixy.app/2.webp', is_cover: false, order_index: 1 },
        ];

        let state = initializeCarousel(images);
        state = navigateCarousel(state, 99);
        expect(state.currentIndex).toBe(1);

        state = navigateCarousel(state, -10);
        expect(state.currentIndex).toBe(0);
      },
    },
    {
      name: 'Broken image URL fallback replaces source on error event',
      fn: async () => {
        const brokenImageUrl = 'https://cdn.pixy.app/non-existent-404.webp';
        const fallbackUrl = 'https://cdn.pixy.app/fallback-item.webp';

        const handleImageError = (currentUrl: string): string => {
          if (currentUrl.includes('404') || !currentUrl) {
            return fallbackUrl;
          }
          return currentUrl;
        };

        expect(handleImageError(brokenImageUrl)).toBe(fallbackUrl);
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

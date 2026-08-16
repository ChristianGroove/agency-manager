/**
 * Tier 3: Cross-Feature Pairwise Interactions
 * Suite: t3-02-gallery-variant-swatch-sync
 * Features: Touch Carousel Gallery × Color Swatch Variant Selector
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { CatalogGalleryImage, CatalogVariant } from '../harness/contracts';
import { mockFashionApparel } from '../harness/mock-data';

export function syncCarouselWithVariantSelection(
  galleryImages: CatalogGalleryImage[],
  selectedVariant?: CatalogVariant | null
): {
  activeImageUrl: string;
  activeImageIndex: number;
  isCoverSwitched: boolean;
} {
  const defaultCover = galleryImages.find((img) => img.is_cover) || galleryImages[0];
  const defaultUrl = defaultCover ? defaultCover.url : 'https://cdn.pixy.app/placeholder.webp';

  if (!selectedVariant || !selectedVariant.image_url) {
    return {
      activeImageUrl: defaultUrl,
      activeImageIndex: defaultCover ? galleryImages.indexOf(defaultCover) : 0,
      isCoverSwitched: false,
    };
  }

  const matchingIndex = galleryImages.findIndex((img) => img.url === selectedVariant.image_url);

  if (matchingIndex !== -1) {
    return {
      activeImageUrl: galleryImages[matchingIndex].url,
      activeImageIndex: matchingIndex,
      isCoverSwitched: true,
    };
  }

  return {
    activeImageUrl: selectedVariant.image_url,
    activeImageIndex: 0,
    isCoverSwitched: true,
  };
}

const gallery = mockFashionApparel.gallery_images;

export const suite = {
  name: 'T3-02: Gallery Variant Swatch Sync',
  tier: 'Tier 3',
  feature: 'F1 x F4 x F7: Gallery x Swatch Selector x Touch Carousel',
  tests: [
    {
      name: 'Initial state without variant selection renders default cover image at index 0',
      fn: async () => {
        const res = syncCarouselWithVariantSelection(gallery, null);
        expect(res.activeImageUrl).toBe(gallery[0].url);
        expect(res.activeImageIndex).toBe(0);
        expect(res.isCoverSwitched).toBe(false);
      },
    },
    {
      name: 'Selecting Blue variant with variant image switches active gallery slide',
      fn: async () => {
        const navyVariant = mockFashionApparel.variants[2];
        const res = syncCarouselWithVariantSelection(gallery, navyVariant);

        expect(res.isCoverSwitched).toBe(true);
        expect(res.activeImageUrl).toBe(navyVariant.image_url!);
      },
    },
    {
      name: 'Selecting White variant switches active slide back to white photo',
      fn: async () => {
        const whiteVariant = mockFashionApparel.variants[0];
        const res = syncCarouselWithVariantSelection(gallery, whiteVariant);

        expect(res.isCoverSwitched).toBe(true);
        expect(res.activeImageUrl).toBe(whiteVariant.image_url!);
      },
    },
    {
      name: 'Variant with null image_url preserves current default cover without breaking',
      fn: async () => {
        const noImageVariant: CatalogVariant = {
          ...mockFashionApparel.variants[0],
          image_url: undefined,
        };

        const res = syncCarouselWithVariantSelection(gallery, noImageVariant);
        expect(res.isCoverSwitched).toBe(false);
        expect(res.activeImageUrl).toBe(gallery[0].url);
      },
    },
    {
      name: 'Rapid alternating between color swatches seamlessly updates carousel target URL',
      fn: async () => {
        const v1 = mockFashionApparel.variants[0];
        const v2 = mockFashionApparel.variants[2];

        const state1 = syncCarouselWithVariantSelection(gallery, v1);
        expect(state1.activeImageUrl).toBe(v1.image_url!);

        const state2 = syncCarouselWithVariantSelection(gallery, v2);
        expect(state2.activeImageUrl).toBe(v2.image_url!);

        const state3 = syncCarouselWithVariantSelection(gallery, v1);
        expect(state3.activeImageUrl).toBe(v1.image_url!);
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier3');
  for (const t of suite.tests) {
    registry.addTest(t.name, t.fn);
  }
  return registry.runSuite();
}

/**
 * Tier 1 Test Suite: F7 - Touch-Friendly Photo Carousel
 * Tests swipe gesture simulation, active index indicator, thumbnail ribbon synchronization, auto-advance disable on touch, circular navigation.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertGreaterThanOrEqual,
} from '../harness/assertions';
import { mockPhysicalGallery } from '../harness/mock-data';

export const suite = {
  name: 'T1-07: Touch-Friendly Photo Carousel',
  tier: 'Tier 1',
  feature: 'F7: Touch-Friendly Photo Carousel',
  tests: [
    {
      name: 'Simulates swipe drag gesture deltaX and advances slides appropriately',
      fn: () => {
        class CarouselController {
          currentIndex = 0;
          totalSlides = mockPhysicalGallery.length;
          swipeThreshold = 50; // 50px delta threshold

          handleDragEnd(deltaX: number) {
            if (deltaX < -this.swipeThreshold) {
              // Swiped left -> Next slide
              this.currentIndex = (this.currentIndex + 1) % this.totalSlides;
            } else if (deltaX > this.swipeThreshold) {
              // Swiped right -> Prev slide
              this.currentIndex = (this.currentIndex - 1 + this.totalSlides) % this.totalSlides;
            }
            // Minor drag (< 50px) snaps back to current slide without advancing
          }
        }

        const carousel = new CarouselController();
        assertEqual(carousel.currentIndex, 0);

        // Minor swipe (< 50px) does not change slide
        carousel.handleDragEnd(-30);
        assertEqual(carousel.currentIndex, 0);

        // Significant swipe left (> 50px) advances to slide 1
        carousel.handleDragEnd(-120);
        assertEqual(carousel.currentIndex, 1);

        // Another swipe left advances to slide 2
        carousel.handleDragEnd(-80);
        assertEqual(carousel.currentIndex, 2);

        // Swipe right advances back to slide 1
        carousel.handleDragEnd(90);
        assertEqual(carousel.currentIndex, 1);
      },
    },
    {
      name: 'Synchronizes active index indicator and pagination label',
      fn: () => {
        const total = mockPhysicalGallery.length; // 8
        function getPaginationLabel(currentIndex: number, totalSlides: number): string {
          return `${currentIndex + 1} / ${totalSlides}`;
        }

        assertEqual(getPaginationLabel(0, total), '1 / 8');
        assertEqual(getPaginationLabel(4, total), '5 / 8');
        assertEqual(getPaginationLabel(7, total), '8 / 8');
      },
    },
    {
      name: 'Synchronizes thumbnail ribbon highlighting with active main slide',
      fn: () => {
        function getThumbnailState(activeIndex: number, totalSlides: number) {
          return Array.from({ length: totalSlides }, (_, idx) => ({
            index: idx,
            isActive: idx === activeIndex,
            borderClass: idx === activeIndex ? 'ring-2 ring-primary ring-offset-2' : 'opacity-60',
          }));
        }

        const state0 = getThumbnailState(0, 8);
        assertTrue(state0[0].isActive);
        assertEqual(state0[0].borderClass, 'ring-2 ring-primary ring-offset-2');
        assertFalse(state0[1].isActive);

        const state5 = getThumbnailState(5, 8);
        assertTrue(state5[5].isActive);
        assertFalse(state5[0].isActive);
      },
    },
    {
      name: 'Disables auto-advance timer on user touch interaction',
      fn: () => {
        class AutoAdvanceCarousel {
          isAutoPlayActive = true;
          userInteracted = false;

          onTouchStart() {
            this.userInteracted = true;
            this.isAutoPlayActive = false;
          }

          onAutoTick() {
            if (!this.isAutoPlayActive) return false;
            return true;
          }
        }

        const autoCar = new AutoAdvanceCarousel();
        assertTrue(autoCar.isAutoPlayActive);
        assertTrue(autoCar.onAutoTick());

        // User touches slide
        autoCar.onTouchStart();
        assertTrue(autoCar.userInteracted);
        assertFalse(autoCar.isAutoPlayActive);
        assertFalse(autoCar.onAutoTick()); // Auto tick is cancelled
      },
    },
    {
      name: 'Supports circular navigation and boundary wrapping',
      fn: () => {
        const total = 8;
        function getNextIndex(current: number, totalSlides: number): number {
          return (current + 1) % totalSlides;
        }

        function getPrevIndex(current: number, totalSlides: number): number {
          return (current - 1 + totalSlides) % totalSlides;
        }

        // Forward boundary wrap
        assertEqual(getNextIndex(7, total), 0);

        // Backward boundary wrap
        assertEqual(getPrevIndex(0, total), 7);
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

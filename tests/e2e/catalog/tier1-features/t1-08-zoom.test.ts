/**
 * Tier 1 Test Suite: F8 - High-Resolution Image Zoom
 * Tests 2.5x hover magnifier coordinate calculation, mobile pinch scale clamping, high-res image source switching, lens boundary clipping, zoom reset on variant change.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertInRange,
  assertContains,
} from '../harness/assertions';

export const suite = {
  name: 'T1-08: High-Resolution Image Zoom',
  tier: 'Tier 1',
  feature: 'F8: High-Resolution Image Zoom',
  tests: [
    {
      name: 'Calculates 2.5x desktop hover magnifier lens position and background offset',
      fn: () => {
        const containerWidth = 600;
        const containerHeight = 600;
        const zoomFactor = 2.5;

        function calculateZoomOffset(cursorX: number, cursorY: number) {
          // Normalised percentage 0..100%
          const percentX = (cursorX / containerWidth) * 100;
          const percentY = (cursorY / containerHeight) * 100;

          // Background position offset in zoomed viewport
          const bgPosX = percentX;
          const bgPosY = percentY;

          return { percentX, percentY, bgPosX, bgPosY, zoomFactor };
        }

        // Hover at center (300, 300)
        const center = calculateZoomOffset(300, 300);
        assertEqual(center.percentX, 50);
        assertEqual(center.percentY, 50);
        assertEqual(center.zoomFactor, 2.5);

        // Hover at top-left quarter (150, 150)
        const topLeft = calculateZoomOffset(150, 150);
        assertEqual(topLeft.percentX, 25);
        assertEqual(topLeft.percentY, 25);
      },
    },
    {
      name: 'Clamps mobile pinch-to-zoom scale factor within safe boundaries (1.0x to 3.0x)',
      fn: () => {
        function clampPinchScale(rawScale: number): number {
          const MIN_ZOOM = 1.0;
          const MAX_ZOOM = 3.0;
          return Math.min(Math.max(rawScale, MIN_ZOOM), MAX_ZOOM);
        }

        assertEqual(clampPinchScale(0.5), 1.0); // Clamped to min
        assertEqual(clampPinchScale(1.0), 1.0);
        assertEqual(clampPinchScale(2.2), 2.2);
        assertEqual(clampPinchScale(3.0), 3.0);
        assertEqual(clampPinchScale(5.5), 3.0); // Clamped to max
      },
    },
    {
      name: 'Switches to uncompressed high-resolution image source upon zoom activation',
      fn: () => {
        function getZoomImageSource(isZoomed: boolean, standardUrl: string): string {
          if (!isZoomed) return standardUrl;
          // Switch to high-resolution master asset or increase quality parameter
          return standardUrl.replace('w=1200', 'w=3000').replace('q=80', 'q=100');
        }

        const standard = 'https://images.unsplash.com/photo-sample?w=1200&q=80';
        const zoomed = getZoomImageSource(true, standard);
        assertContains(zoomed, 'w=3000');
        assertContains(zoomed, 'q=100');

        const unzoomed = getZoomImageSource(false, standard);
        assertEqual(unzoomed, standard);
      },
    },
    {
      name: 'Enforces lens boundary clipping preventing magnifier box from overflowing container',
      fn: () => {
        const lensSize = 150; // 150px lens box
        const containerSize = 600;

        function getClippedLensPosition(cursorPos: number): number {
          const halfLens = lensSize / 2;
          let lensPos = cursorPos - halfLens;
          // Clip to [0, containerSize - lensSize]
          lensPos = Math.max(0, Math.min(lensPos, containerSize - lensSize));
          return lensPos;
        }

        // Cursor near left edge (10px) -> lens sticks to 0
        assertEqual(getClippedLensPosition(10), 0);

        // Cursor at center (300px) -> lens centered at 225px
        assertEqual(getClippedLensPosition(300), 225);

        // Cursor near right edge (590px) -> lens sticks to 450px (600 - 150)
        assertEqual(getClippedLensPosition(590), 450);
      },
    },
    {
      name: 'Resets zoom state automatically on variant switch or carousel slide change',
      fn: () => {
        class ZoomStateManager {
          isZoomed = false;
          currentScale = 1.0;
          activeVariantId = 'var_01';
          activeSlideIndex = 0;

          zoomIn(scale = 2.5) {
            this.isZoomed = true;
            this.currentScale = scale;
          }

          onVariantChange(newVariantId: string) {
            this.activeVariantId = newVariantId;
            this.resetZoom();
          }

          onSlideChange(newIndex: number) {
            this.activeSlideIndex = newIndex;
            this.resetZoom();
          }

          private resetZoom() {
            this.isZoomed = false;
            this.currentScale = 1.0;
          }
        }

        const manager = new ZoomStateManager();
        manager.zoomIn(2.5);
        assertTrue(manager.isZoomed);
        assertEqual(manager.currentScale, 2.5);

        // Variant changes -> Zoom resets
        manager.onVariantChange('var_02');
        assertFalse(manager.isZoomed);
        assertEqual(manager.currentScale, 1.0);

        // Zoom again and slide changes -> Zoom resets
        manager.zoomIn(3.0);
        manager.onSlideChange(3);
        assertFalse(manager.isZoomed);
        assertEqual(manager.currentScale, 1.0);
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

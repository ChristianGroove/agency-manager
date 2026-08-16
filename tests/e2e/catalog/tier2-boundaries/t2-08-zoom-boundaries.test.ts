/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-08-zoom-boundaries
 * Feature: F8 - High-Resolution Image Zoom
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';

export interface ZoomCoordinates {
  x: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
}

export interface ZoomLensState {
  enabled: boolean;
  bgPositionXPercent: number;
  bgPositionYPercent: number;
  zoomScale: number;
}

export function computeZoomPosition(
  coords: ZoomCoordinates,
  scale: number = 2.0,
  isVideoSlide: boolean = false
): ZoomLensState {
  if (isVideoSlide) {
    return { enabled: false, bgPositionXPercent: 0, bgPositionYPercent: 0, zoomScale: 1.0 };
  }

  const clampedScale = Math.max(1.0, Math.min(3.5, scale));

  if (coords.containerWidth <= 0 || coords.containerHeight <= 0) {
    return { enabled: false, bgPositionXPercent: 0, bgPositionYPercent: 0, zoomScale: 1.0 };
  }

  const clampedX = Math.max(0, Math.min(coords.containerWidth, coords.x));
  const clampedY = Math.max(0, Math.min(coords.containerHeight, coords.y));

  const pctX = (clampedX / coords.containerWidth) * 100;
  const pctY = (clampedY / coords.containerHeight) * 100;

  return {
    enabled: true,
    bgPositionXPercent: Math.round(pctX * 100) / 100,
    bgPositionYPercent: Math.round(pctY * 100) / 100,
    zoomScale: clampedScale,
  };
}

export const suite = {
  name: 'T2-08: Image Zoom Boundaries & Lens Geometry',
  tier: 'Tier 2',
  feature: 'F8: High-Resolution Image Zoom',
  tests: [
    {
      name: 'Zooming on image smaller than container maintains scale without distortion',
      fn: async () => {
        const lens = computeZoomPosition({ x: 100, y: 100, containerWidth: 200, containerHeight: 200 }, 2.0);
        expect(lens.enabled).toBe(true);
        expect(lens.bgPositionXPercent).toBe(50);
        expect(lens.bgPositionYPercent).toBe(50);
        expect(lens.zoomScale).toBe(2.0);
      },
    },
    {
      name: 'Cursor at pixel (0,0) top-left edge clamps position to 0%',
      fn: async () => {
        const lens = computeZoomPosition({ x: -15, y: -20, containerWidth: 600, containerHeight: 400 });
        expect(lens.enabled).toBe(true);
        expect(lens.bgPositionXPercent).toBe(0);
        expect(lens.bgPositionYPercent).toBe(0);
      },
    },
    {
      name: 'Cursor at bottom-right edge beyond boundary clamps position to 100%',
      fn: async () => {
        const lens = computeZoomPosition({ x: 750, y: 550, containerWidth: 600, containerHeight: 400 });
        expect(lens.enabled).toBe(true);
        expect(lens.bgPositionXPercent).toBe(100);
        expect(lens.bgPositionYPercent).toBe(100);
      },
    },
    {
      name: 'Multi-touch pinch scale factor clamps to max 3.5x and min 1.0x',
      fn: async () => {
        const lensOver = computeZoomPosition({ x: 300, y: 200, containerWidth: 600, containerHeight: 400 }, 10.0);
        expect(lensOver.zoomScale).toBe(3.5);

        const lensUnder = computeZoomPosition({ x: 300, y: 200, containerWidth: 600, containerHeight: 400 }, 0.2);
        expect(lensUnder.zoomScale).toBe(1.0);
      },
    },
    {
      name: 'Zoom on video slide preview is strictly disabled',
      fn: async () => {
        const lensVideo = computeZoomPosition(
          { x: 300, y: 200, containerWidth: 600, containerHeight: 400 },
          2.0,
          true
        );
        expect(lensVideo.enabled).toBe(false);
        expect(lensVideo.zoomScale).toBe(1.0);
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

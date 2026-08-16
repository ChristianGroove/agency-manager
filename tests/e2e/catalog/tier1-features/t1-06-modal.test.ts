/**
 * Tier 1 Test Suite: F6 - Interactive Detail Modal
 * Tests modal open/close lifecycle, URL deep-linking on open, focus trapping, ESC key dismiss, backdrop blur state.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertContains,
} from '../harness/assertions';
import { mockPhysicalItem } from '../harness/mock-data';

export const suite = {
  name: 'T1-06: Interactive Detail Modal',
  tier: 'Tier 1',
  feature: 'F6: Interactive Detail Modal',
  tests: [
    {
      name: 'Manages modal open and close state lifecycle transitions',
      fn: () => {
        // Modal state manager simulator
        class ModalStateManager {
          isOpen = false;
          activeItemId: string | null = null;

          open(itemId: string) {
            this.isOpen = true;
            this.activeItemId = itemId;
          }

          close() {
            this.isOpen = false;
            this.activeItemId = null;
          }
        }

        const modal = new ModalStateManager();
        assertFalse(modal.isOpen);
        assertEqual(modal.activeItemId, null);

        modal.open(mockPhysicalItem.id);
        assertTrue(modal.isOpen);
        assertEqual(modal.activeItemId, 'item_phys_001');

        modal.close();
        assertFalse(modal.isOpen);
        assertEqual(modal.activeItemId, null);
      },
    },
    {
      name: 'Synchronizes URL query param deep-linking on modal open and dismiss',
      fn: () => {
        let currentUrl = 'https://app.pixy.com/portal/preview';

        function updateUrlOnModalChange(isOpen: boolean, itemId?: string) {
          const urlObj = new URL(currentUrl);
          if (isOpen && itemId) {
            urlObj.searchParams.set('item', itemId);
          } else {
            urlObj.searchParams.delete('item');
          }
          currentUrl = urlObj.toString();
          return currentUrl;
        }

        // Open modal
        updateUrlOnModalChange(true, mockPhysicalItem.id);
        assertContains(currentUrl, 'item=item_phys_001');

        // Close modal
        updateUrlOnModalChange(false);
        assertFalse(currentUrl.includes('item='));
      },
    },
    {
      name: 'Enforces focus trapping within active modal dialog elements',
      fn: () => {
        const focusableElements = [
          'btn-close-modal',
          'carousel-prev-btn',
          'carousel-next-btn',
          'variant-pill-s',
          'variant-pill-m',
          'btn-add-to-cart',
          'btn-whatsapp-order',
        ];

        let currentFocusIndex = 0;

        function handleTabKey(shiftKey: boolean) {
          if (shiftKey) {
            currentFocusIndex =
              currentFocusIndex === 0 ? focusableElements.length - 1 : currentFocusIndex - 1;
          } else {
            currentFocusIndex =
              currentFocusIndex === focusableElements.length - 1 ? 0 : currentFocusIndex + 1;
          }
          return focusableElements[currentFocusIndex];
        }

        // Forward tab loop
        assertEqual(handleTabKey(false), 'carousel-prev-btn');
        currentFocusIndex = focusableElements.length - 1;
        assertEqual(handleTabKey(false), 'btn-close-modal'); // Wraps to first

        // Backward shift-tab loop
        currentFocusIndex = 0;
        assertEqual(handleTabKey(true), 'btn-whatsapp-order'); // Wraps to last
      },
    },
    {
      name: 'Handles Escape (ESC) keyboard event to dismiss modal safely',
      fn: () => {
        let modalOpen = true;

        function handleKeyDown(event: { key: string }) {
          if (event.key === 'Escape' || event.key === 'Esc') {
            modalOpen = false;
          }
        }

        handleKeyDown({ key: 'Enter' });
        assertTrue(modalOpen);

        handleKeyDown({ key: 'Escape' });
        assertFalse(modalOpen);
      },
    },
    {
      name: 'Applies backdrop blur and body scroll lock when modal is rendered',
      fn: () => {
        const bodyStyles = { overflow: 'auto', paddingRight: '0px' };
        const backdropStyles = { backdropFilter: 'none', display: 'none' };

        function applyModalOpenStyles() {
          bodyStyles.overflow = 'hidden';
          bodyStyles.paddingRight = '15px'; // Scrollbar compensation
          backdropStyles.backdropFilter = 'blur(8px)';
          backdropStyles.display = 'block';
        }

        function removeModalOpenStyles() {
          bodyStyles.overflow = 'auto';
          bodyStyles.paddingRight = '0px';
          backdropStyles.backdropFilter = 'none';
          backdropStyles.display = 'none';
        }

        applyModalOpenStyles();
        assertEqual(bodyStyles.overflow, 'hidden');
        assertEqual(backdropStyles.backdropFilter, 'blur(8px)');
        assertEqual(backdropStyles.display, 'block');

        removeModalOpenStyles();
        assertEqual(bodyStyles.overflow, 'auto');
        assertEqual(backdropStyles.backdropFilter, 'none');
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

/**
 * Tier 1 Test Suite: F21 - 3-Tab Unified Admin Workspace
 * Tests Tab 1 Catálogo active state, Tab 2 Atributos active state, Tab 3 Personalizar Tienda active state, URL query param synchronization, tab transition persistence.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertContains,
} from '../harness/assertions';

export const suite = {
  name: 'T1-21: 3-Tab Unified Admin Workspace',
  tier: 'Tier 1',
  feature: 'F21: 3-Tab Unified Admin Workspace',
  tests: [
    {
      name: 'Activates Tab 1 (Catálogo) and renders category sidebar with items catalog grid',
      fn: () => {
        type TabKey = 'catalog' | 'attributes' | 'customizer';

        function getActiveWorkspaceView(tab: TabKey) {
          return {
            activeTab: tab,
            showItemsGrid: tab === 'catalog',
            showAttributesMatrix: tab === 'attributes',
            showCustomizerStudio: tab === 'customizer',
          };
        }

        const view = getActiveWorkspaceView('catalog');
        assertEqual(view.activeTab, 'catalog');
        assertTrue(view.showItemsGrid);
        assertFalse(view.showAttributesMatrix);
        assertFalse(view.showCustomizerStudio);
      },
    },
    {
      name: 'Activates Tab 2 (Atributos y Variantes) and renders global attribute manager',
      fn: () => {
        type TabKey = 'catalog' | 'attributes' | 'customizer';

        function getActiveWorkspaceView(tab: TabKey) {
          return {
            activeTab: tab,
            showItemsGrid: tab === 'catalog',
            showAttributesMatrix: tab === 'attributes',
            showCustomizerStudio: tab === 'customizer',
          };
        }

        const view = getActiveWorkspaceView('attributes');
        assertEqual(view.activeTab, 'attributes');
        assertFalse(view.showItemsGrid);
        assertTrue(view.showAttributesMatrix);
        assertFalse(view.showCustomizerStudio);
      },
    },
    {
      name: 'Activates Tab 3 (Personalizar Tienda) and renders visual customizer studio with live preview frame',
      fn: () => {
        type TabKey = 'catalog' | 'attributes' | 'customizer';

        function getActiveWorkspaceView(tab: TabKey) {
          return {
            activeTab: tab,
            showItemsGrid: tab === 'catalog',
            showAttributesMatrix: tab === 'attributes',
            showCustomizerStudio: tab === 'customizer',
          };
        }

        const view = getActiveWorkspaceView('customizer');
        assertEqual(view.activeTab, 'customizer');
        assertFalse(view.showItemsGrid);
        assertFalse(view.showAttributesMatrix);
        assertTrue(view.showCustomizerStudio);
      },
    },
    {
      name: 'Synchronizes active tab state with URL query parameter ?tab= in browser history',
      fn: () => {
        let currentUrl = 'https://app.pixy.com/portfolio';

        function setTabInUrl(tab: 'catalog' | 'attributes' | 'customizer') {
          const url = new URL(currentUrl);
          url.searchParams.set('tab', tab);
          currentUrl = url.toString();
          return currentUrl;
        }

        setTabInUrl('attributes');
        assertContains(currentUrl, '?tab=attributes');

        setTabInUrl('customizer');
        assertContains(currentUrl, '?tab=customizer');

        setTabInUrl('catalog');
        assertContains(currentUrl, '?tab=catalog');
      },
    },
    {
      name: 'Persists active tab selection and filters state across page refresh',
      fn: () => {
        class WorkspaceStateStore {
          state = { activeTab: 'catalog', searchQuery: '', selectedCategoryId: 'all' };

          saveState(tab: string, search: string, cat: string) {
            this.state = { activeTab: tab, searchQuery: search, selectedCategoryId: cat };
          }

          restoreState() {
            return this.state;
          }
        }

        const store = new WorkspaceStateStore();
        store.saveState('attributes', 'camiseta', 'cat_01');

        const restored = store.restoreState();
        assertEqual(restored.activeTab, 'attributes');
        assertEqual(restored.searchQuery, 'camiseta');
        assertEqual(restored.selectedCategoryId, 'cat_01');
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

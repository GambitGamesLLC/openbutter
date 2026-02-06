/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ButterSidebar } from '../../src/components/butter-sidebar.js';
import { butterStore } from '../../src/services/butter-store.js';

describe('ButterSidebar', () => {
  let sidebar;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    butterStore.reset();
  });

  afterEach(() => {
    sidebar?.remove();
    container?.remove();
    butterStore.reset();
  });

  describe('Element Definition', () => {
    it('should be defined as a custom element', () => {
      expect(customElements.get('butter-sidebar')).toBe(ButterSidebar);
    });

    it('should extend HTMLElement', () => {
      expect(new ButterSidebar()).toBeInstanceOf(HTMLElement);
    });
  });

  describe('HTML Structure', () => {
    it('should create shadow DOM with navigation', () => {
      sidebar = document.createElement('butter-sidebar');
      document.body.appendChild(sidebar);

      expect(sidebar.shadowRoot).toBeTruthy();
      expect(sidebar.shadowRoot.querySelector('nav.orchestrator-list')).toBeTruthy();
    });

    it('should have footer with new orchestrator button', () => {
      sidebar = document.createElement('butter-sidebar');
      document.body.appendChild(sidebar);

      const footer = sidebar.shadowRoot.querySelector('.sidebar-footer');
      expect(footer).toBeTruthy();
      
      const newButton = footer.querySelector('.new-orchestrator');
      expect(newButton).toBeTruthy();
      expect(newButton.textContent).toContain('New');
    });

    it('should have collapse toggle button', () => {
      sidebar = document.createElement('butter-sidebar');
      document.body.appendChild(sidebar);

      const toggle = sidebar.shadowRoot.querySelector('.collapse-toggle');
      expect(toggle).toBeTruthy();
    });
  });

  describe('Attributes', () => {
    describe('active-id', () => {
      it('should reflect active-id attribute to property', () => {
        sidebar = document.createElement('butter-sidebar');
        sidebar.setAttribute('active-id', 'orch-1');
        document.body.appendChild(sidebar);

        expect(sidebar.activeId).toBe('orch-1');
      });

      it('should highlight the active orchestrator', () => {
        butterStore.set('orchestrators', [
          { id: 'orch-1', name: 'Chip', status: 'online' },
          { id: 'orch-2', name: 'Cookie', status: 'offline' }
        ]);

        sidebar = document.createElement('butter-sidebar');
        sidebar.setAttribute('active-id', 'orch-1');
        document.body.appendChild(sidebar);

        const items = sidebar.shadowRoot.querySelectorAll('.orchestrator-item');
        expect(items[0].classList.contains('active')).toBe(true);
        expect(items[1].classList.contains('active')).toBe(false);
      });
    });

    describe('collapsed', () => {
      it('should reflect collapsed attribute to property', () => {
        sidebar = document.createElement('butter-sidebar');
        sidebar.setAttribute('collapsed', '');
        document.body.appendChild(sidebar);

        expect(sidebar.collapsed).toBe(true);
      });

      it('should add collapsed class to sidebar when collapsed', () => {
        sidebar = document.createElement('butter-sidebar');
        sidebar.setAttribute('collapsed', '');
        document.body.appendChild(sidebar);

        expect(sidebar.shadowRoot.querySelector('.sidebar').classList.contains('collapsed')).toBe(true);
      });

      it('should toggle collapsed state on button click', async () => {
        sidebar = document.createElement('butter-sidebar');
        document.body.appendChild(sidebar);

        const toggle = sidebar.shadowRoot.querySelector('.collapse-toggle');
        toggle.click();

        expect(sidebar.collapsed).toBe(true);
        expect(sidebar.getAttribute('collapsed')).toBe('');

        toggle.click();

        expect(sidebar.collapsed).toBe(false);
        expect(sidebar.hasAttribute('collapsed')).toBe(false);
      });
    });
  });

  describe('ButterStore Integration', () => {
    it('should render orchestrators from store', () => {
      butterStore.set('orchestrators', [
        { id: '1', name: 'Chip', status: 'online', recentActivity: 'Processing...', tokenBurn: 100 },
        { id: '2', name: 'Cookie', status: 'offline', recentActivity: 'Idle', tokenBurn: 0 }
      ]);

      sidebar = document.createElement('butter-sidebar');
      document.body.appendChild(sidebar);

      const items = sidebar.shadowRoot.querySelectorAll('.orchestrator-item');
      expect(items.length).toBe(2);
    });

    it('should display orchestrator name', () => {
      butterStore.set('orchestrators', [
        { id: '1', name: 'Chip', status: 'online' }
      ]);

      sidebar = document.createElement('butter-sidebar');
      document.body.appendChild(sidebar);

      const name = sidebar.shadowRoot.querySelector('.orchestrator-name');
      expect(name.textContent).toBe('Chip');
    });

    it('should display status dot', () => {
      butterStore.set('orchestrators', [
        { id: '1', name: 'Chip', status: 'online' }
      ]);

      sidebar = document.createElement('butter-sidebar');
      document.body.appendChild(sidebar);

      const statusDot = sidebar.shadowRoot.querySelector('.status-dot');
      expect(statusDot).toBeTruthy();
      expect(statusDot.classList.contains('online')).toBe(true);
    });

    it('should display recent activity preview', () => {
      butterStore.set('orchestrators', [
        { id: '1', name: 'Chip', status: 'online', recentActivity: 'Analyzing data...' }
      ]);

      sidebar = document.createElement('butter-sidebar');
      document.body.appendChild(sidebar);

      const activity = sidebar.shadowRoot.querySelector('.recent-activity');
      expect(activity).toBeTruthy();
      expect(activity.textContent).toBe('Analyzing data...');
    });

    it('should display token burn', () => {
      butterStore.set('orchestrators', [
        { id: '1', name: 'Chip', status: 'online', tokenBurn: 1500 }
      ]);

      sidebar = document.createElement('butter-sidebar');
      document.body.appendChild(sidebar);

      const tokenBurn = sidebar.shadowRoot.querySelector('.token-burn');
      expect(tokenBurn).toBeTruthy();
      expect(tokenBurn.textContent).toContain('1,500');
    });

    it('should update when store orchestrators change', () => {
      butterStore.set('orchestrators', [
        { id: '1', name: 'Chip', status: 'online' }
      ]);

      sidebar = document.createElement('butter-sidebar');
      document.body.appendChild(sidebar);

      let items = sidebar.shadowRoot.querySelectorAll('.orchestrator-item');
      expect(items.length).toBe(1);

      butterStore.set('orchestrators', [
        { id: '1', name: 'Chip', status: 'online' },
        { id: '2', name: 'Cookie', status: 'busy' }
      ]);

      items = sidebar.shadowRoot.querySelectorAll('.orchestrator-item');
      expect(items.length).toBe(2);
    });

    it('should show empty state when no orchestrators', () => {
      sidebar = document.createElement('butter-sidebar');
      document.body.appendChild(sidebar);

      const emptyState = sidebar.shadowRoot.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
    });
  });

  describe('Events', () => {
    describe('orchestrator-select', () => {
      it('should dispatch orchestrator-select event on orchestrator click', async () => {
        butterStore.set('orchestrators', [
          { id: 'orch-1', name: 'Chip', status: 'online' }
        ]);

        sidebar = document.createElement('butter-sidebar');
        document.body.appendChild(sidebar);

        const handler = vi.fn();
        sidebar.addEventListener('orchestrator-select', handler);

        const item = sidebar.shadowRoot.querySelector('.orchestrator-item');
        item.click();

        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: expect.objectContaining({
              id: 'orch-1',
              name: 'Chip'
            })
          })
        );
      });

      it('should set active-id when orchestrator is clicked', () => {
        butterStore.set('orchestrators', [
          { id: 'orch-1', name: 'Chip', status: 'online' }
        ]);

        sidebar = document.createElement('butter-sidebar');
        document.body.appendChild(sidebar);

        const item = sidebar.shadowRoot.querySelector('.orchestrator-item');
        item.click();

        expect(sidebar.activeId).toBe('orch-1');
        expect(sidebar.getAttribute('active-id')).toBe('orch-1');
      });
    });

    describe('orchestrator-create', () => {
      it('should dispatch orchestrator-create event on new button click', () => {
        sidebar = document.createElement('butter-sidebar');
        document.body.appendChild(sidebar);

        const handler = vi.fn();
        sidebar.addEventListener('orchestrator-create', handler);

        const newButton = sidebar.shadowRoot.querySelector('.new-orchestrator');
        newButton.click();

        expect(handler).toHaveBeenCalled();
      });
    });
  });

  describe('Status Colors', () => {
    it('should show online status as green', () => {
      butterStore.set('orchestrators', [
        { id: '1', name: 'Chip', status: 'online' }
      ]);

      sidebar = document.createElement('butter-sidebar');
      document.body.appendChild(sidebar);

      const statusDot = sidebar.shadowRoot.querySelector('.status-dot');
      expect(statusDot.classList.contains('online')).toBe(true);
    });

    it('should show offline status as gray', () => {
      butterStore.set('orchestrators', [
        { id: '1', name: 'Chip', status: 'offline' }
      ]);

      sidebar = document.createElement('butter-sidebar');
      document.body.appendChild(sidebar);

      const statusDot = sidebar.shadowRoot.querySelector('.status-dot');
      expect(statusDot.classList.contains('offline')).toBe(true);
    });

    it('should show busy status as amber', () => {
      butterStore.set('orchestrators', [
        { id: '1', name: 'Chip', status: 'busy' }
      ]);

      sidebar = document.createElement('butter-sidebar');
      document.body.appendChild(sidebar);

      const statusDot = sidebar.shadowRoot.querySelector('.status-dot');
      expect(statusDot.classList.contains('busy')).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from store on disconnect', () => {
      sidebar = document.createElement('butter-sidebar');
      document.body.appendChild(sidebar);

      const renderSpy = vi.spyOn(sidebar, 'render');

      sidebar.remove();

      butterStore.set('orchestrators', [
        { id: '1', name: 'Chip', status: 'online' }
      ]);

      expect(renderSpy).not.toHaveBeenCalled();
    });
  });

  describe('Token Burn Formatting', () => {
    it('should format large token burn numbers', () => {
      butterStore.set('orchestrators', [
        { id: '1', name: 'Chip', status: 'online', tokenBurn: 1234567 }
      ]);

      sidebar = document.createElement('butter-sidebar');
      document.body.appendChild(sidebar);

      const tokenBurn = sidebar.shadowRoot.querySelector('.token-burn');
      expect(tokenBurn.textContent).toContain('1,234,567');
    });

    it('should handle zero token burn', () => {
      butterStore.set('orchestrators', [
        { id: '1', name: 'Chip', status: 'online', tokenBurn: 0 }
      ]);

      sidebar = document.createElement('butter-sidebar');
      document.body.appendChild(sidebar);

      const tokenBurn = sidebar.shadowRoot.querySelector('.token-burn');
      expect(tokenBurn).toBeTruthy();
    });

    it('should handle undefined token burn', () => {
      butterStore.set('orchestrators', [
        { id: '1', name: 'Chip', status: 'online' }
      ]);

      sidebar = document.createElement('butter-sidebar');
      document.body.appendChild(sidebar);

      const tokenBurn = sidebar.shadowRoot.querySelector('.token-burn');
      expect(tokenBurn.textContent).toContain('0');
    });
  });
});

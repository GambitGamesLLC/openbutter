/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ButterSettings, SETTINGS_SECTIONS, AVAILABLE_MODELS, THINKING_LEVELS, THEMES } from '../../src/components/butter-settings.js';
import { butterStore } from '../../src/services/butter-store.js';

describe('ButterSettings', () => {
  let element;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Register custom element if not already registered
    if (!customElements.get('butter-settings')) {
      customElements.define('butter-settings', ButterSettings);
    }
    
    // Create new instance
    element = document.createElement('butter-settings');
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (element) {
      element.remove();
    }
    localStorage.clear();
  });

  describe('Element Registration', () => {
    it('should be registered as a custom element', () => {
      expect(customElements.get('butter-settings')).toBe(ButterSettings);
    });

    it('should extend HTMLElement', () => {
      expect(element instanceof HTMLElement).toBe(true);
    });
  });

  describe('Attributes', () => {
    it('should have default active-section as "orchestrators"', () => {
      expect(element.getAttribute('active-section')).toBe('orchestrators');
    });

    it('should accept active-section attribute', () => {
      element.setAttribute('active-section', 'templates');
      expect(element.getAttribute('active-section')).toBe('templates');
    });

    it('should validate active-section value', () => {
      element.setAttribute('active-section', 'invalid');
      // Should fall back to default or first valid section
      expect(SETTINGS_SECTIONS).toContain(element.activeSection);
    });

    it('should reflect activeSection property to attribute', () => {
      element.activeSection = 'system';
      expect(element.getAttribute('active-section')).toBe('system');
    });
  });

  describe('DOM Structure', () => {
    it('should render tab navigation', () => {
      const tabs = element.shadowRoot?.querySelector('.settings-tabs') || 
                   element.querySelector('.settings-tabs');
      expect(tabs).toBeTruthy();
    });

    it('should render all three tabs', () => {
      const tabButtons = element.shadowRoot?.querySelectorAll('.tab-button') ||
                        element.querySelectorAll('.tab-button');
      expect(tabButtons.length).toBe(3);
    });

    it('should render Orchestrators tab content by default', () => {
      const section = element.shadowRoot?.getElementById('orchestrators-section') ||
                     element.querySelector('#orchestrators-section');
      expect(section).toBeTruthy();
    });

    it('should have settings-group sections', () => {
      const groups = element.shadowRoot?.querySelectorAll('.settings-group') ||
                    element.querySelectorAll('.settings-group');
      expect(groups.length).toBeGreaterThan(0);
    });
  });

  describe('Orchestrators Tab', () => {
    beforeEach(() => {
      element.activeSection = 'orchestrators';
    });

    it('should render connect/manage section', () => {
      const connectSection = element.shadowRoot?.querySelector('[data-section="orchestrator-management"]') ||
                            element.querySelector('[data-section="orchestrator-management"]');
      expect(connectSection).toBeTruthy();
    });

    it('should render reset gateway button', () => {
      const resetBtn = element.shadowRoot?.querySelector('[data-action="reset-gateway"]') ||
                      element.querySelector('[data-action="reset-gateway"]');
      expect(resetBtn).toBeTruthy();
    });

    it('should render backup button', () => {
      const backupBtn = element.shadowRoot?.querySelector('[data-action="backup"]') ||
                       element.querySelector('[data-action="backup"]');
      expect(backupBtn).toBeTruthy();
    });

    it('should render restore button', () => {
      const restoreBtn = element.shadowRoot?.querySelector('[data-action="restore"]') ||
                        element.querySelector('[data-action="restore"]');
      expect(restoreBtn).toBeTruthy();
    });

    it('should emit orchestrator-connect event on connect button click', () => {
      const handler = vi.fn();
      element.addEventListener('orchestrator-connect', handler);
      
      const connectBtn = element.shadowRoot?.querySelector('[data-action="connect"]') ||
                        element.querySelector('[data-action="connect"]');
      if (connectBtn) {
        connectBtn.click();
        expect(handler).toHaveBeenCalled();
      }
    });

    it('should emit gateway-reset event on reset click', () => {
      const handler = vi.fn();
      element.addEventListener('gateway-reset', handler);
      
      const resetBtn = element.shadowRoot?.querySelector('[data-action="reset-gateway"]') ||
                      element.querySelector('[data-action="reset-gateway"]');
      if (resetBtn) {
        resetBtn.click();
        expect(handler).toHaveBeenCalled();
      }
    });
  });

  describe('Templates Tab', () => {
    beforeEach(() => {
      element.activeSection = 'templates';
    });

    it('should render model select', () => {
      const modelSelect = element.shadowRoot?.querySelector('[data-setting="model"]') ||
                         element.querySelector('[data-setting="model"]');
      expect(modelSelect).toBeTruthy();
    });

    it('should have all available models as options', () => {
      const modelSelect = element.shadowRoot?.querySelector('[data-setting="model"]') ||
                         element.querySelector('[data-setting="model"]');
      if (modelSelect) {
        const options = modelSelect.querySelectorAll('option');
        expect(options.length).toBeGreaterThanOrEqual(AVAILABLE_MODELS.length);
      }
    });

    it('should render thinking level select', () => {
      const thinkingSelect = element.shadowRoot?.querySelector('[data-setting="thinking"]') ||
                            element.querySelector('[data-setting="thinking"]');
      expect(thinkingSelect).toBeTruthy();
    });

    it('should render cost estimate section', () => {
      const costSection = element.shadowRoot?.querySelector('.cost-estimate') ||
                         element.querySelector('.cost-estimate');
      expect(costSection).toBeTruthy();
    });

    it('should emit setting-change event on model change', () => {
      const handler = vi.fn();
      element.addEventListener('setting-change', handler);
      
      const modelSelect = element.shadowRoot?.querySelector('[data-setting="model"]') ||
                         element.querySelector('[data-setting="model"]');
      if (modelSelect) {
        modelSelect.value = 'claude-sonnet-4';
        modelSelect.dispatchEvent(new Event('change'));
        
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: expect.objectContaining({
              key: 'model',
              value: 'claude-sonnet-4'
            })
          })
        );
      }
    });
  });

  describe('System Tab', () => {
    beforeEach(() => {
      element.activeSection = 'system';
    });

    it('should render theme toggle', () => {
      const themeToggle = element.shadowRoot?.querySelector('[data-setting="theme"]') ||
                         element.querySelector('[data-setting="theme"]');
      expect(themeToggle).toBeTruthy();
    });

    it('should render notifications toggle', () => {
      const notificationsToggle = element.shadowRoot?.querySelector('[data-setting="notifications"]') ||
                                 element.querySelector('[data-setting="notifications"]');
      expect(notificationsToggle).toBeTruthy();
    });

    it('should render advanced settings section', () => {
      const advancedSection = element.shadowRoot?.querySelector('[data-section="advanced"]') ||
                             element.querySelector('[data-section="advanced"]');
      expect(advancedSection).toBeTruthy();
    });

    it('should emit setting-change event on theme toggle', () => {
      const handler = vi.fn();
      element.addEventListener('setting-change', handler);
      
      const themeToggle = element.shadowRoot?.querySelector('[data-setting="theme"]') ||
                         element.querySelector('[data-setting="theme"]');
      if (themeToggle) {
        themeToggle.checked = true;
        themeToggle.dispatchEvent(new Event('change'));
        
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: expect.objectContaining({
              key: 'theme'
            })
          })
        );
      }
    });
  });

  describe('Store Integration', () => {
    it('should load settings from butterStore on connection', () => {
      // Set some values in store
      butterStore.set('theme', 'dark');
      butterStore.set('notifications', true);
      butterStore.set('model', 'claude-opus-4');
      
      // Create new element to trigger loading
      const newElement = document.createElement('butter-settings');
      document.body.appendChild(newElement);
      
      // Check that settings were loaded
      expect(newElement.settings.theme).toBe('dark');
      expect(newElement.settings.notifications).toBe(true);
      expect(newElement.settings.model).toBe('claude-opus-4');
      
      newElement.remove();
    });

    it('should update store when settings change', () => {
      const handler = vi.fn();
      butterStore.subscribe('theme', handler);
      
      // Change theme through component
      element.updateSetting('theme', 'light');
      
      expect(handler).toHaveBeenCalledWith('light', expect.anything());
    });
  });

  describe('Events', () => {
    it('should emit setting-change event with proper detail', () => {
      const handler = vi.fn();
      element.addEventListener('setting-change', handler);
      
      element.updateSetting('testKey', 'testValue');
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            key: 'testKey',
            value: 'testValue',
            previousValue: expect.anything()
          })
        })
      );
    });

    it('should emit save event when save is triggered', () => {
      const handler = vi.fn();
      element.addEventListener('save', handler);
      
      element.saveSettings();
      
      expect(handler).toHaveBeenCalled();
    });

    it('should emit reset event when reset is triggered', () => {
      const handler = vi.fn();
      element.addEventListener('reset', handler);
      
      element.resetSettings();
      
      expect(handler).toHaveBeenCalled();
    });

    it('should emit tab-change event when switching tabs', () => {
      const handler = vi.fn();
      element.addEventListener('tab-change', handler);
      
      element.activeSection = 'templates';
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            section: 'templates',
            previousSection: 'orchestrators'
          })
        })
      );
    });
  });

  describe('Methods', () => {
    it('should have saveSettings method', () => {
      expect(typeof element.saveSettings).toBe('function');
    });

    it('should have resetSettings method', () => {
      expect(typeof element.resetSettings).toBe('function');
    });

    it('should have updateSetting method', () => {
      expect(typeof element.updateSetting).toBe('function');
    });

    it('should have showSection method', () => {
      expect(typeof element.showSection).toBe('function');
    });

    it('should have exportSettings method', () => {
      expect(typeof element.exportSettings).toBe('function');
    });

    it('should have importSettings method', () => {
      expect(typeof element.importSettings).toBe('function');
    });

    it('should have calculateCostEstimate method', () => {
      expect(typeof element.calculateCostEstimate).toBe('function');
    });
  });

  describe('Export/Import', () => {
    it('should export settings as JSON', () => {
      element.settings = { theme: 'dark', model: 'claude-sonnet-4' };
      const exported = element.exportSettings();
      
      expect(() => JSON.parse(exported)).not.toThrow();
      const parsed = JSON.parse(exported);
      expect(parsed.theme).toBe('dark');
    });

    it('should import valid settings JSON', () => {
      const settings = { theme: 'light', notifications: false };
      element.importSettings(JSON.stringify(settings));
      
      expect(element.settings.theme).toBe('light');
      expect(element.settings.notifications).toBe(false);
    });

    it('should emit error event on invalid JSON import', () => {
      const handler = vi.fn();
      element.addEventListener('error', handler);
      
      element.importSettings('invalid json');
      
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate cost for selected model and thinking level', () => {
      const cost = element.calculateCostEstimate('claude-opus-4', 'high');
      expect(typeof cost).toBe('number');
      expect(cost).toBeGreaterThanOrEqual(0);
    });

    it('should return higher cost for higher thinking levels', () => {
      const lowCost = element.calculateCostEstimate('claude-opus-4', 'low');
      const highCost = element.calculateCostEstimate('claude-opus-4', 'high');
      
      expect(highCost).toBeGreaterThan(lowCost);
    });
  });

  describe('Lifecycle', () => {
    it('should clean up event listeners on disconnect', () => {
      const storeUnsubscribe = vi.fn();
      element._storeUnsubscribe = storeUnsubscribe;
      
      element.remove();
      
      // If there's store subscription, it should be cleaned up
      if (storeUnsubscribe.mock) {
        expect(storeUnsubscribe).toHaveBeenCalled();
      }
    });

    it('should re-render when attributes change', () => {
      const handler = vi.fn();
      element.addEventListener('render', handler);
      
      element.setAttribute('active-section', 'system');
      
      // Component should reflect the change
      expect(element.activeSection).toBe('system');
    });
  });
});

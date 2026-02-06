import { butterStore } from '../services/butter-store.js';

export const SETTINGS_SECTIONS = ['orchestrators', 'templates', 'system'];

export const AVAILABLE_MODELS = [
  { id: 'claude-opus-4', name: 'Claude Opus 4', costPerToken: 0.000015 },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', costPerToken: 0.000003 },
  { id: 'claude-haiku-4', name: 'Claude Haiku 4', costPerToken: 0.000001 },
  { id: 'gpt-4o', name: 'GPT-4o', costPerToken: 0.000005 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', costPerToken: 0.00000015 }
];

export const THINKING_LEVELS = [
  { id: 'low', name: 'Low', multiplier: 1.0 },
  { id: 'medium', name: 'Medium', multiplier: 1.5 },
  { id: 'high', name: 'High', multiplier: 2.5 }
];

export const THEMES = [
  { id: 'light', name: 'Light' },
  { id: 'dark', name: 'Dark' },
  { id: 'system', name: 'System' }
];

export class ButterSettings extends HTMLElement {
  static get observedAttributes() {
    return ['active-section'];
  }

  static get defaults() {
    return {
      theme: 'dark',
      notifications: true,
      model: 'claude-sonnet-4',
      thinking: 'medium',
      orchestrators: [],
      advancedMode: false
    };
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.settings = { ...ButterSettings.defaults };
    this._storeUnsubscribe = null;
    this._previousSection = 'orchestrators';
  }

  get activeSection() {
    const attr = this.getAttribute('active-section');
    return SETTINGS_SECTIONS.includes(attr) ? attr : 'orchestrators';
  }

  set activeSection(value) {
    if (SETTINGS_SECTIONS.includes(value)) {
      this._previousSection = this.activeSection;
      this.setAttribute('active-section', value);
    }
  }

  connectedCallback() {
    // Set default attribute if not present
    if (!this.hasAttribute('active-section')) {
      this.setAttribute('active-section', 'orchestrators');
    }
    this._loadSettingsFromStore();
    this._subscribeToStore();
    this._render();
    this._attachEventListeners();
  }

  disconnectedCallback() {
    this._unsubscribeFromStore();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'active-section' && oldValue !== newValue) {
      this._previousSection = oldValue || 'orchestrators';
      this._updateActiveTab();
      this._showSectionContent(newValue);
      this._dispatchTabChange(newValue, oldValue || 'orchestrators');
    }
  }

  _loadSettingsFromStore() {
    const keys = ['theme', 'notifications', 'model', 'thinking', 'orchestrators'];
    keys.forEach(key => {
      const value = butterStore.get(key);
      if (value !== undefined) this.settings[key] = value;
    });
  }

  _subscribeToStore() {
    const keys = ['theme', 'notifications', 'model', 'thinking', 'orchestrators'];
    const unsubscribers = keys.map(key => 
      butterStore.subscribe(key, (value) => {
        if (this.settings[key] !== value) {
          this.settings[key] = value;
        }
      })
    );
    this._storeUnsubscribe = () => unsubscribers.forEach(fn => fn());
  }

  _unsubscribeFromStore() {
    if (this._storeUnsubscribe) {
      this._storeUnsubscribe();
      this._storeUnsubscribe = null;
    }
  }

  _render() {
    const active = this.activeSection;
    const modelOptions = AVAILABLE_MODELS.map(m => 
      '<option value="' + m.id + '"' + (this.settings.model === m.id ? ' selected' : '') + '>' + m.name + '</option>'
    ).join('');
    const thinkingOptions = THINKING_LEVELS.map(t => 
      '<option value="' + t.id + '"' + (this.settings.thinking === t.id ? ' selected' : '') + '>' + t.name + '</option>'
    ).join('');
    const themeOptions = THEMES.map(t => 
      '<option value="' + t.id + '"' + (this.settings.theme === t.id ? ' selected' : '') + '>' + t.name + '</option>'
    ).join('');
    const cost = this.calculateCostEstimate(this.settings.model, this.settings.thinking).toFixed(4);
    
    this.shadowRoot.innerHTML = 
      '<style>' +
        ':host { display: block; font-family: system-ui, sans-serif; }' +
        '.settings-tabs { display: flex; gap: 8px; border-bottom: 2px solid #ddd; margin-bottom: 24px; }' +
        '.tab-button { padding: 12px 24px; border: none; background: transparent; cursor: pointer; font-weight: 500; border-bottom: 2px solid transparent; margin-bottom: -2px; }' +
        '.tab-button.active { color: #0066cc; border-bottom-color: #0066cc; }' +
        '.settings-section { display: none; padding: 20px; }' +
        '.settings-section.active { display: block; }' +
        '.settings-group { background: #f5f5f5; border-radius: 8px; padding: 20px; margin-bottom: 20px; }' +
        '.action-button { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; margin-right: 8px; }' +
        '.action-button.primary { background: #0066cc; color: white; }' +
        '.action-button.secondary { background: #e0e0e0; }' +
        '.action-button.danger { background: #dc3545; color: white; }' +
        'select { padding: 8px; min-width: 200px; }' +
        '.cost-estimate { background: #e8f4f8; padding: 16px; border-radius: 4px; margin-top: 16px; border-left: 4px solid #0066cc; }' +
        '.cost-value { font-size: 24px; font-weight: 600; color: #0066cc; }' +
        '.setting-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }' +
      '</style>' +
      '<div class="settings-tabs">' +
        '<button class="tab-button ' + (active === 'orchestrators' ? 'active' : '') + '" data-tab="orchestrators">Orchestrators</button>' +
        '<button class="tab-button ' + (active === 'templates' ? 'active' : '') + '" data-tab="templates">Templates</button>' +
        '<button class="tab-button ' + (active === 'system' ? 'active' : '') + '" data-tab="system">System</button>' +
      '</div>' +
      '<section id="orchestrators-section" class="settings-section ' + (active === 'orchestrators' ? 'active' : '') + '" data-section="orchestrators">' +
        '<div class="settings-group" data-section="orchestrator-management">' +
          '<h3>Manage Orchestrators</h3>' +
          '<button class="action-button primary" data-action="connect">Connect Orchestrator</button>' +
        '</div>' +
        '<div class="settings-group">' +
          '<h3>Gateway</h3>' +
          '<button class="action-button danger" data-action="reset-gateway">Reset Gateway</button>' +
        '</div>' +
        '<div class="settings-group">' +
          '<h3>Backup & Restore</h3>' +
          '<button class="action-button secondary" data-action="backup">Backup</button>' +
          '<button class="action-button secondary" data-action="restore">Restore</button>' +
        '</div>' +
      '</section>' +
      '<section id="templates-section" class="settings-section ' + (active === 'templates' ? 'active' : '') + '" data-section="templates">' +
        '<div class="settings-group">' +
          '<h3>Model Settings</h3>' +
          '<div class="setting-row">' +
            '<label>Model</label>' +
            '<select data-setting="model">' + modelOptions + '</select>' +
          '</div>' +
          '<div class="setting-row">' +
            '<label>Thinking Level</label>' +
            '<select data-setting="thinking">' + thinkingOptions + '</select>' +
          '</div>' +
          '<div class="cost-estimate">' +
            '<h4>Estimated Cost per 1K tokens</h4>' +
            '<div class="cost-value">$' + cost + '</div>' +
          '</div>' +
        '</div>' +
      '</section>' +
      '<section id="system-section" class="settings-section ' + (active === 'system' ? 'active' : '') + '" data-section="system">' +
        '<div class="settings-group">' +
          '<h3>Appearance</h3>' +
          '<div class="setting-row">' +
            '<label>Theme</label>' +
            '<select data-setting="theme">' + themeOptions + '</select>' +
          '</div>' +
        '</div>' +
        '<div class="settings-group" data-section="advanced">' +
          '<h3>Advanced</h3>' +
          '<div class="setting-row">' +
            '<label>Enable Notifications</label>' +
            '<input type="checkbox" data-setting="notifications"' + (this.settings.notifications ? ' checked' : '') + '>' +
          '</div>' +
        '</div>' +
      '</section>';
  }

  _attachEventListeners() {
    this.shadowRoot.querySelectorAll('.tab-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.activeSection = e.target.dataset.tab;
      });
    });

    this.shadowRoot.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action === 'connect') this.dispatchEvent(new CustomEvent('orchestrator-connect', { bubbles: true, composed: true }));
        if (action === 'reset-gateway') this.dispatchEvent(new CustomEvent('gateway-reset', { bubbles: true, composed: true }));
        if (action === 'backup') this.exportSettings();
        if (action === 'restore') this._triggerImport();
      });
    });

    this.shadowRoot.querySelectorAll('[data-setting]').forEach(el => {
      el.addEventListener('change', (e) => {
        const key = e.target.dataset.setting;
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        this.updateSetting(key, value);
      });
    });
  }

  _updateActiveTab() {
    this.shadowRoot.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === this.activeSection);
    });
  }

  _showSectionContent(section) {
    this.shadowRoot.querySelectorAll('.settings-section').forEach(sec => {
      sec.classList.toggle('active', sec.dataset.section === section || sec.id === section + '-section');
    });
  }

  _dispatchTabChange(newSection, oldSection) {
    this.dispatchEvent(new CustomEvent('tab-change', {
      detail: { section: newSection, previousSection: oldSection },
      bubbles: true,
      composed: true
    }));
  }

  _triggerImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => this.importSettings(event.target.result);
        reader.readAsText(file);
      }
    };
    input.click();
  }

  updateSetting(key, value) {
    const prev = this.settings[key] !== undefined ? this.settings[key] : null;
    this.settings[key] = value;
    butterStore.set(key, value);
    this.dispatchEvent(new CustomEvent('setting-change', {
      detail: { key, value, previousValue: prev },
      bubbles: true,
      composed: true
    }));
  }

  saveSettings() {
    this.dispatchEvent(new CustomEvent('save', { bubbles: true, composed: true }));
  }

  resetSettings() {
    this.dispatchEvent(new CustomEvent('reset', { bubbles: true, composed: true }));
  }

  showSection(section) {
    if (SETTINGS_SECTIONS.includes(section)) {
      this.activeSection = section;
    }
  }

  exportSettings() {
    return JSON.stringify(this.settings);
  }

  importSettings(json) {
    try {
      const parsed = JSON.parse(json);
      Object.assign(this.settings, parsed);
      this._render();
      this._attachEventListeners();
    } catch (e) {
      this.dispatchEvent(new CustomEvent('error', { detail: e, bubbles: true, composed: true }));
    }
  }

  calculateCostEstimate(modelId, thinkingLevel) {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId) || AVAILABLE_MODELS[1];
    const level = THINKING_LEVELS.find(t => t.id === thinkingLevel) || THINKING_LEVELS[1];
    return model.costPerToken * 1000 * level.multiplier;
  }
}

customElements.define('butter-settings', ButterSettings);
export default ButterSettings;

/**
 * ButterStore - Central reactive state management for OpenButter
 *
 * Features:
 * - EventTarget-based reactivity
 * - Immutable state updates
 * - LocalStorage persistence (excludes sensitive keys)
 * - Subscription pattern for key-specific changes
 */

const STORAGE_KEY = 'butter-store';

// Keys that should NOT be persisted to localStorage (sensitive data)
const NON_PERSISTENT_KEYS = new Set(['messages', 'activeOrchestrator']);

/**
 * Deep clone an object or array to ensure immutability
 * @param {*} value - Value to clone
 * @returns {*} Deep cloned value
 */
function deepClone(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (Array.isArray(value)) {
    return value.map(item => deepClone(item));
  }

  if (typeof value === 'object') {
    const cloned = {};
    for (const key of Object.keys(value)) {
      cloned[key] = deepClone(value[key]);
    }
    return cloned;
  }

  return value;
}

/**
 * Deep equality check for two values
 * @param {*} a - First value
 * @param {*} b - Second value
 * @returns {boolean} True if values are deeply equal
 */
function deepEqual(a, b) {
  if (a === b) return true;

  if (a == null || b == null) return a === b;

  if (typeof a !== typeof b) return false;

  if (typeof a !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

export class ButterStore extends EventTarget {
  /**
   * @type {Map<string, any>}
   */
  #state;

  /**
   * @type {Map<string, Set<Function>>}
   */
  #subscribers;

  /**
   * @type {boolean}
   */
  #isDestroyed;

  /**
   * Default state values
   */
  static defaults = {
    orchestrators: [],
    messages: [],
    activeOrchestrator: null,
    connectionStatus: 'disconnected'
  };

  constructor() {
    super();

    this.#state = new Map();
    this.#subscribers = new Map();
    this.#isDestroyed = false;

    // Initialize with defaults first
    for (const [key, value] of Object.entries(ButterStore.defaults)) {
      this.#state.set(key, deepClone(value));
    }

    // Then restore from localStorage (non-sensitive keys only)
    this.#restoreFromStorage();
  }

  /**
   * Restore persisted state from localStorage
   * @private
   */
  #restoreFromStorage() {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        for (const [key, value] of Object.entries(parsed)) {
          // Only restore non-sensitive keys that exist in defaults
          if (ButterStore.defaults.hasOwnProperty(key) && !NON_PERSISTENT_KEYS.has(key)) {
            this.#state.set(key, deepClone(value));
          }
        }
      }
    } catch (error) {
      // Silently ignore corrupted storage - will use defaults
      console.warn('[ButterStore] Failed to restore from localStorage:', error.message);
    }
  }

  /**
   * Persist non-sensitive state to localStorage
   * @private
   */
  #persistToStorage() {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const toPersist = {};
      for (const [key, value] of this.#state.entries()) {
        if (!NON_PERSISTENT_KEYS.has(key)) {
          toPersist[key] = value;
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
    } catch (error) {
      // Silently ignore storage errors (e.g., quota exceeded)
      console.warn('[ButterStore] Failed to persist to localStorage:', error.message);
    }
  }

  /**
   * Get a value from the store
   * @param {string} key - State key
   * @returns {*} Deep cloned value (immutable)
   */
  get(key) {
    if (this.#isDestroyed) {
      console.warn('[ButterStore] Store has been destroyed');
      return undefined;
    }

    if (!this.#state.has(key)) {
      return undefined;
    }

    // Return deep clone to enforce immutability
    return deepClone(this.#state.get(key));
  }

  /**
   * Set a value in the store
   * @param {string} key - State key
   * @param {*} value - New value (will be deep cloned)
   * @param {Object} [options] - Options
   * @param {boolean} [options.silent=false - Don't emit events
   * @param {boolean} [options.batch=false] - Part of a batch update
   * @returns {boolean} True if value changed
   */
  set(key, value, options = {}) {
    if (this.#isDestroyed) {
      console.warn('[ButterStore] Store has been destroyed');
      return false;
    }

    const previousValue = this.#state.has(key) ? this.#state.get(key) : undefined;
    const clonedValue = deepClone(value);

    // Check if value actually changed (deep equality)
    if (deepEqual(previousValue, clonedValue)) {
      return false;
    }

    // Update state
    this.#state.set(key, clonedValue);

    // Persist to localStorage (only non-sensitive keys)
    if (!NON_PERSISTENT_KEYS.has(key) && !options.batch) {
      this.#persistToStorage();
    }

    // Emit events unless silent
    if (!options.silent) {
      this.#emitChange(key, clonedValue, previousValue, options.batch);
    }

    return true;
  }

  /**
   * Emit change events for a key update
   * @private
   */
  #emitChange(key, value, previousValue, isBatch = false) {
    const detail = {
      key,
      value,
      previousValue,
      batch: isBatch
    };

    // Emit general change event
    this.dispatchEvent(new CustomEvent('change', { detail }));

    // Emit key-specific change event
    this.dispatchEvent(new CustomEvent(`change:${key}`, { detail: {
      value,
      previousValue,
      batch: isBatch
    }}));

    // Notify subscribers
    this.#notifySubscribers(key, value, previousValue);
  }

  /**
   * Notify callback subscribers for a key change
   * @private
   */
  #notifySubscribers(key, value, previousValue) {
    const subscribers = this.#subscribers.get(key);
    if (!subscribers) return;

    for (const callback of subscribers) {
      try {
        callback(value, previousValue);
      } catch (error) {
        console.error('[ButterStore] Subscriber callback error:', error);
        // Continue to next subscriber
      }
    }
  }

  /**
   * Subscribe to changes for a specific key
   * @param {string} key - State key to subscribe to
   * @param {Function} callback - Callback(value, previousValue) => void
   * @returns {Function} Unsubscribe function
   */
  subscribe(key, callback) {
    if (this.#isDestroyed) {
      console.warn('[ButterStore] Store has been destroyed');
      return () => {};
    }

    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }

    if (!this.#subscribers.has(key)) {
      this.#subscribers.set(key, new Set());
    }

    this.#subscribers.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      if (this.#isDestroyed) return;
      const keySubscribers = this.#subscribers.get(key);
      if (keySubscribers) {
        keySubscribers.delete(callback);
      }
    };
  }

  /**
   * Perform batch updates - only emit one change event at the end
   * @param {Function} updater - Function that receives a draft object to modify
   */
  batch(updater) {
    if (this.#isDestroyed) {
      console.warn('[ButterStore] Store has been destroyed');
      return;
    }

    if (typeof updater !== 'function') {
      throw new TypeError('Updater must be a function');
    }

    // Create draft object with all current values
    const draft = {};
    for (const [key, value] of this.#state.entries()) {
      draft[key] = deepClone(value);
    }

    // Let user modify the draft
    updater(draft);

    // Track which keys changed
    const changedKeys = [];

    // Apply changes silently (no individual events)
    for (const [key, value] of Object.entries(draft)) {
      const previousValue = this.#state.has(key) ? this.#state.get(key) : undefined;
      if (!deepEqual(previousValue, value)) {
        this.#state.set(key, deepClone(value));
        changedKeys.push({ key, value, previousValue });
      }
    }

    // Persist all changes at once
    this.#persistToStorage();

    // Emit single batch event if any changes occurred
    if (changedKeys.length > 0) {
      this.dispatchEvent(new CustomEvent('change', {
        detail: { batch: true, changes: changedKeys }
      }));

      // Also emit key-specific events
      for (const { key, value, previousValue } of changedKeys) {
        this.#emitChange(key, value, previousValue, true);
      }
    }
  }

  /**
   * Get all current state (for debugging/testing)
   * @returns {Object} Deep cloned state object
   */
  getState() {
    const state = {};
    for (const [key, value] of this.#state.entries()) {
      state[key] = deepClone(value);
    }
    return state;
  }

  /**
   * Reset state to defaults (useful for testing)
   * @param {boolean} [clearStorage=true] - Also clear localStorage
   */
  reset(clearStorage = true) {
    if (this.#isDestroyed) {
      console.warn('[ButterStore] Store has been destroyed');
      return;
    }

    // Reset all keys to defaults
    for (const [key, value] of Object.entries(ButterStore.defaults)) {
      this.set(key, value);
    }

    if (clearStorage && typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /**
   * Destroy the store - remove all listeners and clear state
   */
  destroy() {
    if (this.#isDestroyed) {
      return;
    }

    // Remove all event listeners
    this.#subscribers.clear();

    // Clear state
    this.#state.clear();

    this.#isDestroyed = true;
  }
}

// Export singleton instance for app-wide use
export const butterStore = new ButterStore();

// Also export class for testing and custom instances
export default ButterStore;

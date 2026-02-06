/**
 * @jest-environment jsdom
 */

import { ButterStore } from '../../src/services/butter-store.js';

describe('ButterStore', () => {
  let store;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    store = new ButterStore();
  });

  afterEach(() => {
    store.destroy();
    localStorage.clear();
  });

  describe('Initial State Setup', () => {
    test('should initialize with default state keys', () => {
      // Default state should be set
      expect(store.get('orchestrators')).toEqual([]);
      expect(store.get('messages')).toEqual([]);
      expect(store.get('activeOrchestrator')).toBeNull();
      expect(store.get('connectionStatus')).toBe('disconnected');
    });

    test('should restore persisted state from localStorage if available', () => {
      // Arrange
      const persistedState = {
        orchestrators: [{ id: '1', name: 'Test' }],
        connectionStatus: 'connected'
      };
      localStorage.setItem('butter-store', JSON.stringify(persistedState));

      // Act
      store = new ButterStore();

      // Assert
      expect(store.get('orchestrators')).toEqual([{ id: '1', name: 'Test' }]);
      expect(store.get('connectionStatus')).toBe('connected');
      // Non-persisted keys should still have defaults
      expect(store.get('messages')).toEqual([]);
    });
  });

  describe('Get/Set Values', () => {
    test('should get values by key', () => {
      expect(store.get('orchestrators')).toEqual([]);
      expect(store.get('connectionStatus')).toBe('disconnected');
    });

    test('should return undefined for unknown keys', () => {
      expect(store.get('unknownKey')).toBeUndefined();
    });

    test('should set new values', () => {
      store.set('orchestrators', [{ id: '1', name: 'Orchestrator 1' }]);
      expect(store.get('orchestrators')).toEqual([{ id: '1', name: 'Orchestrator 1' }]);
    });

    test('should update connection status', () => {
      store.set('connectionStatus', 'connected');
      expect(store.get('connectionStatus')).toBe('connected');
    });

    test('should set activeOrchestrator', () => {
      store.set('activeOrchestrator', { id: '1', name: 'Active' });
      expect(store.get('activeOrchestrator')).toEqual({ id: '1', name: 'Active' });
    });

    test('should enforce immutable updates by returning new references', () => {
      const orchestrators = [{ id: '1', name: 'Test' }];
      store.set('orchestrators', orchestrators);

      // Modifying original should not affect store
      orchestrators.push({ id: '2', name: 'Test 2' });
      expect(store.get('orchestrators')).toHaveLength(1);
    });
  });

  describe('Event Emission on Change', () => {
    test('should emit change event when value changes', () => {
      const handler = jest.fn();
      store.addEventListener('change', handler);

      store.set('connectionStatus', 'connected');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            key: 'connectionStatus',
            value: 'connected',
            previousValue: 'disconnected'
          })
        })
      );
    });

    test('should emit key-specific change event', () => {
      const handler = jest.fn();
      store.addEventListener('change:connectionStatus', handler);

      store.set('connectionStatus', 'connected');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            value: 'connected',
            previousValue: 'disconnected'
          })
        })
      );
    });

    test('should not emit event when value is unchanged', () => {
      const handler = jest.fn();
      store.addEventListener('change:connectionStatus', handler);

      store.set('connectionStatus', 'disconnected');

      expect(handler).not.toHaveBeenCalled();
    });

    test('should include previous value in change event', () => {
      store.set('connectionStatus', 'connecting');
      const handler = jest.fn();
      store.addEventListener('change', handler);

      store.set('connectionStatus', 'connected');

      expect(handler.mock.calls[0][0].detail.previousValue).toBe('connecting');
      expect(handler.mock.calls[0][0].detail.value).toBe('connected');
    });
  });

  describe('Subscription/Callback Firing', () => {
    test('should subscribe to specific key changes', () => {
      const callback = jest.fn();
      store.subscribe('connectionStatus', callback);

      store.set('connectionStatus', 'connected');

      expect(callback).toHaveBeenCalledWith('connected', 'disconnected');
    });

    test('should not call callback for unrelated key changes', () => {
      const callback = jest.fn();
      store.subscribe('connectionStatus', callback);

      store.set('orchestrators', [{ id: '1' }]);

      expect(callback).not.toHaveBeenCalled();
    });

    test('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = store.subscribe('connectionStatus', callback);

      unsubscribe();
      store.set('connectionStatus', 'connected');

      expect(callback).not.toHaveBeenCalled();
    });

    test('should support multiple subscribers for same key', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      store.subscribe('connectionStatus', callback1);
      store.subscribe('connectionStatus', callback2);

      store.set('connectionStatus', 'connected');

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('should handle subscriber that throws without breaking others', () => {
      const callback1 = jest.fn(() => { throw new Error('Test error'); });
      const callback2 = jest.fn();

      store.subscribe('connectionStatus', callback1);
      store.subscribe('connectionStatus', callback2);

      expect(() => store.set('connectionStatus', 'connected')).not.toThrow();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('LocalStorage Persistence', () => {
    test('should persist non-sensitive data to localStorage', () => {
      store.set('connectionStatus', 'connected');
      store.set('orchestrators', [{ id: '1', name: 'Test' }]);

      const persisted = JSON.parse(localStorage.getItem('butter-store'));
      expect(persisted.connectionStatus).toBe('connected');
      expect(persisted.orchestrators).toEqual([{ id: '1', name: 'Test' }]);
    });

    test('should not persist messages to localStorage (sensitive)', () => {
      store.set('messages', [{ id: '1', content: 'Sensitive data' }]);

      const persisted = JSON.parse(localStorage.getItem('butter-store'));
      expect(persisted.messages).toBeUndefined();
    });

    test('should not persist activeOrchestrator to localStorage', () => {
      store.set('activeOrchestrator', { id: '1', name: 'Test' });

      const persisted = JSON.parse(localStorage.getItem('butter-store'));
      expect(persisted.activeOrchestrator).toBeUndefined();
    });

    test('should restore state from localStorage on instantiation', () => {
      store.set('orchestrators', [{ id: '1', name: 'Persisted' }]);
      store.set('connectionStatus', 'connected');

      // Create new store instance
      const newStore = new ButterStore();

      expect(newStore.get('orchestrators')).toEqual([{ id: '1', name: 'Persisted' }]);
      expect(newStore.get('connectionStatus')).toBe('connected');

      newStore.destroy();
    });

    test('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('QuotaExceeded');
      });

      // Should not throw when localStorage fails
      expect(() => store.set('connectionStatus', 'connected')).not.toThrow();

      localStorage.setItem = originalSetItem;
    });

    test('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('butter-store', 'not-valid-json');

      // Should not throw on instantiation with corrupted data
      expect(() => new ButterStore()).not.toThrow();
    });
  });

  describe('Immutable State Updates', () => {
    test('should return deep copy on get', () => {
      const orchestrators = [{ id: '1', name: 'Test', nested: { value: 'deep' } }];
      store.set('orchestrators', orchestrators);

      const retrieved = store.get('orchestrators');
      retrieved[0].name = 'Modified';
      retrieved[0].nested.value = 'modified';

      expect(store.get('orchestrators')[0].name).toBe('Test');
      expect(store.get('orchestrators')[0].nested.value).toBe('deep');
    });

    test('should not mutate state when setting arrays', () => {
      const originalArray = [{ id: '1' }];
      store.set('orchestrators', originalArray);

      originalArray.push({ id: '2' });

      expect(store.get('orchestrators')).toHaveLength(1);
    });

    test('should not mutate state when setting objects', () => {
      const originalObj = { data: { value: 'test' } };
      store.set('activeOrchestrator', originalObj);

      originalObj.data.value = 'modified';

      expect(store.get('activeOrchestrator').data.value).toBe('test');
    });
  });

  describe('Batch Updates (optional)', () => {
    test('should support batching multiple updates', () => {
      const handler = jest.fn();
      store.addEventListener('change', handler);

      store.batch((draft) => {
        draft.connectionStatus = 'connected';
        draft.orchestrators = [{ id: '1' }];
      });

      // Should emit only one batch change event
      const batchEvents = handler.mock.calls.filter(
        call => call[0].detail.batch === true
      );
      expect(batchEvents).toHaveLength(1);
      expect(store.get('connectionStatus')).toBe('connected');
      expect(store.get('orchestrators')).toEqual([{ id: '1' }]);
    });
  });

  describe('Destroy/Cleanup', () => {
    test('should clear all event listeners on destroy', () => {
      const handler = jest.fn();
      store.addEventListener('change', handler);
      store.subscribe('connectionStatus', () => {});

      store.destroy();

      // Should not throw and handler should not be called
      store.set('connectionStatus', 'connected');
      expect(handler).not.toHaveBeenCalled();
    });
  });
});

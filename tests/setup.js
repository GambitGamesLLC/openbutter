// Test setup for jsdom environment
// Create a proper localStorage mock with all required methods

const localStorageMock = {
  getItem: vi.fn((key) => store[key] || null),
  setItem: vi.fn((key, value) => {
    store[key] = String(value);
  }),
  removeItem: vi.fn((key) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    store = {};
  }),
  key: vi.fn((index) => Object.keys(store)[index] || null),
  get length() {
    return Object.keys(store).length;
  }
};

let store = {};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

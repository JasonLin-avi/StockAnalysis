const { saveUserPreferences, getUserPreferences } = require('../../src/lib/user-preferences');

describe('User Preferences API', () => {
  beforeEach(() => {
    // Mock localStorage since we are in JSDOM/Node environment
    const store = {};
    global.window = {
      localStorage: {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => {
          store[key] = value.toString();
        }),
        clear: jest.fn(() => {
          for (const key in store) {
            delete store[key];
          }
        })
      }
    };
  });

  afterEach(() => {
    delete global.window;
  });

  test('should save and retrieve user preferences', () => {
    const preferences = { layout: ['chart1', 'chart2'], theme: 'dark' };
    saveUserPreferences(preferences);
    const retrieved = getUserPreferences();
    expect(retrieved).toEqual(preferences);
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'stock-analysis-preferences',
      JSON.stringify(preferences)
    );
  });

  test('should return empty object if no preferences exist', () => {
    const retrieved = getUserPreferences();
    expect(retrieved).toEqual({});
  });
});

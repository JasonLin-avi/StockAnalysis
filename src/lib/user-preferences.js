const PREFERENCES_KEY = 'stock-analysis-preferences';

/**
 * Saves user layout and widget configuration to local storage.
 * @param {Object} preferences - User preference object
 */
function saveUserPreferences(preferences) {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }
}

/**
 * Retrieves user layout and widget configuration from local storage.
 * @returns {Object} User preference object
 */
function getUserPreferences() {
  if (typeof window !== 'undefined' && window.localStorage) {
    const preferences = window.localStorage.getItem(PREFERENCES_KEY);
    return preferences ? JSON.parse(preferences) : {};
  }
  return {};
}

export {saveUserPreferences, getUserPreferences};

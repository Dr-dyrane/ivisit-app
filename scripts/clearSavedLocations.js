/**
 * Clear Saved Locations Script
 *
 * Run this to immediately clear all saved locations from local storage.
 * Useful when saved locations have corrupted addresses.
 *
 * Usage:
 *   node scripts/clearSavedLocations.js
 *
 * Or in the app, call: clearAllSavedLocations()
 */

const { useLocationStore } = require('../stores/locationStore');

function clearAllSavedLocations() {
  const store = useLocationStore.getState();
  const count = store.savedLocations.length;

  store.clearSavedLocations();

  console.log(`[clearSavedLocations] Cleared ${count} saved location(s)`);
  console.log('[clearSavedLocations] You can now re-add locations with correct addresses');

  return { cleared: count };
}

// Export for programmatic use
module.exports = { clearAllSavedLocations };

// Run immediately if executed directly
if (require.main === module) {
  clearAllSavedLocations();
}

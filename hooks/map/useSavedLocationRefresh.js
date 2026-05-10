/**
 * Saved Location Refresh Hook
 *
 * Provides functionality to re-geocode saved locations and update their addresses.
 * Useful when:
 * - Address was corrupted during initial save
 * - GPS coordinates are accurate but address text is wrong
 * - User wants to refresh address from latest geocoding data
 */

import { useCallback, useState } from 'react';
import { useLocationStore } from '../../stores/locationStore';
import { mapboxService } from '../../services/mapboxService';

export function useSavedLocationRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const updateSavedLocation = useLocationStore((state) => state.updateSavedLocation);

  /**
   * Refresh a single saved location's address by re-geocoding its coordinates
   * @param {string} locationId - The saved location ID to refresh
   * @returns {Promise<boolean>} - True if refresh succeeded
   */
  const refreshLocation = useCallback(async (locationId) => {
    const savedLocations = useLocationStore.getState().savedLocations;
    const location = savedLocations.find((loc) => loc.id === locationId);

    if (!location) {
      setRefreshError('Location not found');
      return false;
    }

    if (!location.latitude || !location.longitude) {
      setRefreshError('Location missing coordinates');
      return false;
    }

    setIsRefreshing(true);
    setRefreshError(null);

    try {
      // Reverse geocode the coordinates
      const result = await mapboxService.reverseGeocode(
        location.latitude,
        location.longitude,
      );
      const address =
        typeof result === 'string'
          ? result
          : result?.address || result?.formattedAddress || result?.formatted_address;

      if (!address || address === 'Unknown Address') {
        setRefreshError('Could not resolve address from coordinates');
        return false;
      }

      // Update the saved location with new address
      updateSavedLocation(locationId, {
        address,
        // Also update any other fields that might have changed
        ...(result.primaryText && { primaryText: result.primaryText }),
        ...(result.secondaryText && { secondaryText: result.secondaryText }),
        updatedAt: Date.now(),
      });

      return true;
    } catch (error) {
      console.error('[useSavedLocationRefresh] Failed to refresh:', error);
      setRefreshError(error.message || 'Failed to refresh address');
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [updateSavedLocation]);

  /**
   * Refresh all saved locations that have coordinates
   * @returns {Promise<{succeeded: number, failed: number}>}
   */
  const refreshAllLocations = useCallback(async () => {
    const savedLocations = useLocationStore.getState().savedLocations;
    const locationsWithCoords = savedLocations.filter(
      (loc) => loc.latitude && loc.longitude
    );

    let succeeded = 0;
    let failed = 0;

    setIsRefreshing(true);
    setRefreshError(null);

    for (const location of locationsWithCoords) {
      const result = await refreshLocation(location.id);
      if (result) {
        succeeded++;
      } else {
        failed++;
      }
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    setIsRefreshing(false);
    return { succeeded, failed };
  }, [refreshLocation]);

  /**
   * Clear the refresh error
   */
  const clearError = useCallback(() => {
    setRefreshError(null);
  }, []);

  return {
    refreshLocation,
    refreshAllLocations,
    isRefreshing,
    refreshError,
    clearError,
  };
}

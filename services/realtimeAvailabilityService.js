import { supabase } from './supabase';

class RealtimeAvailabilityService {
  constructor() {
    this.subscriptions = new Map();
    this.pollingIntervals = new Map();
    this.isPolling = false;
  }

  static parseCoordinates(row) {
    const latitude = Number(row?.latitude);
    const longitude = Number(row?.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }

    const coords = row?.coordinates;
    if (coords && typeof coords === 'object' && Array.isArray(coords.coordinates)) {
      const [lng, lat] = coords.coordinates;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { latitude: Number(lat), longitude: Number(lng) };
      }
    }

    if (typeof coords === 'string') {
      const match = coords.match(/^POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)$/i);
      if (match) {
        return { latitude: Number(match[2]), longitude: Number(match[1]) };
      }
    }

    return null;
  }

  static inBounds(row, bounds) {
    const parsed = RealtimeAvailabilityService.parseCoordinates(row);
    if (!parsed) return false;

    return (
      parsed.latitude >= bounds.south &&
      parsed.latitude <= bounds.north &&
      parsed.longitude >= bounds.west &&
      parsed.longitude <= bounds.east
    );
  }

  /**
   * Subscribe to real-time availability updates for a specific hospital
   * @param {string} hospitalId - Hospital ID to watch
   * @param {function} callback - Callback function for updates
   * @returns {function} Unsubscribe function
   */
  subscribeToHospital(hospitalId, callback) {
    if (!hospitalId || typeof callback !== 'function') {
      console.warn('RealtimeAvailabilityService: Invalid parameters');
      return () => {};
    }

    // Subscribe to Supabase real-time updates
    const subscription = supabase
      .channel(`hospital-${hospitalId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'hospitals',
          filter: `id=eq.${hospitalId}`
        },
        (payload) => {
          console.log('Realtime availability update:', payload);
          callback(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to real-time updates for hospital ${hospitalId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Failed to subscribe to hospital ${hospitalId}`);
        }
      });

    this.subscriptions.set(hospitalId, {
      type: 'hospital',
      hospitalId,
      callback,
      channel: subscription,
    });

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(hospitalId);
    };
  }

  /**
   * Subscribe to availability updates for all hospitals in an area
   * @param {object} bounds - Geographic bounds {north, south, east, west}
   * @param {function} callback - Callback function for updates
   * @returns {function} Unsubscribe function
   */
  subscribeToArea(bounds, callback) {
    if (!bounds || typeof callback !== 'function') {
      console.warn('RealtimeAvailabilityService: Invalid area subscription parameters');
      return () => {};
    }

    const { north, south, east, west } = bounds;
    
    const subscription = supabase
      .channel('area-availability')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'hospitals'
        },
        (payload) => {
          // Check if updated hospital is within bounds
          const hospital = payload.new;
          if (RealtimeAvailabilityService.inBounds(hospital, { north, south, east, west })) {
            callback(hospital);
          }
        }
      )
      .subscribe();

    const unsubscribeId = `area-${Date.now()}`;
    this.subscriptions.set(unsubscribeId, {
      type: 'area',
      bounds: { north, south, east, west },
      callback,
      channel: subscription,
    });

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(unsubscribeId);
    };
  }

  /**
   * Start polling for availability updates (fallback for when real-time fails)
   * @param {number} interval - Polling interval in milliseconds (default: 30000)
   */
  startPolling(interval = 30000) {
    if (this.isPolling) {
      console.warn('RealtimeAvailabilityService: Polling already started');
      return;
    }

    this.isPolling = true;
    console.log(`Starting availability polling every ${interval}ms`);

    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('hospitals')
          .select('*')
          .or('verified.eq.true,place_id.like.demo:%')
          .order('last_availability_update', { ascending: false })
          .limit(100);

        if (error) {
          console.error('Polling error:', error);
          return;
        }

        const rows = Array.isArray(data) ? data : [];

        // Emit updates to all subscribers when realtime channel is degraded.
        this.subscriptions.forEach((subscription) => {
          if (subscription.type === 'area' && typeof subscription.callback === 'function') {
            const inArea = rows.filter((row) => RealtimeAvailabilityService.inBounds(row, subscription.bounds));
            subscription.callback(inArea);
          }

          if (subscription.type === 'hospital' && typeof subscription.callback === 'function') {
            const row = rows.find((r) => String(r.id) === String(subscription.hospitalId));
            if (row) {
              subscription.callback(row);
            }
          }
        });

      } catch (error) {
        console.error('Polling error:', error);
      }
    }, interval);

    this.pollingIntervals.set('global', pollInterval);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    const pollInterval = this.pollingIntervals.get('global');
    if (pollInterval) {
      clearInterval(pollInterval);
      this.pollingIntervals.delete('global');
      this.isPolling = false;
      console.log('Stopped availability polling');
    }
  }

  /**
   * Update hospital availability
   * @param {string} hospitalId - Hospital ID
   * @param {object} updates - Availability updates
   * @returns {Promise<boolean>} Success status
   */
  async updateAvailability(hospitalId, updates) {
    try {
      const payload = {
        hospital_id: hospitalId,
        beds_available: updates?.beds_available ?? updates?.available_beds ?? null,
        er_wait_time: updates?.er_wait_time ?? updates?.emergency_wait_time_minutes ?? null,
        p_status: updates?.p_status ?? updates?.status ?? null,
        ambulance_count: updates?.ambulance_count ?? updates?.ambulances_count ?? null,
      };

      const { error } = await supabase.rpc('update_hospital_availability', {
        ...payload
      });

      if (error) {
        console.error('Update availability error:', error);
        return false;
      }

      console.log(`Updated availability for hospital ${hospitalId}`);
      return true;
    } catch (error) {
      console.error('Update availability error:', error);
      return false;
    }
  }

  /**
   * Get current availability for all hospitals
   * @returns {Promise<Array>} Array of available hospitals
   */
  async getCurrentAvailability() {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .or('verified.eq.true,place_id.like.demo:%')
        .order('last_availability_update', { ascending: false });

      if (error) {
        console.error('Get availability error:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Get availability error:', error);
      return [];
    }
  }

  /**
   * Cleanup all subscriptions and polling
   */
  cleanup() {
    // Unsubscribe from all real-time subscriptions
    this.subscriptions.forEach((subscription) => {
      subscription.channel?.unsubscribe?.();
    });
    this.subscriptions.clear();

    // Stop polling
    this.stopPolling();

    console.log('RealtimeAvailabilityService: Cleanup complete');
  }
}

// Export singleton instance
export const realtimeAvailabilityService = new RealtimeAvailabilityService();
export default realtimeAvailabilityService;

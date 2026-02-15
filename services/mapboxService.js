// Mapbox Service for cost-effective Location and Geocoding
import { EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN } from '@env';

class MapboxService {
    constructor() {
        this.accessToken = EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
        this.baseUrl = 'https://api.mapbox.com';
    }

    /**
     * Search for nearby hospitals using Mapbox Search API (v1)
     * This is much cheaper than Google Places for hospital discovery.
     */
    async searchNearbyHospitals(lat, lng, radiusKm = 15) {
        if (!this.accessToken) {
            console.warn('Mapbox access token is missing');
            return [];
        }

        try {
            const response = await fetch(
                `${this.baseUrl}/search/searchbox/v1/suggest?` +
                `q=hospital&` +
                `proximity=${lng},${lat}&` +
                `limit=10&` +
                `types=poi&` +
                `access_token=${this.accessToken}`
            );

            const data = await response.json();

            if (!data.suggestions) {
                return [];
            }

            // Format to match iVisit hospital schema
            return data.suggestions.map(item => ({
                place_id: item.mapbox_id,
                name: item.name,
                address: item.full_address || item.place_formatted,
                latitude: item.center?.[1] || lat,
                longitude: item.center?.[0] || lng,
                source: 'mapbox',
                metadata: item
            }));
        } catch (error) {
            console.error('MapboxService.searchNearbyHospitals error:', error);
            throw error;
        }
    }

    /**
     * Geocode address to coordinates using Mapbox Geocoding API
     */
    async geocodeAddress(address) {
        if (!this.accessToken) {
            throw new Error('Mapbox access token is missing');
        }

        try {
            const response = await fetch(
                `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?` +
                `access_token=${this.accessToken}&` +
                `limit=1`
            );

            const data = await response.json();

            if (!data.features || data.features.length === 0) {
                throw new Error('No coordinates found for this address');
            }

            const feature = data.features[0];
            return {
                latitude: feature.center[1],
                longitude: feature.center[0],
                formatted_address: feature.place_name,
                feature: feature
            };
        } catch (error) {
            console.error('MapboxService.geocodeAddress error:', error);
            throw error;
        }
    }

    /**
     * Reverse Geocode coordinates to address
     */
    async reverseGeocode(lat, lng) {
        if (!this.accessToken) {
            throw new Error('Mapbox access token is missing');
        }

        try {
            const response = await fetch(
                `${this.baseUrl}/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
                `access_token=${this.accessToken}&` +
                `limit=1`
            );

            const data = await response.json();

            if (!data.features || data.features.length === 0) {
                return 'Unknown Address';
            }

            return data.features[0].place_name;
        } catch (error) {
            console.error('MapboxService.reverseGeocode error:', error);
            return 'Unknown Address';
        }
    }
}

export default new MapboxService();

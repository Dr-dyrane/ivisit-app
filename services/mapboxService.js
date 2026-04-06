// Mapbox Service for cost-effective Location and Geocoding
const MAPBOX_ACCESS_TOKEN =
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
    process.env.MAPBOX_ACCESS_TOKEN ||
    "";

class MapboxService {
    constructor() {
        this.accessToken = MAPBOX_ACCESS_TOKEN;
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
     * Suggest addresses as the user types using Mapbox Geocoding.
     */
    async suggestAddresses(query, proximity = null) {
        if (!this.accessToken) {
            return [];
        }

        const trimmed = query?.trim();
        if (!trimmed) {
            return [];
        }

        try {
            let url =
                `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?` +
                `access_token=${this.accessToken}&` +
                `autocomplete=true&` +
                `limit=5&` +
                `types=address,place`;

            if (proximity?.latitude && proximity?.longitude) {
                url += `&proximity=${proximity.longitude},${proximity.latitude}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            return (data.features || []).map((feature) => ({
                placeId: feature.id,
                primaryText: feature.text || feature.place_name || 'Selected location',
                secondaryText:
                    Array.isArray(feature.context) && feature.context.length > 0
                        ? feature.context.map((item) => item.text).filter(Boolean).join(', ')
                        : feature.place_name || '',
                location: feature.center
                    ? {
                        latitude: feature.center[1],
                        longitude: feature.center[0],
                    }
                    : null,
                formattedAddress: feature.place_name || '',
                source: 'mapbox',
                requiresDetails: false,
            }));
        } catch (error) {
            console.error('MapboxService.suggestAddresses error:', error);
            return [];
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

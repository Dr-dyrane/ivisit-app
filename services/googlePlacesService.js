import mapboxService from './mapboxService';

// Google Places Service for Hospital Data Integration
const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  "";

class GooglePlacesService {
  constructor() {
    this.apiKey = GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api';
    this.autocompleteDenied = false;
  }

  isExpectedSearchError(error) {
    const message = String(error?.message || '');
    return (
      message.includes('REQUEST_DENIED') ||
      message.includes('ZERO_RESULTS') ||
      message.includes('Location not found') ||
      message.includes('not configured')
    );
  }

  shouldTryGeocodeFallback(query) {
    const trimmed = query?.trim() || '';
    if (trimmed.length < 6) {
      return false;
    }

    return /\d/.test(trimmed) || /\s/.test(trimmed);
  }

  ensureApiKey() {
    if (!this.apiKey) {
      throw new Error('Google Maps API key is not configured');
    }
  }

  // Search for nearby hospitals using Google Places API
  async searchNearbyHospitals(lat, lng, radius = 10000) {
    try {
      this.ensureApiKey();
      const response = await fetch(
        `${this.baseUrl}/place/nearbysearch/json?` +
        `location=${lat},${lng}&` +
        `radius=${radius}&` +
        `type=hospital&` +
        `key=${this.apiKey}`
      );

      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Google Places API error: ${data.status}`);
      }

      return data.results.map(place => this.formatHospitalData(place));
    } catch (error) {
      console.error('GooglePlacesService.searchNearbyHospitals error:', error);
      throw error;
    }
  }

  // Get detailed information about a specific hospital
  async getHospitalDetails(placeId) {
    try {
      this.ensureApiKey();
      const response = await fetch(
        `${this.baseUrl}/place/details/json?` +
        `place_id=${placeId}&` +
        `fields=name,formatted_address,formatted_phone_number,website,rating,photos,opening_hours,types,geometry&` +
        `key=${this.apiKey}`
      );

      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Google Places API error: ${data.status}`);
      }

      return this.formatHospitalDetails(data.result);
    } catch (error) {
      console.error('GooglePlacesService.getHospitalDetails error:', error);
      throw error;
    }
  }

  // Geocode address to coordinates
  async geocodeAddress(address) {
    try {
      this.ensureApiKey();
      const response = await fetch(
        `${this.baseUrl}/geocode/json?` +
        `address=${encodeURIComponent(address)}&` +
        `key=${this.apiKey}`
      );

      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Google Geocoding API error: ${data.status}`);
      }

      return data.results[0];
    } catch (error) {
      if (!this.isExpectedSearchError(error)) {
        console.error('GooglePlacesService.geocodeAddress error:', error);
      }
      throw error;
    }
  }

  async autocompleteAddresses(
    query,
    {
      location = null,
      radius = 50000,
      sessionToken = null,
      components = 'country:ng',
    } = {}
  ) {
    try {
      if (this.autocompleteDenied) {
        throw new Error('Google Places Autocomplete API error: REQUEST_DENIED');
      }

      this.ensureApiKey();

      const trimmed = query?.trim();
      if (!trimmed) {
        return [];
      }

      let url =
        `${this.baseUrl}/place/autocomplete/json?` +
        `input=${encodeURIComponent(trimmed)}&` +
        `types=address&` +
        `key=${this.apiKey}`;

      if (components) {
        url += `&components=${encodeURIComponent(components)}`;
      }

      if (location?.latitude && location?.longitude) {
        url += `&location=${location.latitude},${location.longitude}&radius=${radius}`;
      }

      if (sessionToken) {
        url += `&sessiontoken=${encodeURIComponent(sessionToken)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'ZERO_RESULTS') {
        return [];
      }

      if (data.status !== 'OK') {
        if (data.status === 'REQUEST_DENIED') {
          this.autocompleteDenied = true;
        }
        throw new Error(`Google Places Autocomplete API error: ${data.status}`);
      }

      return (data.predictions || []).map((prediction) => ({
        placeId: prediction.place_id,
        primaryText:
          prediction.structured_formatting?.main_text ||
          prediction.description ||
          'Selected location',
        secondaryText:
          prediction.structured_formatting?.secondary_text || '',
        description: prediction.description || '',
        source: 'google-autocomplete',
        requiresDetails: true,
      }));
    } catch (error) {
      if (!this.isExpectedSearchError(error)) {
        console.error('GooglePlacesService.autocompleteAddresses error:', error);
      }
      throw error;
    }
  }

  mapGeocodeToSuggestion(result) {
    if (!result) {
      return null;
    }

    const location = result?.geometry?.location;
    const components = Array.isArray(result?.address_components)
      ? result.address_components
      : [];
    const pick = (type) =>
      components.find((item) => item.types?.includes(type))?.long_name || null;
    const streetNumber = pick('street_number');
    const route = pick('route');
    const locality =
      pick('locality') ||
      pick('sublocality') ||
      pick('administrative_area_level_2');
    const region = pick('administrative_area_level_1');

    return {
      placeId: result.place_id || result.formatted_address || 'geocode-result',
      primaryText:
        [streetNumber, route].filter(Boolean).join(' ').trim() ||
        result.formatted_address ||
        'Selected location',
      secondaryText:
        [locality, region].filter(Boolean).join(', ').trim() ||
        result.formatted_address ||
        '',
      formattedAddress: result.formatted_address || '',
      location: location
        ? { latitude: location.lat, longitude: location.lng }
        : null,
      source: 'google-geocode',
      requiresDetails: false,
    };
  }

  async searchAddressSuggestions(
    query,
    {
      location = null,
      radius = 50000,
      sessionToken = null,
      components = 'country:ng',
    } = {}
  ) {
    const trimmed = query?.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const suggestions = await this.autocompleteAddresses(trimmed, {
        location,
        radius,
        sessionToken,
        components,
      });

      if (suggestions.length > 0) {
        return suggestions;
      }
    } catch (error) {
      // Fall through to lower-friction backups.
    }

    try {
      const mapboxSuggestions = await mapboxService.suggestAddresses(trimmed, location);
      if (mapboxSuggestions.length > 0) {
        return mapboxSuggestions;
      }
    } catch (error) {
      // Fall through to geocode fallback.
    }

    if (!this.shouldTryGeocodeFallback(trimmed)) {
      return [];
    }

    try {
      const geocode = await this.geocodeAddress(trimmed);
      const suggestion = this.mapGeocodeToSuggestion(geocode);
      if (suggestion) {
        return [suggestion];
      }
    } catch (error) {
      // Final fallback exhausted.
    }

    return [];
  }

  async getPlaceDetails(
    placeId,
    {
      fields = 'formatted_address,address_component,geometry,name,place_id',
      sessionToken = null,
    } = {}
  ) {
    try {
      this.ensureApiKey();

      let url =
        `${this.baseUrl}/place/details/json?` +
        `place_id=${encodeURIComponent(placeId)}&` +
        `fields=${encodeURIComponent(fields)}&` +
        `key=${this.apiKey}`;

      if (sessionToken) {
        url += `&sessiontoken=${encodeURIComponent(sessionToken)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Google Places Details API error: ${data.status}`);
      }

      return data.result;
    } catch (error) {
      if (!this.isExpectedSearchError(error)) {
        console.error('GooglePlacesService.getPlaceDetails error:', error);
      }
      throw error;
    }
  }

  // Format hospital data from Google Places
  formatHospitalData(place) {
    return {
      place_id: place.place_id,
      name: place.name,
      address: place.vicinity || place.formatted_address,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      rating: place.rating || 0,
      types: place.types || [],
      photos: place.photos?.map(photo => photo.photo_reference) || [],
      opening_hours: place.opening_hours,
      google_data: place
    };
  }

  // Format detailed hospital information
  formatHospitalDetails(result) {
    return {
      place_id: result.place_id,
      name: result.name,
      address: result.formatted_address,
      phone: result.formatted_phone_number,
      website: result.website,
      rating: result.rating || 0,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      types: result.types || [],
      photos: result.photos?.map(photo => photo.photo_reference) || [],
      opening_hours: result.opening_hours,
      google_data: result
    };
  }

  // Get photo URL from photo reference
  getPhotoUrl(photoReference, maxWidth = 400) {
    return `${this.baseUrl}/place/photo?` +
           `maxwidth=${maxWidth}&` +
           `photoreference=${photoReference}&` +
           `key=${this.apiKey}`;
  }

  // Batch import hospitals for a location
  async batchImportHospitals(lat, lng, radius = 10000, onProgress = null) {
    try {
      const hospitals = await this.searchNearbyHospitals(lat, lng, radius);
      const detailedHospitals = [];

      for (let i = 0; i < hospitals.length; i++) {
        const hospital = hospitals[i];
        
        try {
          const details = await this.getHospitalDetails(hospital.place_id);
          detailedHospitals.push(details);
          
          if (onProgress) {
            onProgress({
              current: i + 1,
              total: hospitals.length,
              hospital: details.name,
              progress: ((i + 1) / hospitals.length) * 100
            });
          }
        } catch (error) {
          console.error(`Failed to get details for ${hospital.name}:`, error);
          // Still add basic hospital data even if details fail
          detailedHospitals.push(hospital);
        }
      }

      return detailedHospitals;
    } catch (error) {
      console.error('GooglePlacesService.batchImportHospitals error:', error);
      throw error;
    }
  }
}

export default new GooglePlacesService();

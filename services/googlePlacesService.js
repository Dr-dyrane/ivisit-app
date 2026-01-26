// Google Places Service for Hospital Data Integration
import { GOOGLE_MAPS_API_KEY } from '@env';

class GooglePlacesService {
  constructor() {
    this.apiKey = GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api';
  }

  // Search for nearby hospitals using Google Places API
  async searchNearbyHospitals(lat, lng, radius = 10000) {
    try {
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
      console.error('GooglePlacesService.geocodeAddress error:', error);
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

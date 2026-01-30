# Web Maps Setup Guide

## Overview
The iVisit app now supports Google Maps on the web platform, replacing the previous placeholder view.

## Setup Instructions

### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/overview)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Maps JavaScript API**
   - **Places API** (for search functionality)
   - **Geocoding API** (for address resolution)

4. Create credentials:
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Restrict the API key to your domain for security
   - Enable HTTP referrers restriction (recommended)

### 2. Configure Environment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Google Maps API key:
   ```
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

### 3. Required APIs

Make sure these APIs are enabled in your Google Cloud Console:

- ✅ **Maps JavaScript API** - Core map functionality
- ✅ **Places API** - Hospital search and autocomplete
- ✅ **Geocoding API** - Address to coordinates conversion

### 4. Usage

Once configured, the web version will display a fully functional Google Maps interface with:

- 🗺️ Interactive map with zoom/pan
- 🏥 Hospital markers
- 🚗 Route polylines for ambulance trips
- 📍 User location (if permitted)
- 🌙 Dark/light theme support

### 5. Troubleshooting

#### Map not loading
- Check that your API key is valid and properly set in `.env`
- Verify all required APIs are enabled
- Check browser console for error messages

#### API quota exceeded
- Monitor your Google Cloud Console usage
- Set up billing alerts if needed
- Consider API restrictions for production

#### Styling issues
- The web map automatically adapts to the app's theme
- Custom map styles are supported via the `customMapStyle` prop

### 6. Security Best Practices

1. **Restrict API key**: Limit to your domain only
2. **Monitor usage**: Set up alerts in Google Cloud Console  
3. **Use HTTPS**: Required for production deployment
4. **Rate limiting**: Built into Google Maps API

### 7. Cost Considerations

Google Maps JavaScript API pricing:
- **Free tier**: $200 monthly credit
- **After free tier**: ~$7 per 1,000 map loads
- **Places API**: Separate pricing, check current rates

For a medical emergency app, usage should remain within free tier for most deployments.

## Development Notes

- The web implementation uses the Google Maps JavaScript API v3
- React Native Maps continues to work on iOS/Android
- Component API is consistent across all platforms
- Custom markers and polylines are supported

## Support

For issues with:
- **API keys**: Contact Google Cloud Support
- **Map functionality**: Check Google Maps documentation
- **App integration**: Review the implementation in `components/map/MapComponents.web.js`

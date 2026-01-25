# iVisit

iVisit is a **production-ready** mobile application that connects individuals with highly trained medical professionals for emergency response, advanced medical care, and compassionate service. Available 24/7, iVisit is dedicated to providing rapid and expert care when you need it most.

## 🚀 **Production Status**

✅ **Real GPS Integration** - No simulation data, only live location tracking  
✅ **Real-time Subscriptions** - Live emergency requests, ambulance tracking, hospital bed updates  
✅ **Production Database** - PostGIS with nearby hospitals, distance calculations  
✅ **End-to-End Flow** - Request → Dispatch → Tracking → Arrival → Complete  

## Features

- **🚨 Emergency Response**: Rapid and efficient emergency care with real-time GPS tracking
- **🏥 Hospital Network**: Real-time hospital availability, bed counts, wait times
- **🚑 Ambulance Tracking**: Live ambulance location and ETA calculations
- **📱 Real-time Updates**: Supabase-powered real-time subscriptions
- **🗺️ Interactive Maps**: Route visualization, hospital markers, zoom optimization
- **💳 Insurance Integration**: Automated "iVisit Basic" enrollment and third-party policy management
- **💸 Seamless Payments**: Integrated with Gumroad for instant policy subscriptions

## Tech Stack

- **Frontend**: React Native, Expo, Tailwind CSS (NativeWind)
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Real-time)
- **Database**: PostgreSQL with PostGIS for geospatial queries
- **Maps**: Google Maps API with real-time routing
- **Payments**: Gumroad
- **Deployment**: EAS (Expo Application Services)

## Development

### Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/Dr-dyrane/ivisit-app.git
   cd ivisit-app
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

3. Environment Setup:
   Create a `.env` file with your credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_GUMROAD_PRODUCT_URL=https://ivisit.gumroad.com/l/insurance-basic
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
   ```

4. Start development:
   ```bash
   npx expo start
   ```

### Testing Real-time Features

The app includes comprehensive real-time testing capabilities:

**Test Location**: Hemet, CA (33.7475, -116.9730)  
**Test User ID**: `bf8709de-706e-444b-bf82-fbaeea62604a`

**Key Features to Test:**
- 🚨 Emergency request creation with real GPS
- 🏥 Hospital discovery with distance calculations  
- 🚑 Ambulance dispatch and real-time tracking
- 📱 Real-time subscription updates
- 🗺️ Route visualization and polyline rendering

### Database Migrations

**Important**: All database migrations are production-ready and backward compatible:

- ✅ PostGIS `nearby_hospitals()` function for geospatial queries
- ✅ Real-time subscriptions enabled for emergency tables
- ✅ Patient location tracking with PostGIS POINT types
- ✅ Ambulance and hospital bed real-time updates

**No breaking changes** - existing code continues to work with new migrations.

### Building & Deployment

```bash
# Production builds
eas build --platform android
eas build -p android --profile preview2
eas build -p ios --profile preview2

# OTA updates (no Play Store resubmission needed)
eas update --branch preview2
```

## Contributing

To contribute to iVisit:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeature`).
3. Commit your changes (`git commit -am 'Add new feature'`).
4. Push the branch (`git push origin feature/YourFeature`).
5. Open a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For inquiries, please email us at [info@ivisit.com](mailto:info@ivisit.com).

---

_Visit our website for more information: [iVisit](http://ivisit.vercel.app)._

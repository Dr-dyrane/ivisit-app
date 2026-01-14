# iVisit

iVisit is a web application designed to connect individuals with highly trained medical professionals for emergency response, advanced medical care, and compassionate service. Available 24/7, iVisit is dedicated to providing rapid and expert care when you need it most.

## Features

- **Emergency Response**: Rapid and efficient emergency care on the scene.
- **Advanced Medical Care**: High-quality care with the latest technology.
- **Compassionate Service**: Empathetic care to alleviate stress during emergencies.
- **Insurance Integration**: Automated "iVisit Basic" enrollment and third-party policy management.
- **Seamless Payments**: Integrated with Gumroad for instant policy subscriptions and renewals.

## Tech Stack

- **Frontend**: React Native, Expo, Tailwind CSS (NativeWind)
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Database**: PostgreSQL (via Supabase)
- **Payments**: Gumroad
- **Deployment**: EAS (Expo Application Services)

## Installation

To set up iVisit locally:

1. Clone the repository:

   ```bash
   git clone https://github.com/Dr-dyrane/ivisit-app.git
   ```

2. Navigate to the project directory:

   ```bash
   cd ivisit
   ```

3. Install dependencies:

   ```bash
   npm install --legacy-peer-deps
   ```

4. **Environment Setup**:
   Create a `.env` file in the root directory with your Supabase and Gumroad credentials:

   ```env
   # Supabase Configuration
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Gumroad Configuration
   EXPO_PUBLIC_GUMROAD_PRODUCT_URL=https://ivisit.gumroad.com/l/insurance-basic
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
   ```

5. Start the development server:

   ```bash
   npx expo start
   ```

## Building & Deployment

Use these commands to generate a production-ready APK or submit to the Play Store:

```bash
eas build --platform android
eas build -p android --profile preview2
eas build -p ios --profile preview2
```

- The `preview2` profile in `eas.json` is configured to generate APK files. You can modify this profile to suit different build needs.

### OTA (Over-the-Air) Updates with EAS

After the APK has been generated and deployed, you can push over-the-air updates (such as JavaScript or asset changes) without requiring users to download a new version from the Play Store.

To send an update to all users:

```bash
eas update
eas update --branch preview2
```

This will push your latest changes to users who have installed your app.

### Key Notes:

- **`eas update`** allows you to update the app without needing a full rebuild and Play Store re-submission. Ideal for minor fixes or improvements.
- Ensure that `expo-updates` is installed and properly configured to enable OTA updates in your app.

---

## Development Tools

### Data Seeding
The application includes a data seeding utility to populate the database with mock data (Visits, Notifications, FAQs) for testing purposes. 

**Note:** This feature is only available when running in **Development Mode**.
1. Navigate to the **More** tab.
2. Scroll to the bottom to find the **Developer** section.
3. Tap **Seed Database** to populate your account with test data.

### Auto-Enrollment
New users are automatically enrolled in the "iVisit Basic" insurance scheme upon signup via database triggers. Existing users are backfilled automatically via migration scripts.

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

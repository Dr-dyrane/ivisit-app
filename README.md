# iVisit

iVisit is a web application designed to connect individuals with highly trained medical professionals for emergency response, advanced medical care, and compassionate service. Available 24/7, iVisit is dedicated to providing rapid and expert care when you need it most.

## Features

- **Emergency Response**: Rapid and efficient emergency care on the scene.
- **Advanced Medical Care**: High-quality care with the latest technology.
- **Compassionate Service**: Empathetic care to alleviate stress during emergencies.

## Tech Stack

- **Frontend**: React, Tailwind CSS
- **Backend**: Firebase
- **Database**: Firebase
- **Deployment**: Vercel

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

4. Start the development server:

   ```bash
   expo start
   ```

5. Use these commands to generate a production-ready APK or submit to the Play Store:

   ```bash
   eas build --platform android
   eas build -p android --profile preview2
   eas build -p ios --profile preview2
   ```

   - The `preview2` profile in `eas.json` is configured to generate APK files. You can modify this profile to suit different build needs.

6. **OTA (Over-the-Air) Updates with EAS**:

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

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
IVISIT_API_URL=https://api.yourservice.com
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

```

```

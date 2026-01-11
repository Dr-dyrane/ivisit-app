---
description: Repository Information Overview
alwaysApply: true
---

# iVisit App Information

## Summary

iVisit is a **mobile-first healthcare application** built with **React Native (Expo)** and `expo-router`. The app provides emergency response and medical consultation services with authentication backed by **Supabase** and local persistence via the `database/` layer. OTA (Over-the-Air) updates are enabled via `expo-updates` and managed through **Expo Application Services (EAS)** for building and deploying APKs and iOS builds.

## Structure

```
app/
  ├─ (auth)/          ← Login, signup, OTP, onboarding screens
  ├─ (user)/          ← Main app screens post-authentication
  └─ _layout.js       ← Global layout, wraps providers (Auth, Theme, Emergency, Toast)

components/           ← Reusable UI components
  ├─ auth/            ← Authentication components
  ├─ register/        ← Registration and onboarding cards
  ├─ form/            ← Form inputs and fields
  ├─ ui/              ← Common UI elements
  ├─ visits/          ← Visit-related components
  ├─ map/             ← Map and location components
  ├─ notifications/   ← Notification components
  └─ layout/          ← Layout wrappers

contexts/             ← Global state (Auth, Theme, Emergency, Toast, Notifications)
hooks/                ← Custom hooks (mutations, queries, validators)
screens/              ← Screen components (SignupScreen, LoginScreen, ProfileScreen, etc.)
services/              ← Domain services (Supabase + local storage via database layer)
api/                   ← Migration artifact (currently empty / not used by app code)
constants/            ← Colors, steps, login/registration constants
data/                 ← Static data (countries, hospitals, services, visits)
assets/               ← Images, icons, logos, adaptive icons for Android/iOS
utils/                ← Helper utilities (phone formatter, navigation options, gesture hooks)
docs/                 ← Documentation (registration, UI/UX Bible, technical specs)
```

## Language & Runtime

**Language**: JavaScript/React (JSX)  
**Runtime**: React Native 0.81.5  
**Framework**: Expo 54.0.30 with `expo-router` for navigation  
**TypeScript**: Version ~5.9.2 (installed but not configured as primary)  
**Build System**: EAS (Expo Application Services)  
**Package Manager**: npm (with `--legacy-peer-deps` flag recommended)

## Dependencies

**Core Runtime**:
- `expo` (~54.0.30) - Expo framework and runtime
- `expo-router` (~6.0.21) - File-based routing for React Native
- `expo-updates` (~29.0.15) - OTA updates support
- `react` (19.1.0) - React framework
- `react-native` (0.81.5) - React Native library
- `react-native-web` (^0.21.0) - Web support

**Navigation & UI**:
- `@react-navigation/native` (^7.0.14) - Core navigation
- `@react-navigation/bottom-tabs` (^7.2.0) - Bottom tab navigation
- `@react-navigation/native-stack` (^7.2.0) - Stack navigation
- `react-native-screens` (~4.16.0) - Native screen components
- `react-native-safe-area-context` (~5.6.0) - Safe area handling

**Styling & UI Framework**:
- `nativewind` (^2.0.11) - Tailwind CSS support for React Native
- `tailwindcss` (3.3.2) - CSS utility framework (dev)
- `react-native-paper` (^5.12.5) - Material Design components
- `expo-linear-gradient` (~15.0.8) - Gradient components
- `expo-blur` (~15.0.8) - Blur effects
- `@react-native-masked-view/masked-view` (^0.3.2) - Masking support

**Forms & Validation**:
- `formik` (^2.4.6) - Form state management
- `yup` (^1.4.0) - Schema validation

**Device APIs & Storage**:
- `@react-native-async-storage/async-storage` (2.2.0) - Persistent local storage
- `expo-image-picker` (~17.0.10) - Image selection from camera/gallery
- `expo-location` (~19.0.8) - GPS and location services
- `expo-contacts` (~15.0.11) - Device contacts access
- `@react-native-community/datetimepicker` (8.4.4) - Date/time picker
- `expo-haptics` (~15.0.8) - Haptic feedback
- `expo-font` (~14.0.8) - Custom fonts
- `expo-constants` (~18.0.9) - App constants

**Maps & Location**:
- `react-native-maps` (1.20.1) - Native maps integration

**Utilities**:
- `libphonenumber-js` (^1.10.27) - Phone number formatting
- `date-fns` (^4.1.0) - Date utilities
- `fs-extra` (^11.3.2) - File system utilities
- `@expo/vector-icons` (^15.0.2) - Icon library

**Icons & SVG**:
- `react-native-svg` (15.12.1) - SVG support

## Build & Installation

**Install dependencies**:
```bash
npm install --legacy-peer-deps
```

**Development**:
```bash
expo start          # Start dev server
expo start --android
expo start --ios
expo start --web
```

**Build for deployment** (using EAS):
```bash
eas build -p android           # Build APK for Android
eas build -p ios               # Build for iOS
eas build -p android --profile preview2  # Preview APK
eas build -p ios --profile preview2      # Preview iOS
```

**Over-the-Air (OTA) Updates**:
```bash
eas update                      # Deploy to production
eas update --branch preview2    # Deploy to preview branch
```

## Key Architecture Components

**Authentication Flow**:
- `AuthContext.jsx` - Global auth state, manages user login/logout, token persistence
- `services/authService.js` - Auth business logic (Supabase + local persistence via `database/`)
- `hooks/auth/*` - UI-facing auth hooks (login/signup/password reset, etc.)

**Storage**:
- Local persistence is handled via the `database/` abstraction and `StorageKeys`.

**Contexts** (Global State):
- `AuthContext` - Authentication and user data
- `ThemeContext` - Dark/light mode toggle
- `EmergencyContext` - Emergency booking state
- `ToastContext` - Toast notifications
- `NotificationsContext` - System notifications
- `LoginContext` - Login flow state
- `RegistrationContext` - Multi-stage signup (stages 0-3)
- `TabBarVisibilityContext` - Navigation bar visibility
- `VisitsContext` - Medical visits management

**Registration Flow** (4 stages):
- **Stage 0**: Method selection (email or phone)
- **Stage 1**: OTP verification
- **Stage 2**: Core profile (name, username, avatar)
- **Stage 3**: Optional post-login onboarding (emergency contacts, medical history, hospital preferences)

**Configuration**:
- `app.json` - Expo configuration, permissions, splash screen, OTA updates settings
- `eas.json` - EAS build profiles (development, preview, preview2, production)
- `babel.config.js` - Babel config with expo preset and nativewind plugin
- `tailwind.config.js` - Tailwind theme with custom colors and dark mode support

## Entry Points

- **App.js** - Root entry point, wraps with ExpoRoot, checks for OTA updates on app start
- **app/_layout.js** - Global layout provider stack, wraps app with AuthProvider, ThemeProvider, EmergencyProvider, ToastProvider
- **app/(auth)** - Authentication screens (login, signup, OTP, onboarding)
- **app/(user)** - Main app screens (dashboard, profile, visits, emergency)

## Testing

No test framework is currently configured (no Jest, Vitest, or Cypress configuration found). Manual testing is recommended through:
- `expo start` for local development
- EAS preview builds for pre-release testing
- Device/emulator testing via APK or IPA builds

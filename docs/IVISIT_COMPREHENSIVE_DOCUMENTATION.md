# iVisit - Comprehensive Application Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Core Philosophy & Concept](#core-philosophy--concept)
3. [Technical Architecture](#technical-architecture)
4. [Design System](#design-system)
5. [User Flows & Navigation](#user-flows--navigation)
6. [Page Structure & Components](#page-structure--components)
7. [State Management](#state-management)
8. [Data Models](#data-models)
9. [Mobile App Conversion Guide](#mobile-app-conversion-guide)
10. [Feature Breakdown](#feature-breakdown)

---

## 🎯 Project Overview

**iVisit** is an emergency medical response platform - essentially an "Uber for emergencies." It connects users with medical professionals, ambulances, and hospital beds in real-time during critical situations.

### Key Value Propositions
- **24/7 Emergency Response**: Instant access to medical services
- **5-Minute ETA**: Rapid ambulance dispatch
- **Instant Bed Booking**: Reserve hospital beds before arrival
- **Real-time Tracking**: Live map integration showing nearby hospitals and ambulances
- **Premium & Standard Tiers**: Flexible service options

### Current Implementation
This is a **web-based Progressive Web App (PWA)** built with:
- React 18.3.1 + TypeScript
- Vite (build tool)
- React Router (navigation)
- Redux Toolkit + Redux Persist (state management)
- Tailwind CSS + Radix UI (design system)
- Leaflet/OpenStreetMap (mapping)
- React Spring (animations)

---

## 🧠 Core Philosophy & Concept

### The "Uber for Emergencies" Model

iVisit mirrors the Uber experience but for medical emergencies:

1. **Request Service** → User taps SOS or Book Bed
2. **View Options** → See nearby hospitals with real-time availability
3. **Select Provider** → Choose based on distance, rating, specialty, price
4. **Track in Real-time** → Monitor ambulance/bed status on map
5. **Receive Care** → Get professional medical assistance

### User-Centric Design Principles

1. **Speed First**: Minimal clicks to emergency services
2. **Clarity in Crisis**: Large buttons, clear CTAs, high contrast
3. **Trust Building**: Ratings, ETAs, transparent pricing
4. **Accessibility**: Works in light/dark mode, responsive design
5. **Progressive Enhancement**: Works offline as PWA

---

## 🏗️ Technical Architecture

### Project Structure
```
ivisit/
├── public/                    # Static assets
│   ├── ambulance-marker.svg
│   ├── hospital-marker.svg
│   └── user-marker.svg
├── src/
│   ├── components/           # React components
│   │   ├── ambulance/       # Emergency call components
│   │   ├── bed-booking/     # Bed reservation components
│   │   ├── home/            # Landing page components
│   │   ├── layout/          # Layout components
│   │   ├── map/             # Map integration
│   │   └── ui/              # Reusable UI components (shadcn/ui)
│   ├── config/              # Configuration files
│   ├── data/                # Mock data & constants
│   ├── lib/                 # Utilities & business logic
│   │   ├── auth/           # Authentication logic
│   │   ├── slices/         # Redux slices
│   │   ├── store.ts        # Redux store configuration
│   │   └── utils.ts        # Helper functions
│   ├── pages/              # Page components
│   ├── providers/          # Context providers
│   ├── routes/             # Routing configuration
│   ├── App.tsx             # Root component
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── tailwind.config.js      # Tailwind configuration
├── vite.config.ts          # Vite configuration
└── package.json            # Dependencies
```

### Technology Stack Deep Dive

#### Frontend Framework
- **React 18.3.1**: Component-based UI
- **TypeScript**: Type safety
- **Vite**: Fast build tool with HMR

#### Routing
- **React Router v6**: Client-side routing
- Two layout types: Marketing (public) & Authenticated (protected)

#### State Management
- **Redux Toolkit**: Global state management
- **Redux Persist**: Persist auth state to localStorage
- **React Hooks**: Local component state

#### Styling
- **Tailwind CSS**: Utility-first CSS framework
- **CSS Variables**: Dynamic theming (light/dark)
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library

#### Mapping
- **Leaflet**: Interactive maps
- **React Leaflet**: React bindings for Leaflet
- **OpenStreetMap**: Map tiles (Google Maps style)

#### Animation
- **React Spring**: Physics-based animations
- **Tailwind Animate**: CSS animations

#### PWA Features
- **Vite PWA Plugin**: Service worker generation
- **Workbox**: Offline caching strategies

---

## 🎨 Design System

### Color Palette

The app uses a **semantic color system** with HSL values for easy theming:

#### Light Mode
```css
--background: 0 0% 98%           /* Off-white background */
--foreground: 222.2 84% 4.9%     /* Near-black text */
--card: 0 0% 100%                /* White cards */
--primary: 222.2 47.4% 11.2%     /* Dark blue */
--secondary: 210 40% 96.1%       /* Light gray */
--muted: 210 40% 96.1%           /* Muted gray */
--accent: 210 40% 96.1%          /* Accent gray */
--destructive: 0 84.2% 60.2%     /* Red for errors */
--border: 214.3 31.8% 91.4%      /* Light border */
```

#### Dark Mode
```css
--background: 222.2 84% 4.9%     /* Near-black background */
--foreground: 210 40% 98%        /* Off-white text */
--card: 222.2 84% 4.9%           /* Dark cards */
--primary: 210 40% 98%           /* Light primary */
--secondary: 217.2 32.6% 17.5%   /* Dark gray */
--muted: 217.2 32.6% 17.5%       /* Muted dark gray */
--accent: 217.2 32.6% 17.5%      /* Accent dark gray */
--destructive: 0 62.8% 30.6%     /* Dark red */
--border: 217.2 32.6% 17.5%      /* Dark border */
```

#### Accent Colors (Rose/Red Theme)
The primary accent is a **rose/red palette** symbolizing urgency and medical care:

```javascript
accent: {
  50: '#fff1f2',   // Lightest rose
  100: '#ffe4e6',
  200: '#fecdd3',
  300: '#fda4af',
  400: '#fb7185',
  500: '#f43f5e',  // Primary accent (rose-500)
  600: '#e11d48',  // Darker rose (buttons)
  700: '#be123c',
  800: '#9f1239',
  900: '#881337',
  950: '#4c0519',  // Darkest rose
}
```

**Usage:**
- Emergency buttons: `bg-accent-600` (rose-600)
- Hover states: `hover:bg-accent-500`
- Icons: `text-accent-500`
- Glows/highlights: `bg-accent-500/10` (10% opacity)

### Typography

**Font Family**: Inter (Google Fonts)
```css
font-family: 'Inter var', sans-serif
```

**Font Sizes & Hierarchy:**
- Hero Heading: `text-4xl sm:text-5xl md:text-6xl lg:text-7xl` (responsive)
- Page Title: `text-3xl font-bold`
- Section Heading: `text-2xl font-semibold`
- Card Title: `text-xl font-semibold`
- Body Text: `text-base`
- Small Text: `text-sm`
- Extra Small: `text-xs`

### Spacing & Layout

**Border Radius:**
```css
--radius: 0.75rem (12px)
lg: var(--radius)
md: calc(var(--radius) - 2px)
sm: calc(var(--radius) - 4px)
```

**Common Patterns:**
- Cards: `rounded-3xl` (24px) with `border border-border`
- Buttons: `rounded-full` for primary actions
- Inputs: `rounded-xl` (20px)
- Panels: `rounded-t-3xl` (mobile) or `rounded-r-xl` (desktop sidebar)

**Container Widths:**
- Max width: `max-w-7xl` (1280px)
- Sidebar: `w-[30vw] max-w-80` (desktop), `w-[80vw]` (mobile)
- Booking panel: `w-full lg:w-[400px]`

### Visual Effects

#### Glassmorphism
```css
bg-card/50 backdrop-blur-sm
```
Used on panels overlaying maps for depth.

#### Glow Effects
```html
<div class="absolute -inset-0.5 bg-accent-500/10 rounded-3xl blur opacity-30
            group-hover:opacity-50 transition duration-300"></div>
```
Creates subtle glowing borders on hover.

#### Gradient Overlays
```html
<div class="bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
```
Used on hero images for text readability.

#### Pulse Animation
```css
animate-pulse-slow: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
```
Applied to emergency buttons for attention.

### Component Patterns

#### Button Variants
```typescript
variants = {
  default: "bg-primary-900 text-white hover:bg-primary-800",
  outline: "border-2 border-primary-700 text-white hover:bg-primary-800/50",
  ghost: "text-primary-200 hover:text-white hover:bg-primary-800/50",
  accent: "bg-accent-600 text-white hover:bg-accent-500"
}

sizes = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-base",
  lg: "h-14 px-8 text-lg"
}
```

#### Card Pattern
```html
<div class="relative group">
  <div class="absolute -inset-0.5 bg-accent-500/10 rounded-3xl blur opacity-30
              group-hover:opacity-50 transition duration-300"></div>
  <div class="relative bg-card backdrop-blur-sm p-8 rounded-3xl border border-border">
    <!-- Content -->
  </div>
</div>
```

### Responsive Breakpoints

Tailwind's default breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

**Common Responsive Patterns:**
```html
<!-- Mobile-first grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

<!-- Responsive text -->
<h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl">

<!-- Hide on mobile -->
<div class="hidden md:flex">

<!-- Show only on mobile -->
<div class="md:hidden">
```

---

## 🗺️ User Flows & Navigation

### Navigation Architecture

#### Public Routes (Marketing Layout)
```
/ (Home)
  ├── Hero Section
  ├── Services Section
  └── Contact Section

/login
  └── Login/Register Form
```

**Layout Features:**
- Fixed navbar with logo, navigation links, theme toggle
- Footer with contact info and quick links
- Smooth scroll to sections

#### Protected Routes (Authenticated Layout)
```
/emergency (Ambulance Call)
/book-bed (Bed Booking)
/visits (Appointments History)
/profile (User Profile)
```

**Layout Features:**
- Desktop: Persistent sidebar (left)
- Mobile: Bottom navigation + hamburger menu
- Floating Action Button (toggles between SOS/Book Bed)

### User Journey Maps

#### Journey 1: Emergency Ambulance Request

```
1. Landing Page (/)
   ↓ Click "SOS" button

2. Login (/login) [if not authenticated]
   ↓ Enter credentials

3. Emergency Page (/emergency)
   ├── View map with nearby hospitals
   ├── Select service type (Premium/Standard)
   ├── See hospital cards with:
   │   ├── Distance & ETA
   │   ├── Rating
   │   ├── Available ambulances
   │   └── Price
   ↓ Click "Request Ambulance"

4. Ambulance Dispatched
   └── Track in real-time on map
```

#### Journey 2: Bed Booking

```
1. Landing Page (/)
   ↓ Click "Book Bed" button

2. Login (/login) [if not authenticated]
   ↓ Enter credentials

3. Bed Booking Page (/book-bed)
   ├── View map with nearby hospitals
   ├── Select medical specialty:
   │   ├── General Care
   │   ├── Emergency
   │   ├── Cardiology
   │   ├── Neurology
   │   ├── Orthopedics
   │   ├── Pediatrics
   │   └── Oncology
   ├── See filtered hospital cards with:
   │   ├── Distance
   │   ├── Available beds
   │   ├── Wait time
   │   └── Rating
   ↓ Click "Book Bed"

4. Bed Reserved
   └── Confirmation with hospital details
```

#### Journey 3: View Past Visits

```
1. Authenticated User
   ↓ Click "Visits" in navigation

2. Visits Page (/visits)
   └── View cards showing:
       ├── Hospital name & image
       ├── Doctor & specialty
       ├── Date & time
       ├── Visit type (Check-up, Follow-up, Emergency)
       └── Status (Upcoming, Completed)
```

#### Journey 4: Manage Profile

```
1. Authenticated User
   ↓ Click "Profile" in navigation

2. Profile Page (/profile)
   └── View/Edit:
       ├── Personal Information (name, email, phone)
       ├── Emergency Contacts
       └── Medical History
```

### Authentication Flow

```
Unauthenticated User
├── Tries to access protected route
│   ↓ Redirected to /login
│
├── On /login page
│   ├── Toggle between Login/Register
│   ├── Enter credentials
│   ├── OR use social login (Google, Apple, Facebook, Twitter)
│   ↓ Submit
│
└── Authenticated
    ├── Redux state updated (isAuthenticated: true)
    ├── User data persisted to localStorage
    └── Redirected to intended route (or /emergency by default)

Authenticated User
├── Visits public pages (/, /login)
│   └── Auto-redirected to /emergency
│
└── Clicks Logout
    ├── Redux state cleared
    ├── localStorage cleared
    └── Redirected to /
```

---

## 📄 Page Structure & Components

### 1. Home Page (`/`)

**Layout:** Marketing Layout (Navbar + Footer)

**Sections:**

#### Hero Section
```typescript
// Location: src/components/home/Hero.tsx

Features:
- Large heading: "iVisit"
- Tagline: "Professional medical assistance within minutes"
- Feature badges: 24/7 Response, 5 min ETA, Instant Booking
- Two CTAs: "SOS" (accent button) + "Book Bed" (outline button)
- Hero image (theme-aware: different images for light/dark mode)
- Gradient overlay for text contrast
- Fade-in animation on load

Responsive:
- Mobile: Stacked layout, centered text
- Desktop: Two-column grid (text left, image right)
```

#### Services Section
```typescript
// Location: src/components/home/Services.tsx

Features:
- Grid of 4 service cards:
  1. Emergency Response (Ambulance icon)
  2. Urgent Care (HeartPulse icon)
  3. Bed Booking (Bed icon)
  4. General Check-ups (Stethoscope icon)
- Each card has:
  - Icon (accent color)
  - Title
  - Description
  - Glow effect on hover
  - Glassmorphism background

Responsive:
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 4 columns
```

#### Contact Section
```typescript
// Location: src/components/home/Contact.tsx

Features:
- Contact info cards (3 columns):
  - Emergency: 1-800-IVISIT-1
  - Email: help@ivisit.com
  - Available: 24/7
- Contact form:
  - Name input
  - Email input
  - Message textarea
  - Submit button
- Glassmorphism styling

Responsive:
- Mobile: Stacked cards
- Desktop: 3-column grid
```

### 2. Login Page (`/login`)

**Layout:** Marketing Layout

**Features:**
```typescript
// Location: src/pages/Login.tsx

State:
- isLogin: boolean (toggles between login/register)
- name, email, password: form fields

Components:
- Toggle between "Welcome Back" (login) and "Create Your Account" (register)
- Form fields:
  - Name (register only)
  - Email
  - Password
- Social login buttons (Google, Apple, Facebook, Twitter)
- Error alert (if authentication fails)
- Submit button (shows loading state)
- Toggle link ("Don't have an account?" / "Already have an account?")

Styling:
- Centered card with max-width
- Border on login mode
- Accent button for submit

Redux Integration:
- Dispatches loginUser() or registerUser()
- On success: navigates to intended route
- On error: displays error message
```

### 3. Emergency Page (`/emergency`)

**Layout:** Authenticated Layout

**Structure:**
```typescript
// Location: src/pages/AmbulanceCall.tsx
// Main Component: src/components/ambulance/AmbulanceCall.tsx

Layout:
┌─────────────────────────────────────────┐
│  Map (50vh mobile, 100vh desktop)       │
│  - User location marker                 │
│  - Hospital markers                     │
│  - Refresh button (bottom-right)        │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Service Panel (400px wide, right side) │
│  ├── Emergency Header                   │
│  ├── Service Type Selector              │
│  │   ├── Premium                        │
│  │   └── Standard                       │
│  ├── Call Emergency (911) Button        │
│  └── Hospital Cards (filtered by type)  │
│      ├── Hospital Image                 │
│      ├── Name & Rating                  │
│      ├── Distance & ETA                 │
│      ├── Available Ambulances           │
│      ├── Price                          │
│      └── "Request Ambulance" Button     │
└─────────────────────────────────────────┘

State:
- selectedHospital: string | null
- serviceType: 'Premium' | 'Standard'
- userLocation: [number, number] | null

Interactions:
- Click hospital card → highlights on map
- Click "Request Ambulance" → dispatches ambulance
- Click map marker → selects hospital
- Toggle service type → filters hospital list
```

**Sub-components:**

```typescript
// EmergencyHeader.tsx
- Icon + "Emergency Services" title
- Subtitle: "Select a hospital to request ambulance"

// ServiceTypeSelector.tsx
- Two buttons: Premium / Standard
- Active state styling
- Icon indicators

// HospitalCard.tsx
- Hospital image with fallback
- Name, rating (stars)
- Distance, ETA, ambulances available
- Price badge
- "Request Ambulance" button
- Selected state (border highlight)
```

### 4. Bed Booking Page (`/book-bed`)

**Layout:** Authenticated Layout

**Structure:**
```typescript
// Location: src/pages/BedBooking.tsx
// Main Component: src/components/bed-booking/BedBooking.tsx

Layout:
┌─────────────────────────────────────────┐
│  Map (50vh mobile, 100vh desktop)       │
│  - User location marker                 │
│  - Hospital markers                     │
│  - Refresh button (bottom-right)        │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Booking Panel (400px wide, right side) │
│  ├── Booking Header                     │
│  ├── Specialty Selector (grid)          │
│  │   ├── General Care                   │
│  │   ├── Emergency                      │
│  │   ├── Cardiology                     │
│  │   ├── Neurology                      │
│  │   ├── Orthopedics                    │
│  │   ├── Pediatrics                     │
│  │   └── Oncology                       │
│  └── Hospital List (filtered)           │
│      ├── Hospital Name                  │
│      ├── Distance                       │
│      ├── Available Beds                 │
│      ├── Wait Time                      │
│      ├── Rating                         │
│      └── "Book Bed" Button              │
└─────────────────────────────────────────┘

State (useBookingState hook):
- selectedSpecialty: string
- selectedHospital: string | null
- userLocation: [number, number] | null

Interactions:
- Click specialty → filters hospitals
- Click hospital → highlights on map
- Click "Book Bed" → reserves bed
```

**Sub-components:**

```typescript
// BookingHeader.tsx
- Icon + "Book a Bed" title
- Subtitle: "Select specialty and hospital"

// SpecialtySelector.tsx
- Grid of specialty buttons (2-3 columns)
- Each button:
  - Stethoscope icon
  - Specialty name
  - Active state (accent background)

// HospitalList.tsx
- Filtered list based on selectedSpecialty
- Maps over hospitals with matching specialty

// HospitalCard.tsx (bed-booking version)
- Hospital name
- Distance
- Available beds count
- Wait time
- Rating
- "Book Bed" button
```

### 5. Visits Page (`/visits`)

**Layout:** Authenticated Layout

**Structure:**
```typescript
// Location: src/pages/Appointments.tsx

Layout:
- Page title: "Your Visits"
- Grid of visit cards (1-3 columns responsive)

Visit Card:
├── Hospital image (top)
├── Hospital name
├── Visit type badge (Check-up, Follow-up, Emergency)
├── Status badge (Upcoming, Completed)
├── Doctor info:
│   ├── Avatar
│   ├── Name
│   └── Specialty
├── Date & time
├── Location
└── "View Details" button

Data:
- Currently uses mock data
- Shows past and upcoming visits
- Color-coded status badges

Responsive:
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3 columns
```

### 6. Profile Page (`/profile`)

**Layout:** Authenticated Layout

**Structure:**
```typescript
// Location: src/pages/Profile.tsx

Layout:
- Page title: "Your Profile"
- Grid of cards (2 columns on desktop)

Cards:
1. Personal Information (full width)
   ├── Avatar (large, 96px)
   ├── Name & email display
   ├── Form fields:
   │   ├── Full Name (with User icon)
   │   ├── Email (with Mail icon)
   │   └── Phone (with Phone icon)
   └── "Update Profile" button

2. Emergency Contacts
   ├── List of contacts:
   │   ├── Name
   │   ├── Relationship
   │   ├── Phone number
   │   └── Edit button
   └── "Add Emergency Contact" button

3. Medical History
   ├── Description text
   ├── List:
   │   ├── Allergies
   │   ├── Medications
   │   ├── Past Surgeries
   │   └── Chronic Conditions
   └── "View Full Medical History" button

Data Source:
- Redux: useSelector((state) => state.auth.user)
- User object contains all profile data
```

---

## 🔄 State Management

### Redux Store Architecture

```typescript
// Location: src/lib/store.ts

Store Structure:
{
  auth: AuthState,
  // Future: hospital, booking, etc.
}

Configuration:
- Redux Toolkit (configureStore)
- Redux Persist (localStorage)
- Whitelist: ['auth'] (only auth persists)
```

### Auth Slice

```typescript
// Location: src/lib/slices/authSlice.ts

State:
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

Actions (Async Thunks):
1. loginUser({ email, password })
   - Calls auth.login()
   - On success: sets user, isAuthenticated = true
   - On error: sets error message

2. registerUser({ name, email, password })
   - Calls auth.register()
   - On success: sets user, isAuthenticated = true
   - On error: sets error message

3. logoutUser()
   - Calls auth.logout()
   - Clears user, isAuthenticated = false

Reducers:
- resetAuthError(): Clears error state

Persistence:
- Entire auth state saved to localStorage
- Rehydrated on app load
```

### Auth Logic

```typescript
// Location: src/lib/auth/auth.ts

Functions:
1. login(credentials)
   - Simulates API call (1s delay)
   - Returns mock user from client.ts
   - In production: would call real API

2. register(userData)
   - Simulates API call (1s delay)
   - Creates new user object
   - In production: would call real API

3. logout()
   - Simulates API call (0.5s delay)
   - In production: would invalidate session

Mock Data:
// Location: src/lib/auth/client.ts
- mockUsers array
- mockHospitals array
- fetchUser(id) function
- fetchHospitals() function
- createBooking(booking) function
```

### Auth Wrapper

```typescript
// Location: src/providers/AuthWrapper.tsx

Purpose:
- Protects routes based on authentication
- Redirects unauthenticated users to /
- Redirects authenticated users away from /login

Logic:
const UNAUTHENTICATED_PAGES = ['/', '/login'];
const DEFAULT_AUTH_PAGE = '/emergency';

if (isAuthenticated && isOnUnauthenticatedPage) {
  navigate(DEFAULT_AUTH_PAGE);
} else if (!isAuthenticated && !isOnUnauthenticatedPage) {
  navigate('/');
}

Loading State:
- Shows LoadingSpinner while checking auth
```

### Provider Hierarchy

```typescript
// Location: src/providers/index.tsx

<Provider store={store}>                    // Redux
  <PersistGate persistor={persistor}>       // Redux Persist
    <ErrorBoundary>                         // Error handling
      <ThemeProvider>                       // Dark/light mode
        <Router>                            // React Router
          <AuthWrapper>                     // Auth protection
            {children}
          </AuthWrapper>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  </PersistGate>
</Provider>
```

### Theme Context

```typescript
// Location: src/providers/ThemeContext.tsx

State:
- theme: 'dark' | 'light'

Functions:
- toggleTheme(): Switches between dark/light

Features:
- Reads system preference on first load
- Saves preference to localStorage
- Updates CSS variables dynamically
- Listens for system theme changes

Usage:
const { theme, toggleTheme } = useTheme();
```

---

## 📊 Data Models

### User Model

```typescript
interface User {
  id: string;                    // Unique identifier
  name: string;                  // Full name
  email: string;                 // Email address
  phoneNumber?: string;          // Phone number (optional)
  location?: {                   // Current location
    latitude: number;
    longitude: number;
  };
  avatarUrl?: string;            // Profile picture URL
  authenticationProviders?: {    // Auth providers
    google?: string;
    apple?: string;
    custom?: string;
  };
  emergencyContacts?: EmergencyContact[];  // Emergency contacts
}

interface EmergencyContact {
  name: string;
  phoneNumber: string;
  relationship: string;          // e.g., "Spouse", "Parent"
}
```

### Hospital Model

```typescript
interface Hospital {
  id: string;                    // Unique identifier
  name: string;                  // Hospital name
  address?: string;              // Full address
  location?: {                   // GPS coordinates
    latitude: number;
    longitude: number;
  };
  phoneNumber?: string;          // Contact number
  specialties: string[];         // Medical specialties offered
  rating: number;                // Star rating (0-5)
  availableBeds: number;         // Number of available beds
  waitTime?: string;             // Average wait time
  distance?: string;             // Distance from user
  eta?: string;                  // Estimated time of arrival
  ambulances?: number;           // Available ambulances
  type?: 'Premium' | 'Standard'; // Service tier
  price?: string;                // Pricing info
  image: string;                 // Hospital image URL
}
```

### Booking Model

```typescript
interface Booking {
  id: string;                    // Unique identifier
  userId: string;                // User who made booking
  hospitalId: string;            // Hospital booked
  specialty: string;             // Medical specialty
  serviceType: 'ambulance' | 'bed';  // Type of service
  ambulanceId?: string;          // Ambulance ID (if applicable)
  bedId?: string;                // Bed ID (if applicable)
  status: 'pending' | 'accepted' | 'inProgress' | 'completed' | 'cancelled';
  bookingTime: Date;             // When booking was made
  estimatedArrivalTime?: Date;   // ETA (for ambulance)
  arrivalTime?: Date;            // Actual arrival time
  price: number;                 // Booking cost
}
```

### Ambulance Model

```typescript
interface Ambulance {
  id: string;                    // Unique identifier
  hospitalId: string;            // Hospital it belongs to
  location: {                    // Current GPS location
    latitude: number;
    longitude: number;
  };
  status: 'available' | 'enroute' | 'unavailable';
  driver: {                      // Driver information
    name: string;
    phoneNumber: string;
  };
}
```

---

## 📱 Mobile App Conversion Guide

### Overview: Web to React Native/Expo

This section provides a comprehensive guide for converting the iVisit web app to a mobile app using **React Native** with **Expo**.

### Technology Stack Mapping

| Web Technology | Mobile Equivalent | Notes |
|----------------|-------------------|-------|
| React 18 | React Native | Same component model |
| React Router | React Navigation | Stack, Tab, Drawer navigators |
| Tailwind CSS | NativeWind or StyleSheet | NativeWind = Tailwind for RN |
| Radix UI | React Native Paper / Native Base | Component libraries |
| Leaflet Maps | React Native Maps | Native map component |
| Redux Toolkit | Redux Toolkit (same) | No changes needed |
| Redux Persist | Redux Persist + AsyncStorage | Use AsyncStorage instead of localStorage |
| Vite | Metro Bundler | Expo's default bundler |
| PWA | Native App | No service workers needed |
| Lucide React | React Native Vector Icons | Icon library |
| React Spring | React Native Reanimated | Animation library |

### Step-by-Step Conversion Plan

#### Phase 1: Project Setup

```bash
# Initialize Expo project
npx create-expo-app ivisit-mobile --template

# Install dependencies
cd ivisit-mobile

# Core dependencies
npx expo install react-native-maps
npx expo install @react-navigation/native
npx expo install @react-navigation/stack
npx expo install @react-navigation/bottom-tabs
npx expo install @react-navigation/drawer
npx expo install react-native-screens react-native-safe-area-context
npx expo install @reduxjs/toolkit react-redux redux-persist
npx expo install @react-native-async-storage/async-storage
npx expo install react-native-reanimated
npx expo install react-native-gesture-handler
npx expo install react-native-vector-icons

# UI libraries
npx expo install react-native-paper
# OR
npm install native-base

# NativeWind (Tailwind for React Native)
npm install nativewind
npm install --save-dev tailwindcss@3.3.2
```

#### Phase 2: Project Structure

```
ivisit-mobile/
├── app/                       # Expo Router (or src/)
│   ├── (auth)/               # Auth screens
│   │   └── login.tsx
│   ├── (tabs)/               # Tab navigation
│   │   ├── emergency.tsx
│   │   ├── book-bed.tsx
│   │   ├── visits.tsx
│   │   └── profile.tsx
│   └── index.tsx             # Entry point
├── components/
│   ├── ambulance/
│   ├── bed-booking/
│   ├── home/
│   ├── layout/
│   ├── map/
│   └── ui/
├── lib/
│   ├── auth/
│   ├── slices/
│   ├── store.ts
│   └── utils.ts
├── providers/
│   ├── ThemeProvider.tsx
│   ├── AuthWrapper.tsx
│   └── index.tsx
├── constants/
│   ├── Colors.ts
│   └── Styles.ts
├── app.json
├── tailwind.config.js
└── package.json
```

#### Phase 3: Navigation Setup

**Web (React Router):**
```typescript
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/login" element={<Login />} />
  <Route path="/emergency" element={<Emergency />} />
</Routes>
```

**Mobile (React Navigation):**
```typescript
// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Emergency"
        component={EmergencyScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="ambulance" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen name="BookBed" component={BookBedScreen} />
      <Tab.Screen name="Visits" component={VisitsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
```

#### Phase 4: Styling Conversion

**Option 1: NativeWind (Recommended)**

```typescript
// Web
<div className="bg-accent-600 text-white px-6 py-4 rounded-xl">
  <span>Emergency SOS</span>
</div>

// Mobile with NativeWind
<View className="bg-accent-600 px-6 py-4 rounded-xl">
  <Text className="text-white">Emergency SOS</Text>
</View>
```

**Option 2: StyleSheet**

```typescript
// constants/Colors.ts
export const Colors = {
  light: {
    background: '#fafafa',
    foreground: '#0a0a0a',
    accent: '#e11d48',
    // ... all other colors
  },
  dark: {
    background: '#0a0a0a',
    foreground: '#fafafa',
    accent: '#f43f5e',
    // ... all other colors
  },
};

// Component
import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

<TouchableOpacity style={styles.button}>
  <Text style={styles.buttonText}>Emergency SOS</Text>
</TouchableOpacity>
```

#### Phase 5: Component Conversion Examples

**Button Component:**

```typescript
// Web: src/components/ui/Button.tsx
export function Button({ variant, size, children, ...props }) {
  return (
    <button className={cn(baseStyles, variants[variant], sizes[size])}>
      {children}
    </button>
  );
}

// Mobile: components/ui/Button.tsx
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export function Button({ variant = 'default', size = 'md', children, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], styles[size]]}
      onPress={onPress}
    >
      <Text style={styles.text}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  default: {
    backgroundColor: '#1e293b',
  },
  accent: {
    backgroundColor: '#e11d48',
  },
  md: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  lg: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

**Card Component:**

```typescript
// Web
<div className="bg-card rounded-3xl border border-border p-8">
  <h3 className="text-xl font-semibold">Title</h3>
  <p className="text-muted-foreground">Description</p>
</div>

// Mobile
<View style={styles.card}>
  <Text style={styles.title}>Title</Text>
  <Text style={styles.description}>Description</Text>
</View>

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0a0a0a',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
});
```

#### Phase 6: Map Integration

**Web (Leaflet):**
```typescript
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

<MapContainer center={[lat, lng]} zoom={16}>
  <TileLayer url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" />
  <Marker position={[lat, lng]} />
</MapContainer>
```

**Mobile (React Native Maps):**
```typescript
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

<MapView
  provider={PROVIDER_GOOGLE}
  style={styles.map}
  initialRegion={{
    latitude: lat,
    longitude: lng,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }}
>
  <Marker coordinate={{ latitude: lat, longitude: lng }} />
</MapView>

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
});
```

**Custom Markers:**
```typescript
// Web
<Marker icon={hospitalIcon} />

// Mobile
<Marker
  coordinate={{ latitude: lat, longitude: lng }}
  image={require('../assets/hospital-marker.png')}
  // OR
>
  <View style={styles.markerContainer}>
    <Icon name="hospital" size={30} color="#e11d48" />
  </View>
</Marker>
```

#### Phase 7: State Management (No Changes!)

Redux Toolkit works identically in React Native. Only change:

```typescript
// Web: localStorage
import storage from 'redux-persist/lib/storage';

// Mobile: AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,  // Changed from storage
  whitelist: ['auth'],
};
```

#### Phase 8: Authentication

**Social Login:**

```bash
# Install Expo Auth Session
npx expo install expo-auth-session expo-crypto

# Google Sign-In
npx expo install @react-native-google-signin/google-signin

# Apple Sign-In
npx expo install @invertase/react-native-apple-authentication
```

```typescript
// Google Sign-In Example
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID',
});

async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices();
  const userInfo = await GoogleSignin.signIn();
  // Dispatch to Redux
}
```



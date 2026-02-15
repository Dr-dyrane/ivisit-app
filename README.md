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

## ⚒️ **Version Control & Workflow**

To ensure stability while maintaining velocity, iVisit follows a **Gitflow-lite** strategy combined with **Expo Application Services (EAS)** for deployments.

### **Branching Model**

| Branch Type | Name Pattern | Target | Purpose |
|-------------|--------------|--------|---------|
| **Production** | `main` | - | Stable code. Always buildable and deployable to App Store. |
| **Development** | `develop` | `main` | Integration branch for features. Reflects current state for QA. |
| **Feature** | `feat/*` | `develop` | Individual tasks or features. |
| **Hotfix** | `fix/*` | `main` | Immediate production fixes. |

### **EAS Deployment Pipeline**

We use EAS Channels to map branches to specific build environments:

| Environment | EAS Profile | EAS Channel | Branch | Update Policy | Build Type | Target |
|-------------|-------------|-------------|--------|---------------|------------|--------|
| **Development** | `staging` | `staging` | `develop` | Auto-increment | App Bundle | Closed Testing |
| **Production** | `production` | `production` | `main` | Manual version control | App Bundle | Production |
| **Feature Dev** | `development` | `dev` | `feat/*` | Ad-hoc builds for testing | Development Client | Internal |
| **Quick Testing** | `preview` | `preview` | Any | Auto-increment | **APK** | Direct Install |

### **Release Workflows**

#### **Development Testing (Auto-Increment)**
```bash
# On develop branch - auto-increments version code
eas build --platform android --profile staging
eas submit --platform android --profile staging
```

#### **Production Release (Manual Version)**
```bash
# On main branch - manual version control
# Step 1: Update version in app.json (1.0.5 → 1.0.6)
# Step 2: Build production AAB
eas build --platform android --profile production
# Step 3: Submit to production track
eas submit --platform android --profile production
```

#### **Feature Development (Internal Testing)**
```bash
# On feature branches - internal testing for your Google account only
eas build --platform android --profile development
eas submit --platform android --profile development
```

#### **Quick OTA Updates (No New Build)**
```bash
# Push updates to existing installs on develop branch
eas update --branch staging --message "Bug fixes and improvements"
```

### **Workflow Steps**

1. **Feature Start**: Create a branch `feat/your-feature` from `develop`.
2. **Implementation**: Build and test locally using `npx expo start`.
3. **Pull Request**: Open PR to `develop`. Automated build checks must pass.
4. **Integration**: Merge to `develop`. EAS Staging build/update is triggered.
5. **Release**: Merge `develop` to `main` for Production submission.

### **Complete Feature/Fix Workflow Example**

This is a step-by-step guide for implementing a feature or fix from start to Play Store release.

**Example**: Fix login flow - too many steps

#### Step 1: Start Feature Branch

```bash
# Ensure main and develop are up to date
git checkout main && git pull origin main
git checkout develop && git pull origin develop

# Create feature/fix branch from develop
git checkout -b fix/login-too-many-steps
```

#### Step 2: Develop & Test Locally

```bash
# Start dev server
npx expo start

# Make changes, commit as you go
git add -A
git commit -m "Fix: Simplify login flow - remove redundant steps"
```

#### Step 3: Build APK for Device Testing (Recommended)

```bash
# Build APK using preview profile (generates direct install file)
npx eas build --profile preview --platform android
```

Download the APK from Expo dashboard and install directly on your device:
- **No Google Play Store required**
- **Perfect for Android map testing**
- **Direct USB installation or file transfer**

#### Step 4: Push & Create PR

```bash
# Push feature branch
git push origin fix/login-too-many-steps

# Create PR on GitHub: fix/login-too-many-steps → develop
```

#### Step 5: Merge to Develop & QA Testing

```bash
# After PR approved, merge to develop
git checkout develop
git pull origin develop
git merge fix/login-too-many-steps
git push origin develop

# Push OTA update to staging channel for QA
npx eas update --branch staging --message "Fix: Simplify login flow"
```

#### Step 6: Ready for Production - Merge to Main

```bash
# Bump version in app.json (PATCH for bug fix: 1.0.4 → 1.0.5)
# Then merge to main
git checkout main
git pull origin main
git merge develop -m "Release v1.0.5: Apple-quality animations and log cleanup"
git push origin main
```

#### Step 7: Final APK Test Before Play Store

```bash
# Build APK for final verification
npx eas build --profile preview --platform android
```

Download, install, and thoroughly test on device.

#### Step 8: Build AAB & Submit to Play Store

```bash
# Build production AAB (Android App Bundle)
npx eas build --profile production --platform android

# Submit to Play Store
npx eas submit --profile production --platform android
```

#### Step 9: Cleanup

```bash
# Delete feature branch (local and remote)
git branch -d fix/login-too-many-steps
git push origin --delete fix/login-too-many-steps
```

### **Quick Reference Commands**

| Stage | Git Command | EAS Command | Purpose |
|-------|-------------|-------------|---------|
| Start fix | `git checkout -b fix/xxx` from `develop` | - | Create feature branch |
| Local dev | - | `npx expo start` | Development server |
| **Quick APK test** | - | `eas build --profile preview -p android` | **Direct APK install** |
| Official release | - | `eas build --profile production -p android && eas submit --profile production -p android` | Manual version release |
| Merge to develop | `git merge fix/xxx` to `develop` | `eas update --branch staging` | Integration testing |
| Production prep | Update app.json version | `eas build --profile production -p android` | Production build |

### **Versioning Policy**

We use **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`

#### **Version Code Formula:**
```
Version Code = MAJOR * 10000 + MINOR * 100 + PATCH
```

**Examples:**
- `1.0.4` → `1*10000 + 0*100 + 4` → `10004`
- `1.0.5` → `1*10000 + 0*100 + 5` → `10005`
- `1.1.0` → `1*10000 + 1*100 + 0` → `10100`
- `2.0.0` → `2*10000 + 0*100 + 0` → `20000`

#### **When to Update:**
- **PATCH version** (bug fixes): Increment version code by 1
- **MINOR version** (features): Increment version code by 100
- **MAJOR version** (breaking): Increment version code by 10000

#### **Auto-Increment Profiles:**
- `staging`, `preview`, `development` profiles auto-increment version codes
- `production` profile uses manual version control
- **Note**: EAS manages version codes remotely when `appVersionSource: "remote"`

**Current**: Version `1.0.5` → EAS-managed version code

---

## 🏛️ **Ecosystem Audit & Architecture**

iVisit follows a robust, multi-layered database architecture designed for high-availability and strict security.

### **1. Primary Entity Layer (Core)**
| Table | Description | RLS Policy Model |
| :--- | :--- | :--- |
| `profiles` | Multi-role user identity (Admin, Patient, Provider, etc.) | Owner-update; Admin-all. |
| `hospitals` | Hospital metadata & geo-coordinates | Authenticated-read; Admin-all. |
| `doctors` | Specialized medical professionals linked to hospitals | Authenticated-read; Admin-all. |
| `visits` | Appointment & medical encounter records | Owner-access; Admin-view. |
| `ambulances` | Fleet assets | Auth-read; Admin-manage. |
| `organizations` | Business entity roots | Strict Org-Admin isolation. |
| `id_mappings` | UUID <-> Display ID translation | Internal service usage. |

### **2. Financial & Transactional Layer**
| Table | Description | RLS Policy Model |
| :--- | :--- | :--- |
| `ivisit_main_wallet` | Platform-level fee treasury | Admin-only (Strict). |
| `organization_wallets`| Business-level balances | Org-Admin only. |
| `wallet_ledger` | Triple-entry immutable transaction log | Auditable; Admin view-all. |
| `payments` | Records of all Stripe and Cash transactions | Owner + Org-Admin view. |
| `patient_wallets` | Individual credit/debit balances for patients | Owner-only. |

### **3. Automation Layer (Triggers)**
- **Auto-Provisioning**: Profiles, preferences, medical profiles, and wallets are automatically created on user signup.
- **ID Beautification**: Custom triggers generate human-readable IDs (e.g., `IVP-123456`) and synchronize them across the ecosystem.
- **Ledger Integration**: Financial triggers ensure that every payment is automatically recorded in the immutable ledger.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For inquiries, please email us at [support@ivisit.ng](mailto:support@ivisit.ng).

---

_Visit our website for more information: [iVisit](http://ivisit.ng)._


# 🧬 iVisit Master Blueprint & Snapshot
> **Version:** 1.0.0 (The "Unity" Release)
> **Date:** 2026-01-13
> **Status:** Live / Active Development

---

## 💌 The Philosophy ("A Love Letter to the Future")

iVisit is not just an app; it is a **lifeline infrastructure** for Lagos and developing nations. It bridges the gap between a fragmented healthcare system and patients in desperate need.

**The Mission:**
> To democratize emergency response. We don't own the ambulances; we connect the person in pain to the nearest help—whether that's a sophisticated hospital ambulance, a registered private paramedic, or a "Good Samaritan" driver.

**The "Unity" Concept:**
This codebase is designed to be **mirrored**.
*   **Patient App (Current):** The SOS beacon.
*   **Provider App (The Mirror):** The responder dashboard.
*   **Admin Dashboard (The Overseer):** The traffic control tower.

This document serves as the **DNA** for all three. You should be able to drop this file into an empty Expo or Next.js project, and an AI agent should know exactly what to build to complete the ecosystem.

---

## 👥 User Ecosystem & Roles

We share a single `public.profiles` table, distinguished by `role`.

### 1. The Patient (Default)
*   **Goal:** Survival. Needs help NOW.
*   **Key Features:** SOS Button, Location Tracking, Medical Profile, Insurance Wallet.
*   **Payment:** Cashless preference (Insurance-first).

### 2. The Service Provider (The "Driver")
*   **Sub-types:**
    *   `hospital`: A facility with beds and ambulances.
    *   `ambulance_service`: A private fleet.
    *   `doctor`: A verified medical practitioner (Telemedicine/Home visit).
    *   `driver`: A registered individual with a vehicle capable of transport.
*   **Goal:** Rescue & Revenue.
*   **Key Features:**
    *   **"Online/Offline" Toggle:** Ready to receive requests.
    *   **Request Feed:** "Incoming SOS: 2.3km away".
    *   **Navigation:** Turn-by-turn to patient.
    *   **Asset Management:** "I have 3 beds free", "My ambulance is busy".

### 3. The Admin (Investor/Manager)
*   **Goal:** Oversight.
*   **Key Features:** Live Map (God View), KPI Dashboard (Response times, active trips), User Verification queue.

---

## 🏗️ Data Architecture (Supabase)

### Core Tables
1.  **`profiles`**: The Identity.
    *   `id` (UUID), `role` (enum: patient, provider, admin), `provider_type` (hospital, doctor, etc.), `bvn_verified` (bool).
2.  **`medical_profiles`**: The Health Data.
    *   Linked to `profiles`. Blood type, allergies, conditions.
3.  **`emergency_requests`**: The "Trip".
    *   **State Machine:** `pending` -> `accepted` -> `arrived` -> `in_progress` (trip) -> `completed`.
    *   **Location:**
        *   `pickup_location` (Static start).
        *   `patient_location` (Dynamic/Live).
        *   `responder_location` (Dynamic/Live).
        *   `destination_location` (Hospital).
4.  **`visits`**: The History.
    *   Archived emergency requests + Scheduled appointments.
5.  **`insurance_policies`**: The Wallet.
    *   `user_id`, `provider` (e.g., 'iVisit Basic', 'AXA Mansard'), `policy_number`, `status` (active/expired).

---

## 📱 Patient App Flow (Current Implementation)

1.  **Onboarding**:
    *   **Phone/Email Auth** (Supabase).
    *   **Profile Gate**: Must complete Name/Phone.
    *   **Insurance Auto-Enrollment**: User is automatically given "iVisit Basic" coverage (Simulated).
2.  **Home (Emergency)**:
    *   **Map Interface**: Shows nearby hospitals (seeded from DB).
    *   **SOS Button**:
        *   **Mode A (Ambulance):** Request pickup.
        *   **Mode B (Booking):** Reserve a bed (self-transport).
3.  **The Request Lifecycle**:
    *   **Searching**: Animation, finding nearby providers.
    *   **Dispatch**: Provider accepts.
    *   **Tracking**: Live map shows Ambulance icon moving (Realtime subscription).
    *   **Feedback**: Haptic pulses and Sounds (Urgent/High/Normal priorities).
4.  **Telemedicine**:
    *   "Consult a Doctor" button -> Deep link to WhatsApp/Zoom with pre-filled message.
    *   *Why?* Low bandwidth, high familiarity in Lagos. Don't reinvent the wheel yet.

---

## 🚗 Provider App Flow (The Mirror - To Be Built)

1.  **Onboarding**:
    *   Register as Hospital/Doctor/Driver.
    *   Upload Credentials (Medical License, Vehicle Papers).
    *   **Verification**: Pending Admin approval.
2.  **Dashboard**:
    *   **Status**: "Go Online".
    *   **Assets**: "Update Bed Count" (Quick toggle).
3.  **The Rescue Lifecycle**:
    *   **Alert**: Loud ringtone (like Uber). "Emergency Request nearby".
    *   **Accept**: Locks the request. Updates `emergency_requests.status` to `accepted`.
    *   **Navigate**: Open Google Maps/Waze to `patient_location`.
    *   **Arrive**: Button "I'm here". Updates status to `arrived`.
    *   **Transport**: "Start Trip" to Hospital.
    *   **Handover**: "Complete Job".

---

## 💻 Admin Dashboard Flow (The Overseer - To Be Built)

1.  **Map View**:
    *   Cluster map of all active `emergency_requests` and `online_providers`.
2.  **Verification Queue**:
    *   List of new Providers awaiting document check.
3.  **Analytics**:
    *   Average Response Time.
    *   Total Lives Touched.

---

## 🎨 UI/UX Manifesto

*   **Feel:** "Unity". Clean, rounded, premium.
*   **Colors:**
    *   Primary: `#E63946` (Urgent Red).
    *   Secondary: `#1D3557` (Trust Blue).
    *   Background: `#F1FAEE` (Calm White) / `#0B0F1A` (Deep Night).
*   **Interaction:**
    *   **Haptics**: Heavy usage. The user should *feel* the urgency.
    *   **Sound**: Custom alerts for different states.
    *   **Maps**: Custom styled (Google Maps JSON).

---

## 🚀 Edge Cases & Safety

1.  **Offline Mode**:
    *   App caches `medical_profile` and `active_trip` locally.
    *   Syncs immediately upon reconnection.
2.  **Location Drift**:
    *   Patient might move (e.g., walking to a main road).
    *   **Solution**: Patient App pushes `patient_location` every 10s during active request. Provider App subscribes to this.
3.  **Payment Failure**:
    *   **Solution**: Insurance-first. If "iVisit Basic", we cover the dispatch fee. We deal with the insurance backend, not the panicked user.

---

## 🍏 App Store Compliance (Medical/Emergency)

1.  **Disclaimer**: "Not a replacement for 911/112 in life-threatening situations" (Must be visible).
2.  **Data Privacy**: Medical data (`medical_profiles`) must be treated with HIPAA/NDPR standards (Row Level Security in Supabase).
3.  **Location**: "Always Allow" permission justification is "Dispatching emergency services".

---

## 🛠️ Technical Stack (The "Kit")

*   **Frontend**: React Native (Expo).
*   **Backend**: Supabase (Postgres, Auth, Realtime, Storage).
*   **Maps**: `react-native-maps` + Google Places API.
*   **State**: React Context + TanStack Query (or custom hooks with Supabase).
*   **Notifications**: Expo Notifications + Supabase Realtime (In-app).

---

*Use this blueprint to build the future.*

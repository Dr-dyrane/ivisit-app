# iVisit Admin & Provider Dashboard (Web) - Implementation Spec

> **Role:** This document is the **single source of truth** for building the web-based "Control Tower" for iVisit. It is designed to be fed into an AI agent (Cursor, Windsurf, Trae) to generate a Next.js project that perfectly mirrors the mobile app's soul.

---

## 1. Project Identity
*   **Name:** iVisit Control Tower
*   **Stack:** Next.js 14+ (App Router), Tailwind CSS, Supabase (Auth/DB/Realtime), Shadcn/UI.
*   **Design Language:** "Unity" (Matches Mobile App).
    *   **Colors:** Primary Red (`#E63946`), Trust Blue (`#1D3557`), Deep Night (`#0B0F1A`).
    *   **Geometry:** Squircle borders (`rounded-2xl`), floating cards, glassmorphism overlays.
    *   **Typography:** Sans-serif, bold headers, clean data tables.

---

## 2. Core User Roles (Web)
This dashboard serves two distinct masters. The UI must adapt based on the logged-in user's `role` in the `public.profiles` table.

### A. The Super Admin ("The Overseer")
*   **Goal:** Manage the ecosystem, verify providers, and monitor live emergencies.
*   **Key Views:**
    1.  **God Mode Map:** A full-screen map showing all active Ambulances (moving markers) and active SOS requests (pulsing red zones).
    2.  **Verification Queue:** A Tinder-style or Table view to approve/reject Provider documents (Licenses, Vehicle Papers).
    3.  **Analytics:** Total Lives Touched, Average Response Time, Active Subscriptions.

### B. The Provider / Hospital Admin ("The Dispatcher")
*   **Goal:** Manage their specific facility's fleet and beds.
*   **Key Views:**
    1.  **Facility Dashboard:** Toggle "Hospital Online/Offline".
    2.  **Asset Management:**
        *   **Beds:** A simple counter (+/-) for available Emergency Beds.
        *   **Ambulances:** List of drivers and their live status (Busy/Free).
    3.  **Incoming Request Terminal:** A loud, visual alert screen when a patient requests their specific hospital.

---

## 3. Technical Requirements (The "Must-Haves")

### A. Authentication & Protection
*   **Supabase Auth:** Re-use the SAME Supabase project as the mobile app.
*   **Role Gating:**
    *   `/admin/*` -> Only accessible if `profile.role === 'admin'`.
    *   `/provider/*` -> Only accessible if `profile.role === 'provider'`.
    *   Redirect unauthorized users to a clean "Access Denied" page.

### B. Real-time Data (The Heartbeat)
*   **Supabase Realtime:** The dashboard **must** update without refreshing.
    *   **New SOS:** Pop up a toast/modal instantly.
    *   **Driver Movement:** Update map markers smoothly (use `react-map-gl` or Leaflet).
    *   **Status Changes:** If a mobile user cancels, the dashboard reflects it immediately.

### C. Shared Domain Knowledge (Copy from Mobile)
*   **Database Schema:** You are reading from the existing `emergency_requests`, `profiles`, and `insurance_policies` tables. **DO NOT create new tables unless absolutely necessary.**
*   **Enums:** Respect the existing state machines (`pending` -> `accepted` -> `arrived` -> `completed`).

---

## 4. UI/UX Blueprint (The "Look & Feel")

### The Layout
*   **Sidebar:** Dark mode glass sidebar on the left.
    *   *Top:* iVisit Logo (Red Dot).
    *   *Middle:* Nav Items (Dashboard, Map, Fleet, Users, Settings).
    *   *Bottom:* User Profile (Avatar + Logout).
*   **Main Content:** Light gray background (`#F3F4F6`) card-based layout.

### Component Library (Shadcn/UI Mapping)
*   **Tables:** Use `DataTable` for User Lists and Request Logs.
*   **Modals:** Use `Dialog` for Document Verification (image previews).
*   **Alerts:** Use `Sonner` or `Toast` for incoming emergency alerts (Red background, urgent sound).
*   **Stats:** Use `Card` with big, bold numbers for KPI tiles.

---

## 5. Implementation Roadmap (Step-by-Step)

### Phase 1: Foundation
1.  **Scaffold:** `npx create-next-app@latest ivisit-web --typescript --tailwind --eslint`.
2.  **Connect:** Install `@supabase/ssr` and configure `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY`.
3.  **Auth:** Build a sleek Login Page (Center card, Email/Password) that checks `public.profiles` for role access.

### Phase 2: The "God Mode" Map (Admin)
1.  **Map Integration:** Install `mapbox-gl` or `react-leaflet`.
2.  **Data Fetch:** Fetch all `emergency_requests` where `status` is NOT `completed`.
3.  **Realtime:** Subscribe to `emergency_requests` changes to animate markers.

### Phase 3: The Verification Queue (Admin)
1.  **Query:** Fetch `profiles` where `role === 'provider'` and `verified === false`.
2.  **UI:** Create a split view (Document on left, Approve/Reject buttons on right).
3.  **Action:** On "Approve", update `profiles.verified = true` (triggers entry into the mobile app ecosystem).

### Phase 4: Hospital Dispatch Terminal (Provider)
1.  **Asset Counters:** Big buttons to increment/decrement "Available Beds".
2.  **Dispatcher View:** A list of "Pending" requests in their geofence.
3.  **Action:** "Dispatch Ambulance" button assigns a driver to the request.

---

## 6. Critical Directives for the AI Agent
*   **"Do not reinvent the wheel":** Use the existing Supabase schema.
*   **"Mobile First Soul":** Even though this is a web dashboard, the UI should feel like an extension of the mobile app (rounded corners, smooth animations).
*   **"Safety First":** Admin actions (like banning a user or rejecting a provider) should have "Are you sure?" confirmation modals.

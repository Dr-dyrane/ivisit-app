# 📋 Task Validation & Progress Tracker

## 🎯 Current Objectives
Improving system intelligence regarding onboarding flow and perfecting the mobile native experience for iOS PWA.

---

## 🏗️ Task 1: Smart Onboarding Trigger
**Status:** 🏃 In Progress  
**Objective:** Automatically mark onboarding as `complete` based on administrative data presence.

### **Validation Rules:**
- [ ] **Rule 1:** If `organization_id` is NOT NULL and role in (`org_admin`, `provider`, `doctor`, `dispatcher`), set `onboarding_status = 'complete'`.
- [ ] **Rule 2:** If `assigned_ambulance_id` is NOT NULL (Drivers/Paramedics), set `onboarding_status = 'complete'`.
- [ ] **Rule 3:** If `role = 'admin'`, set `onboarding_status = 'complete'`.
- [ ] **Rule 4:** If `bvn_verified = true` (Patients), set `onboarding_status = 'complete'`.

### **Technical Implementation:**
- [ ] Database Trigger on `public.profiles`.
- [ ] Sync to `ivisit-console` types and migrations.
- [ ] Verification via touch update on `audeogaranya@gmail.com`.

---

## 📱 Task 2: iOS PWA Mobile Native Layout
**Status:** 📅 Planned  
**Objective:** Eliminate the phantom fixed gutter on iOS PWA and ensure perfect edge-to-edge layout.

### **Validation Rules:**
- [ ] **Standard Viewport:** Switch from `100vh` to `100dvh` for the main App Shell.
- [ ] **Safe Area Awareness:** Use `env(safe-area-inset-bottom)` for the `DynamicBottomBar` and main content padding.
- [ ] **iOS Resilience:** Ensure `height: -webkit-fill-available` is correctly applied to `html` and `body`.

### **Technical Implementation:**
- [ ] CSS updates in `index.css`.
- [ ] Layout logic updates in `App.js`.
- [ ] Responsive padding logic in `SmartFooter.jsx`.

---

## 📑 Completed Tasks
*None yet. Tracking started 2026-02-21.*

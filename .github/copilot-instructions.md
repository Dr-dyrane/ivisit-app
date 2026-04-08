# **iVisit App – Developer Instructions**

## **Overview**

iVisit is a mobile-first healthcare app built with **React Native (Expo)** and `expo-router`. The app uses a **client-side authentication flow** backed by a local `userStore` (AsyncStorage) that simulates API behavior. OTA updates are enabled via `expo-updates` and managed with **EAS**.

This document provides **detailed guidance for contributors and AI assistants (Copilot)** to make safe, structured changes without breaking navigation, auth, or state flows.

---

## **1. Project Structure**

### **Route Groups (Expo Router)**

```
app/
 ├─ (auth)/          ← login, signup, OTP, onboarding
 ├─ (user)/          ← main app screens post-login
 ├─ _layout.js        ← global layout, wraps AuthProvider, ThemeProvider, ToastProvider
```

> **Important:** Do not rename route groups `(auth)` or `(user)` without updating `_layout.js` navigation logic.

### **Key Folders**

```
components/          ← UI components, modular & reusable
  register/           ← registration and onboarding cards
hooks/               ← network hooks and mutations
hooks/mutations/      ← request wrappers (e.g., useLogin, useSignup)
contexts/             ← AuthContext.jsx
store/                ← local AsyncStorage stubs (userStore.js, imageStore.js)
api/                  ← API wrappers (auth.js)
screens/              ← main screen controllers (SignupScreen.js, etc.)
```

---

## **2. Authentication & User Flow**

### **AuthContext.jsx**

* Reads `token` and `user` from AsyncStorage.
* Exposes:

  * `login(userData)`
  * `logout()`
  * `syncUserData()`
* Shows loading spinner while fetching token/user.
* Must always maintain **AsyncStorage keys**:

  * `token`
  * `user`

### **userStore.js**

* Functions:

  * `login(emailOrPhone, password)`
  * `signUp(userData)`
  * `getCurrentUser()`
  * `forgotPassword(emailOrPhone)` → generates OTP
  * `resetPassword(emailOrPhone, otp, newPassword)`
  * `updateUser(newData)`

> These are **stubbed**, return `{ data: ... }`, and should remain consistent with `api/auth.js` return shapes.

### **api/auth.js**

* Calls `userStore` functions.
* Always returns `{ data: ... }`.
* Used by hooks (`useLogin`, `useSignup`) and components.

---

## **3. Registration Flow**

### **Stage Overview**

```
Stage 0 – Method selection (email | phone)
Stage 1 – OTP verification
Stage 2 – Core profile setup (name, username, avatar)
Stage 3 – Optional post-login onboarding
           • EmergencyContactsCard
           • MedicalHistoryCard
           • HospitalPreferencesCard
```

### **Global State Example (SignupScreen.js)**

```js
const [stage, setStage] = useState(0); // 0-3
const [method, setMethod] = useState(null); // "email" | "phone"
const [otp, setOtp] = useState("");
const [otpSent, setOtpSent] = useState(false);
const [profileData, setProfileData] = useState({
  fullName: "",
  username: "",
  avatar: null,
});
const [postLoginData, setPostLoginData] = useState({
  password: "",
  emergencyContacts: [],
  medicalHistory: [],
  hospitalPreferences: [],
});
const [loading, setLoading] = useState(false);
```

---

## **4. Component Guidelines**

### **Single Input Per Screen**

* Minimal cognitive load.
* Focused field per card (e.g., `ProfileForm` splits name → username → avatar).
* Optional Stage 3 cards: swipe left/right to skip/continue.

### **Animation & Micro-Interactions**

| Interaction      | Type            | Notes                                           |
| ---------------- | --------------- | ----------------------------------------------- |
| Card tap         | Scale           | 1.02x                                           |
| Input focus      | Scale           | 1.02x                                           |
| OTP error        | Shake           | 8–10px horizontal                               |
| Stage transition | Slide + opacity | 300–400ms, Apple easing `[0.21,0.47,0.32,0.98]` |
| Avatar selection | Pulse/scale     | 1.05x                                           |

---

## **5. Hooks & Mutations**

### **useSignUp.js**

```js
const useSignUp = () => {
  const { login } = useContext(AuthContext);
  const signUpUser = async (credentials) => {
    const { data } = await userStore.signUp(credentials);
    await login(data);
    return true;
  };
  return { signUp: signUpUser };
};
```

* Similar hooks exist for OTP verification and profile update.
* Keep API return shape consistent: `{ data: ... }`.

---

## **6. AsyncStorage & Tokens**

* **Keys must match:**

  * `token` → stores auth token
  * `user` → stores user object
* Changing keys may **break login persistence**.

---

## **7. Dev Workflow**

1. **Install dependencies:**

```bash
npm install --legacy-peer-deps
```

2. **Start development server:**

```bash
expo start
```

3. **Build APK / iOS:**

```bash
eas build -p android --profile preview2
eas build -p ios --profile preview2
```

4. **Push OTA updates:**

```bash
eas update
eas update --branch preview2
```

5. **Test registration & onboarding:**

   * Stage 0 → Stage 3
   * OTP flow
   * Avatar upload
   * Optional Stage 3 cards

---

## **8. Adding or Modifying Stages**

* Each stage should **read/write only its own state**.
* Use `RegistrationContext` or pass props from `SignupScreen`.
* Optional stages (Stage 3) can be skipped without blocking login.

---

## **9. Important Conventions for Copilot**

* **Do not rename route groups** `(auth)` or `(user)`.
* **Do not change AsyncStorage keys** (`token`, `user`).
* Follow **single-input-per-screen** for all registration cards.
* Always **maintain `{ data: ... }` return shape** from APIs.
* Stage transitions are **slide + opacity with Apple easing**.
* Hooks should **never manipulate UI directly**, only update state/context.
* Tailwind `className` preferred over inline styles.
* OTP & profile flows **must integrate with AuthContext** to maintain login state.

---

## **10. Optional Enhancements**

* Lottie/3D animations for empty states or success confirmation.
* Swipe gestures for Stage 3 onboarding cards.
* Toast/snackbar notifications for API errors.

---

## **11. Cross-Platform Native Emergency Entry Standard (LOCKED)**

This applies to the welcome / emergency entry experience across **iOS, Android, and web**.

* The welcome surface is **not a marketing landing page**; it is a **native system activation screen**.
* Preserve the same hierarchy across platforms:
  1. quiet brand
  2. one live-system visual
  3. headline
  4. one short reassurance line
  5. one dominant CTA
* Locked default copy for the current welcome state:
  * headline → `Get help now`
  * reassurance line → `Fast help nearby`
  * CTA → `Continue`
* Motion must be **barely felt**: slow drift, soft pulse, subtle route energy only. Avoid decorative or theatrical animation.
* Keep the surface **border-light / borderless**, with soft depth and restrained brand gradients only where needed for emphasis.
* Secondary controls (theme toggle, utility icons, profile entry) must remain visually quiet and should never compete with the primary CTA.
* Secondary text must remain readable at a glance on all platforms; minimal copy does **not** mean tiny copy.
* Web should mirror the same native emotional posture as mobile — calm, immediate, spatial — and should not drift into a promo-site layout.
* If a change makes the screen feel like onboarding, a poster, or a landing page, revert toward the native activation model above.
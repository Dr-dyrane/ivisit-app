# **iVisit Mobile App – Registration Flow Bible (Updated)**

**Purpose:** Defines full architecture, UI/UX, data flow, and coding standards for the registration flow. Modular, single-field-per-screen, mobile-first, Expo/React Native, Apple-style touch interactions.

---

## **1. Overview**

iVisit is an international, mobile-first healthcare app. The registration flow:

* Supports **phone or email** registration
* Uses **OTP verification** for identity
* Progressive profile setup (username, full name, avatar)
* **Optional password creation** during post-login/onboarding
* Post-login optional stage (emergency contacts, medical history, hospital preferences)
* Modular components and hooks for scalability
* Smooth touch-first micro-interactions

**Design Goals:**

* Single input per screen, minimal cognitive load
* Modular, reusable components
* Animated, Apple-inspired interactions
* Optional 3D illustrations or Lottie animations for empty states
* OTP login available if password not set

---

## **2. Registration Stages (Updated)**

### **Stage 0 – Choose Registration Method**

**Purpose:** Let user select phone or email for registration.

* **Component:** `SignUpMethodCard`
* **State:** `method` (`"phone"` or `"email"`)

**UI/UX:**

* Glassy, translucent cards with slight blur
* Tap animation: 1.02x scale, card lift
* Optional Lottie or 3D illustration
* Apple easing `[0.21, 0.47, 0.32, 0.98]`

**Data Flow:**

* Set `method` → advance to Stage 1
* Store method in `registrationContext`

---

### **Stage 1 – OTP Verification**

**Purpose:** Validate user ownership of phone/email

* **Component:** `OTPInputCard`
* Stepper/progressive layout
* Single or split input boxes (auto-focus)
* Shake animation on invalid OTP

**Data Flow:**

1. User submits phone/email → call `authService.requestOtp({ email | phone })` (sends OTP)
2. Store OTP in state → verify OTP → advance to Stage 2

**State Example:**

```js
const [otp, setOtp] = useState("");
const [otpSent, setOtpSent] = useState(false);
```

---

### **Stage 2 – Core Profile Setup**

**Purpose:** Collect essential user info (username, full name, avatar)

* **Component:** `ProfileForm`
* Single-field-per-screen: name → username → avatar
* Fade and scale transitions for input focus
* Avatar upload triggers `imageService.uploadImage(uri)`

**Data Flow:**

* Collect `profileData` → `{ fullName, username, avatar }`
* Submit → temporarily store in `registrationContext` or local state
* Do **not require password yet**
* Navigate to main app after Stage 2

**State Example:**

```js
const [profileData, setProfileData] = useState({
  fullName: "",
  username: "",
  avatar: null,
});
```

---

### **Stage 3 – Optional Post-Login Completion / Onboarding**

**Screens:**

* **Password Creation:** optional, for full email/password login
* Emergency contacts
* Medical history
* Hospital preferences

**UI/UX:**

* Stepper or card layout
* Swipe left/right to skip or continue
* Animated progress indicator
* Card lift on tap
* Fade in/out transitions
* Apple easing for swipe gestures

**Data Flow:**

* Each card collects info → call `authService.updateUser(newData)`
* Password creation → call `authService.setPassword({ password })`
* Optional → user can skip and still login via OTP

**State Example:**

```js
const [postLoginData, setPostLoginData] = useState({
  password: "",
  emergencyContacts: [],
  medicalHistory: [],
  hospitalPreferences: [],
});
```

---

## **3. Global State & Context**

```js
const [stage, setStage] = useState(0);
const [method, setMethod] = useState(null); // phone | email
const [otp, setOtp] = useState("");
const [otpSent, setOtpSent] = useState(false);
const [profileData, setProfileData] = useState({ fullName: "", username: "", avatar: null });
const [postLoginData, setPostLoginData] = useState({ password: "", emergencyContacts: [], medicalHistory: [], hospitalPreferences: [] });
const [loading, setLoading] = useState(false);
const [errors, setErrors] = useState({});
```

* Each stage reads/writes independently
* Modular components access shared state via props or `RegistrationContext`
* Smooth animations per stage

---

## **4. Backend Flow**

**Hooks:** `useSignUp`, `useAuth`
**Services:** `authService`, `imageService`

**Sign-Up Hook Example:**

```js
const useSignUp = () => {
  const { login } = useContext(AuthContext);

  const signUpUser = async (credentials) => {
    try {
      const result = await authService.register(credentials);
      const { user, token } = result.data;
      const data = { ...user, token };
      await login(data);
      return true;
    } catch (error) {
      throw error;
    }
  };

  return { signUp: signUpUser };
};
```

**Data Flow Summary:**

1. Stage 0 → method selection → Stage 1
2. Stage 1 → OTP → call `authService.requestOtp` / `authService.verifyOtp`
3. Stage 2 → profile → store in context → navigate to app
4. Stage 3 (optional) → password + other details → `authService.updateUser` / `authService.setPassword`

---

## **5. UI/UX & Micro-Interactions**

* **Apple easing:** `[0.21, 0.47, 0.32, 0.98]`
* Stage transitions: slide-left/right
* Input focus: scale 1.02
* Button press: scale 0.95–0.98
* OTP errors: shake
* Avatar: scale/pulse on selection
* Progress bar: animated, optional color gradient
* Empty states: 3D or Lottie animations

---

## **6. Component Structure**

```
/screens/
  SignupScreen.js       <-- main stage controller
/components/
  SignUpMethodCard.js
  OTPInputCard.js
  ProfileForm.js
  PostLoginCard.js     <-- password, contacts, etc.
/hooks/
  useSignUp.js
/contexts/
  AuthContext.js
/services/
  authService.js
  imageService.js
```

---

## **7. Best Practices**

* Modular single-field screens
* Animations limited to transform & opacity
* Inline input errors + toast/snackbar for general errors
* Stage system allows adding/removing stages easily
* Touch-first mobile interactions, keyboard-aware scrolls

---

## **8. Flow Diagram (Textual)**

```
Stage 0 – Method → Stage 1 – OTP → Stage 2 – Profile → [Optional Stage 3: Password + Onboarding] → App
```

* OTP login available even if password not set
* Optional Stage 3 allows full email/password login and additional data collection

---

# **Registration Flow – Developer Implementation Guide**

## **1. Global Notes**

* **Tech Stack:** Expo, React Native, Hooks, Context API
* **Backend:** `authService` + `imageService` (Supabase + local persistence via `database/`)
* **Authentication:** OTP-first login, password optional
* **Design:** Mobile-first, Apple touch UI, single input per screen, modular components

---

## **2. Global Context & State**

Create `RegistrationContext` or manage via local state in `SignupScreen`:

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
const [loading, setLoading] = useState(false);
const [errors, setErrors] = useState({});
```

* Each stage updates only its relevant state
* ProfileData can be expanded later for Stage 3 fields

---

## **3. Stage 0 – Registration Method Selection**

**Component:** `SignUpMethodCard`

**Props:**

```ts
type SignUpMethodCardProps = {
  method: "email" | "phone";
  onSelect: (method: "email" | "phone") => void;
};
```

**UI/UX:**

* Glassy card with tap scale animation (1.02x)
* Optional Lottie or 3D illustration
* Apple easing: `[0.21, 0.47, 0.32, 0.98]`

**Backend Flow:**

* Store selected method locally (`method`)
* Proceed to Stage 1

---

## **4. Stage 1 – OTP Verification**

**Component:** `OTPInputCard`

**Props:**

```ts
type OTPInputCardProps = {
  method: "email" | "phone";
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  otpSent: boolean;
  loading: boolean;
};
```

**State:**

```ts
const [localOtp, setLocalOtp] = useState("");
```

**UI/UX:**

* Single input OR split OTP boxes
* Auto-focus next input
* Shake animation on invalid OTP
* Fade-in animation per box
* Button: scale 0.95 on press

**Backend Flow:**

* Call `authService.requestOtp({ email | phone })` → sends OTP
* Verify OTP → advance `setStage(2)`

---

## **5. Stage 2 – Core Profile Setup**

**Component:** `ProfileForm`

**Props:**

```ts
type ProfileFormProps = {
  profileData: { fullName: string; username: string; avatar: string | null };
  onChange: (field: string, value: any) => void;
  onSubmit: () => void;
  loading: boolean;
};
```

**State per field:**

```ts
const [fullName, setFullName] = useState(profileData.fullName);
const [username, setUsername] = useState(profileData.username);
const [avatar, setAvatar] = useState(profileData.avatar);
```

**UI/UX:**

* Stepper card layout (single input per screen)
* Input focus: scale 1.02
* Avatar upload: opens image picker → `imageService.uploadImage(uri)` → sets URL
* Animated progress bar
* Apple easing transitions

**Backend Flow:**

* `useSignUp()` hook → `authService.register({ email|phone, username, fullName, imageUri })`
* Update `AuthContext` with token + user
* Navigate to main app

---

## **6. Stage 3 – Optional Post-Login Completion**

**Components:**

* `EmergencyContactsCard`
* `MedicalHistoryCard`
* `HospitalPreferencesCard`

**Props:** Standardized:

```ts
type Stage3CardProps = {
  data: any;
  onChange: (field: string, value: any) => void;
  onSkip?: () => void;
  onSubmit: () => void;
};
```

**UI/UX:**

* Swipe left/right to skip/continue
* Card lift on tap
* Fade in/out transitions
* Progress indicator animation

**Backend Flow:**

* `authService.updateUser(newData)` per card
* Optional completion → can skip → navigate to app

---

## **7. Suggested Folder Structure**

```
/screens/
  SignupScreen.js       <-- stage controller
/components/
  SignUpMethodCard.js
  OTPInputCard.js
  ProfileForm.js
  EmergencyContactsCard.js
  MedicalHistoryCard.js
  HospitalPreferencesCard.js
/hooks/
  useSignUp.js
/contexts/
  AuthContext.js
/services/
  authService.js
  imageService.js
```

* Each component handles UI + internal field state
* All API calls via hooks/contexts → services → (Supabase + `database/`)
* Registration state passed via props or context

---

## **8. Animations & Micro-Interactions**

| Interaction       | Animation Type             | Value / Notes                        |
| ----------------- | -------------------------- | ------------------------------------ |
| Card tap          | Scale                      | 1.02x                                |
| Input focus       | Scale                      | 1.02x                                |
| OTP error         | Shake                      | Horizontal 8-10px                    |
| Stage transitions | Slide left/right + opacity | 300-400ms                            |
| Avatar selection  | Pulse/scale                | 1.05x                                |
| Swipe stage 3     | Translation + easing       | Apple easing `[0.21,0.47,0.32,0.98]` |

---

## **9. Hooks Example**

```js
// useSignUp.js
const useSignUp = () => {
  const { login } = useContext(AuthContext);
  const signUpUser = async (credentials) => {
    const result = await authService.register(credentials);
    const { user, token } = result.data;
    await login({ ...user, token });
    return true;
  };
  return { signUp: signUpUser };
};
```

* Similar hooks can be built for OTP verification, profile update, Stage 3 cards

---

## **10. Coding Workflow**

1. **Build Stage 0 Component** → test card selection + state update
2. **Build Stage 1 OTP Component** → test sending OTP & verification
3. **Build Stage 2 ProfileForm** → test field inputs + avatar upload
4. **Stage 3 Components** → modular, swipable cards, optional
5. **Integrate `SignupScreen` Controller** → handles `stage` state and transitions
6. **Integrate `AuthContext` + hooks** → ensure token storage + navigation
7. **Add Animations** → micro-interactions, Apple easing
8. **Add optional illustrations / Lottie** → visual enrichment

---

## **11. SignupScreen – Stage Controller Skeleton**

```jsx
import React, { useState } from "react";
import { View, Animated, KeyboardAvoidingView, Platform } from "react-native";
import SignUpMethodCard from "../components/SignUpMethodCard";
import OTPInputCard from "../components/OTPInputCard";
import ProfileForm from "../components/ProfileForm";
import EmergencyContactsCard from "../components/EmergencyContactsCard";
import MedicalHistoryCard from "../components/MedicalHistoryCard";
import HospitalPreferencesCard from "../components/HospitalPreferencesCard";

const SignupScreen = () => {
  // Global stage state
  const [stage, setStage] = useState(0); // 0-3
  const [method, setMethod] = useState(null); // email | phone
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: "",
    username: "",
    avatar: null,
  });
  const [loading, setLoading] = useState(false);

  // Animation value for transitions
  const slideAnim = useState(new Animated.Value(0))[0];

  const animateStage = (nextStage) => {
    Animated.timing(slideAnim, {
      toValue: nextStage * -300, // adjust depending on screen width
      duration: 350,
      useNativeDriver: true,
    }).start(() => setStage(nextStage));
  };

  // Stage Renderer
  const renderStage = () => {
    switch (stage) {
      case 0:
        return (
          <SignUpMethodCard
            method={method}
            onSelect={(selected) => {
              setMethod(selected);
              animateStage(1);
            }}
          />
        );

      case 1:
        return (
          <OTPInputCard
            method={method}
            value={otp}
            otpSent={otpSent}
            loading={loading}
            onChange={setOtp}
            onSubmit={() => animateStage(2)}
          />
        );

      case 2:
        return (
          <ProfileForm
            profileData={profileData}
            onChange={(field, value) =>
              setProfileData((prev) => ({ ...prev, [field]: value }))
            }
            onSubmit={() => animateStage(3)}
            loading={loading}
          />
        );

      case 3:
        // Optional Stage 3 – can be multiple cards
        return (
          <>
            <EmergencyContactsCard
              data={profileData.emergencyContacts}
              onChange={(field, value) => {}}
              onSkip={() => animateStage(4)}
              onSubmit={() => animateStage(4)}
            />
            <MedicalHistoryCard />
            <HospitalPreferencesCard />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Animated.View
        style={{
          flex: 1,
          transform: [{ translateX: slideAnim }],
        }}
      >
        {renderStage()}
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

export default SignupScreen;
```

---

### **Notes on This Skeleton**

1. **Stage Transitions:**

   * Controlled by `slideAnim` using `Animated.timing`
   * Can later replace with swipe gestures for Stage 3 cards

2. **Component Props:**

   * Each component is modular, handling its own UI + internal validation
   * Parent passes state + `onChange` callback

3. **Keyboard Handling:**

   * `KeyboardAvoidingView` ensures inputs aren’t hidden on mobile

4. **Loading States:**

   * `loading` can be passed to show spinners on API calls

5. **Stage 3 Flexibility:**

   * Multiple post-login cards can be added or removed
   * Swipeable integration possible with `react-native-gesture-handler`

---

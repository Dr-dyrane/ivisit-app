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

1. User submits phone/email → call `userStore.forgotPassword(emailOrPhone)` (generates OTP)
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
* Avatar upload triggers `imageStore.uploadImage(uri)`

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

* Each card collects info → call `userStore.updateUser(newData)`
* Password creation → call `userStore.updateUser({ password })`
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
**Stores:** `userStore`, `imageStore`

**Sign-Up Hook Example:**

```js
const useSignUp = () => {
  const { login } = useContext(AuthContext);

  const signUpUser = async (credentials) => {
    try {
      const { data } = await userStore.signUp(credentials);
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
2. Stage 1 → OTP → call `userStore.forgotPassword`
3. Stage 2 → profile → store in context → navigate to app
4. Stage 3 (optional) → password + other details → `userStore.updateUser`

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
/store/
  userStore.js
  imageStore.js
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
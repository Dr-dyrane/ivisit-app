# iVisit Technical Documentation — Welcome & Onboarding Flow

**Version 1.0 — Living Document**

---

## Table of Contents

1. Overview & Goals
2. Welcome Screen

   * Design Philosophy
   * Layout & Visual Structure
   * Interaction & CTA Logic
3. Onboarding Screen

   * Design Philosophy
   * Layout & Visual Structure
   * Motion & Micro-Interactions
   * Swipe Gesture Handling
   * Progress Indicators
   * CTA Logic
4. Shared Components & Utilities
5. Notes on UI/UX Philosophy
6. Versioning & Change Log

---

## 1. Overview & Goals

The Welcome → Onboarding sequence guides a **new user** from app entry to initial understanding of iVisit’s value.

**Primary Goals:**

* Communicate **trust, calm, and immediacy**
* Highlight **primary use cases** (urgent care, skipping waits, bed booking, health tracking)
* Reinforce **interaction hierarchy** via motion, haptics, and micro-interactions
* Establish **visual consistency** (color, typography, depth)

---

## 2. Welcome Screen

### 2.1 Design Philosophy

* **First impression matters**: calming gradient, clear branding, legible type
* **Hero imagery**: communicates speed, accessibility, and urgency of care
* **CTA-focused layout**: primary action is “FIND CARE NOW”
* Secondary text provides **contextual reassurance** (“Right when you need it”)

### 2.2 Layout & Visual Structure

* **Logo Block:** top-centered, small size to maintain minimal visual weight
* **Hero Image:** center stage, draws the eye but doesn’t overwhelm
* **Feature Text:** large headline + colored emphasis (PRIMARY_RED)
* **CTA Button:** full-width SlideButton, primary red icon reinforces action
* **Login Prompt:** subtle, secondary interaction

### 2.3 Interaction & CTA Logic

* SlideButton triggers navigation to **OnboardingScreen**
* Hero image and gradient adapt to **dark mode**
* No motion besides subtle platform-native effects
* Text hierarchy ensures **immediate comprehension**

---

## 3. Onboarding Screen

### 3.1 Design Philosophy

* Onboarding is **educational and motivational**, not decorative
* Motion is **purposeful**: communicates progress and state change
* Haptics differentiate **primary actions (button press)** vs **secondary gestures (swipe)**
* Hero images scale subtly with interaction, reinforcing feedback

### 3.2 Layout & Visual Structure

* **Hero Image:** top half, animates with scaling
* **Headline & Description:** animated fade + vertical translation
* **Progress Dots:** animated width & opacity to reinforce current step
* **SlideButton CTA:** primary action at bottom, icon adapts per step

### 3.3 Motion & Micro-Interactions

* **Layered Motion**:

  1. Hero image scale
  2. Content fade & translate
  3. Progress dot pulse
* **Animation Timing**: short, staggered, spring-based for physical feel
* **Micro-interactions**: dot scaling, subtle pulse during swipe

### 3.4 Swipe Gesture Handling

* **Swipe left/right** triggers secondary preview motion
* Light haptics indicate gesture recognition
* Hero image slightly scales as visual confirmation
* Dot pulse communicates progress change without requiring button press

### 3.5 Progress Indicators

* Width: interpolates 8 → 32 px
* Opacity: interpolates 0.3 → 1
* Active dot = PRIMARY_RED
* Inactive = gray (#D1D1D1 light, #333 dark)

### 3.6 CTA Logic

* SlideButton triggers `handleNext()`
* If last onboarding step: haptic success + navigate to signup/login
* Intermediate steps: transition to next index with **layered animation**

---

## 4. Shared Components & Utilities

* **SlideButton:** full-width, icon-aware, motion-friendly
* **ThemeContext:** controls dark/light mode gradients & text colors
* **useSwipeGesture:** utility for swipe detection with callbacks
* **LinearGradient:** consistent background treatment
* **Haptics (expo-haptics):** differentiates primary vs secondary interactions

---

## 5. Notes on UI/UX Philosophy

* **Primary Actions:** buttons, finality, medium haptic feedback
* **Secondary Actions:** swipes, previews, light haptic feedback
* **Motion:** physical, short, layered, explanatory
* **Depth:** subtle shadows, soft borders, glass sparingly
* **Colors:** semantic, calming, accessible, dark/light aware
* **Typography:** Inter variable, hierarchical, confident action vs calm info

---

## 6. Versioning & Change Log

* **v1.0** — Initial Welcome + Onboarding implementation
* **v1.1** — Integrated motion lessons, haptics hierarchy, layered dot micro-interactions
* **Future:** document **component rules** (SlideButton variants, progress dot variants, swipe feedback variations)

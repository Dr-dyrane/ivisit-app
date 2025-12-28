# iVisit UI / UX Design System

**Version 1.1 — Living Document**

---

## 1. Design Ethos

iVisit is a healthcare product.
Healthcare interfaces must **reduce cognitive load**, **increase trust**, and **never rush the user emotionally**.

Our UI is not decorative.
Our UX is not clever.

Everything exists to make the user feel:

* Safe
* Oriented
* In control

> If an interaction draws attention to itself, it has failed.

---

## 2. Visual Philosophy (Apple-Inspired)

### 2.1 Calm Over Contrast

Avoid harsh contrasts, loud gradients, and high-energy palettes.

* Primary red = **deep, muted, medical**
* Backgrounds = **off-white**, never pure white
* Dark mode = **deep blue-black**, not gray

**Rule:** Contrast must meet accessibility standards without feeling aggressive.

---

### 2.2 Depth Without Heaviness

Use:

* Subtle shadows
* Soft borders
* Glass blur

Never:

* Heavy drop shadows
* Thick outlines
* Harsh elevation stacks

Depth is **suggested**, not asserted.

---

## 3. Color System Philosophy

Colors are **semantic**, not decorative.

### 3.1 Primary Color — Authority & Action

`primary.DEFAULT = #86100E`

Used only for:

* Primary actions
* Active states
* Intent confirmation

**Never** used for:

* Body text
* Background fills
* Decorative elements

Primary = *decision*.

---

### 3.2 Backgrounds — Emotional Neutrality

* Light: `#fafafa`
* Dark: `#0D121D`

Backgrounds must fade into irrelevance so content and action can lead.

---

### 3.3 Text States (Critical Rule)

Text color is determined by **contrast against the dominant background at that moment**.

| State        | Description                   |
| ------------ | ----------------------------- |
| Base         | Idle, waiting for interaction |
| Transitional | During animation or motion    |
| Active       | Final resolved state          |

Applies globally: buttons, tabs, toggles, sliders.
**Never** allow primary text on primary background.

---

## 4. Typography System

### 4.1 Font

* Inter (Variable) — clarity, neutrality, medical familiarity

### 4.2 Typographic Roles

**Action Text (Buttons, CTAs)**

* Font weight: **900**
* Letter spacing: 1.5–2
* Purpose: Confidence & finality

Only actions speak loudly.

**Informational Text**

* Normal weight
* No letter spacing
* Calm and readable

Content never shouts.

---

## 5. Motion & Animation System

Motion exists to **explain state change**, not decorate UI.

### 5.1 Motion Principles

* Short
* Purposeful
* Predictable
* Reversible

If motion cannot be explained in one sentence, it should not exist.

---

### 5.2 Timing & Easing

* Standard duration: 400–500ms
* Easing: `cubic-bezier(0.16, 1, 0.3, 1)`
* Springs: soft, low tension

Motion should feel **physical**, not digital.

---

### 5.3 Layered Motion

State changes occur in **layers**, never by mutating the base UI.

* Hero image
* Content block
* Progress indicators / micro-interactions

Layered motion prevents visual artifacts and preserves mental continuity.

---

### 5.4 Micro-interaction Dots

* Active dot = width scale + opacity pulse
* Swipes trigger subtle dot pulse, previewing the next state
* Motion reinforces feedback loop without clutter

---

### 5.5 Primary vs Secondary Motion

* **Primary**: button presses, decisive animation, medium haptics
* **Secondary**: swipes, subtle preview animation, light haptics
* Hierarchy communicates **intent** to the user

---

## 6. Glass & Blur (Apple-Style Material)

Glass used **sparingly** for global utilities.

### 6.1 Allowed

* Floating controls (Theme Toggle)
* System-level affordances
* Non-blocking utilities

### 6.2 Characteristics

* Low opacity
* High blur
* Soft border
* Gentle shadow

Glass should feel OS-native, not screen-furniture.

---

## 7. Interaction & Haptics

### 7.1 Touch Targets

* Minimum hitSlop: 16px
* Buttons are forgiving
* Accidental taps avoided

---

### 7.2 Haptic Rules

| Interaction       | Haptic               |
| ----------------- | -------------------- |
| Button press      | Medium impact        |
| Toggle success    | Notification success |
| Navigation        | Selection            |
| Swipe / secondary | Light impact         |

Never stack haptics. Never vibrate without meaning.

---

## 8. Navigation & Headers

### 8.1 Headers Are Navigation, Not Content

* No shadows
* No titles by default
* Content introduces itself

### 8.2 Back Navigation

* Predictable
* Never disabled visually
* Never shown if it does nothing

Trust is priority.

### 8.3 Header Right Actions

Represents:

* Escape
* Alternative path
* Shortcut

Never icons without meaning.

---

## 9. Global Controls (Theme Toggle Case Study)

Defines **interaction maturity**.

* Non-intrusive
* Self-collapsing
* Respects focus
* Delayed appearance
* Partial opacity when idle
* Expands only on intent
* Auto-collapses on navigation

Ambient control, not UI furniture.

---

## 10. Layout Philosophy

* One primary action per screen (button)
* Secondary actions (swipe / gesture) allowed with subtle feedback
* Vertical rhythm
* Generous spacing
* No visual clutter

---

## 11. Accessibility (Non-Negotiable)

* Color contrast meets WCAG
* Touch targets are large
* Motion never causes disorientation
* Dark mode is first-class

Accessibility = **design quality**, not compliance.

---

## 12. System Rule (Most Important)

> iVisit does not design screens.
> iVisit designs **rules that generate screens**.

Every new component must:

1. Obey this document
2. Extend only when necessary
3. Never contradict existing principles

---
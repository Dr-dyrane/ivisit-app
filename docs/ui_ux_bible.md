# iVisit UI / UX Design System

**Version 1.0 — Living Document**

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

We avoid harsh contrasts, loud gradients, and high-energy palettes.

* Primary red is **deep, muted, medical**
* Backgrounds are **off-white**, never pure white
* Dark mode is **deep blue-black**, not gray

**Rule:**
Contrast must meet accessibility standards without feeling aggressive.

---

### 2.2 Depth Without Heaviness

We use:

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

Primary means *decision*.

---

### 3.2 Backgrounds — Emotional Neutrality

* Light: `#fafafa`
* Dark: `#0D121D`

Backgrounds must fade into irrelevance so content and action can lead.

---

### 3.3 Text States (Critical Rule)

Text color is determined by **contrast against the dominant background at that moment**.

We define **three text states**:

| State        | Description                   |
| ------------ | ----------------------------- |
| Base         | Idle, waiting for interaction |
| Transitional | During animation or motion    |
| Active       | Final resolved state          |

This rule applies globally:

* Buttons
* Tabs
* Toggles
* Sliders

**Never** allow primary text on primary background.

---

## 4. Typography System

Typography is **hierarchical and intentional**.

### 4.1 Font

* Inter (Variable)
* Chosen for clarity, neutrality, medical familiarity

---

### 4.2 Typographic Roles

#### Action Text (Buttons, CTAs)

* Font weight: **900**
* Letter spacing: **1.5–2**
* Purpose: Confidence & finality

Only actions speak loudly.

---

#### Informational Text

* Normal weight
* No letter spacing
* Calm and readable

Content never shouts.

---

## 5. Motion & Animation System

Motion in iVisit exists to **explain state change**, not decorate UI.

### 5.1 Motion Principles

* Short
* Purposeful
* Predictable
* Reversible

If motion cannot be explained in one sentence, it should not exist.

---

### 5.2 Timing & Easing

* Standard duration: **400–500ms**
* Easing: `cubic-bezier(0.16, 1, 0.3, 1)`
* Springs are soft, low tension

Motion should feel **physical**, not digital.

---

### 5.3 Layered Motion (Important)

State changes occur in **layers**, never by mutating the base UI.

Example (SlideButton):

1. Base container (static)
2. Overlay (animated)
3. Overlay content (animated opacity)

This prevents visual artifacts and preserves mental continuity.

---

## 6. Glass & Blur (Apple-Style Material)

Glass is used **sparingly** and **only for global utilities**.

### 6.1 When Glass Is Allowed

* Floating controls (Theme Toggle)
* System-level affordances
* Non-blocking utilities

### 6.2 Glass Characteristics

* Low opacity
* High blur
* Soft border
* Gentle shadow

Glass should feel like it *belongs to the OS*, not the screen.

---

## 7. Interaction & Haptics

### 7.1 Touch Targets

* Minimum hitSlop: **16px**
* Buttons are forgiving
* Accidental taps are avoided

---

### 7.2 Haptic Rules

Haptics confirm intent, not existence.

| Interaction    | Haptic               |
| -------------- | -------------------- |
| Button press   | Medium impact        |
| Toggle success | Notification success |
| Navigation     | Selection            |

Never stack haptics.
Never vibrate without meaning.

---

## 8. Navigation & Headers

### 8.1 Headers Are Navigation, Not Content

* No shadows
* No titles by default
* No decoration

Content introduces itself inside the screen.

---

### 8.2 Back Navigation

* Always predictable
* Never disabled visually
* Never shown if it does nothing

Back is trust.

---

### 8.3 Header Right Actions

Must represent:

* Escape
* Alternative path
* Shortcut

Never icons without meaning.

---

## 9. Global Controls (Theme Toggle Case Study)

The Theme Toggle defines our **interaction maturity**.

### Design Intent:

* Non-intrusive
* Self-collapsing
* Respectful of focus

### Behavior Rules:

* Delayed appearance (lets content breathe)
* Partial opacity when idle
* Expands only on intent
* Auto-collapses on navigation

This is **ambient control**, not UI furniture.

---

## 10. Layout Philosophy

* One primary action per screen
* Vertical rhythm
* Generous spacing
* No visual clutter

If a screen needs explanation, it needs redesign.

---

## 11. Accessibility (Non-Negotiable)

* Color contrast meets WCAG
* Touch targets are large
* Motion never causes disorientation
* Dark mode is first-class, not an afterthought

Accessibility is **design quality**, not compliance.

---

## 12. System Rule (Most Important)

> iVisit does not design screens.
> iVisit designs **rules that generate screens**.

Every new component must:

1. Obey this document
2. Extend it only when necessary
3. Never contradict existing principles

---

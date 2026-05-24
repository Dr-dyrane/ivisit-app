---
status: living
owner: architecture
last_updated: 2026-05-24
---

# Payment Screen â€” XL Context Island + Progressive Width Plan
**Status:** PLANNED â€” not yet implemented  
**Scope:** WEB_XL + WEB_2XL_3XL + WEB_ULTRA_WIDE variants only  
**Variants affected:** PaymentCheckoutVariant, PaymentManagementVariant  
**Files to change:** paymentSidebarLayout.js, PaymentCheckoutVariant.jsx, PaymentManagementVariant.jsx, PaymentScreenComponents.jsx

---

## 1. Problem Statement

At `WEB_XL` (â‰¥1280px) and above, the three-column composition is:

```
[ LEFT ISLAND (420px) ] [ CENTER PANEL (flex:1, max 640px) ] [ DEAD SPACE (~320â€“600px) ]
```

The dead space is a raw gradient void â€” structurally unused, visually unintentional.

Two parallel fixes:
- **Plan D**: Progressively widen right panel content cap from 640 â†’ 800 before the third island appears (covers MACBOOK + WEB_LG + WEB_XL tablet-to-desktop transition)
- **Plan A**: At WEB_XL+, render a third glass island anchored to the right edge with contextual content per variant

---

## 2. Breakpoint Map + What Triggers What

| Variant | Width | `overlayLayout` | Right cap | Third island |
|---|---|---|---|---|
| TABLET (WEB_MD, IOS_PAD, ANDROID_TABLET) | 768â€“1023px | left-sidebar | 640 | âŒ |
| DESKTOP (MACBOOK, WEB_LG) | 1024â€“1279px | left-sidebar | **800** (new) | âŒ |
| WEB_XL | 1280â€“1535px | left-sidebar | **800** (new) | âœ… |
| WEB_2XL_3XL | 1536â€“2559px | left-sidebar | **800** (new) | âœ… |
| WEB_ULTRA_WIDE | â‰¥2560px | left-sidebar | **800** (new) | âœ… |

Gate: `isDesktopStackVariant(viewportVariant)` already exists â€” use it for both changes.  
XL gate: `variant === WEB_XL || variant === WEB_2XL_3XL || variant === WEB_ULTRA_WIDE`  
Add a helper: `isXLStackVariant(variant)` in `stackViewportConfig.js`.

---

## 3. Layout Geometry â€” Third Island

The right island mirrors the left island exactly in:
- Width: `sidebarWidth` (same `overlaySheetMaxWidth` / `sidebarMaxWidth` from surfaceConfig)
- Corner radius: `SIDEBAR_CORNER_RADIUS` (24pt continuous squircle)
- Glass tokens: same `getPaymentSidebarGlassTokens` 
- Top margin: `headerClearance` (same baseline as left island and right panel content)
- Bottom margin: `sidebarGutter`

Position: `position: 'absolute'`, `right: sidebarGutter`, `top: 0`, `height: '100%'`  
The center panel `ScrollView` needs `marginRight: sidebarWidth + sidebarGutter * 2` when the third island is active â€” to prevent content sliding under it.

Brand mark dead zone (right column): mirror the left brand mark in the right island's `headerClearance` zone â€” but this right one shows a **contextual label** ("Secure Checkout" / "Financial Hub") not the brand mark (brand mark stays on the left only).

---

## 4. Content Strategy â€” What Goes in the Right Island

### 4a. Checkout Variant â€” `PaymentContextIsland`

Data available from `model`:
- `model.cost` â†’ `totalCost`, `breakdown[]`
- `model.insuranceApplied`
- `model.serviceType` â†’ `'ambulance'` | `'bed'`
- `params.organizationId` (not surfaced to variant â€” needs pass-through or read from params)

Content plan (top â†’ bottom, no scrolling needed):

**Section 1 â€” Service Assurance**  
Icon + "Secure Payment" heading, 3 trust bullets:
- ðŸ”’ PCI-DSS Level 1 encrypted
- âš¡ Real-time service dispatch  
- ðŸ›¡ï¸ Covered by iVisit guarantee

**Section 2 â€” What Happens Next**  
Ordered step list (3 steps), service-type-aware:
- Ambulance: "Request approved â†’ Ambulance dispatched â†’ Track live ETA"
- Bed: "Request approved â†’ Bed assigned â†’ Navigate to facility"

**Section 3 â€” Cost Transparency footer**  
Single line: "No hidden fees. Billed exactly ${totalCost.toFixed(2)}."  
If `insuranceApplied`: "Insurance has been applied to your total."

Design: No card backgrounds. Text + icons only. Uses `textMuted` / `text` colors.  
No borders. No interaction â€” purely informational / trust-signal surface.

---

### 4b. Management Variant â€” `WalletContextIsland`

Data available from `model`:
- `model.walletBalance` â†’ `{ balance, currency }`
- `model.paymentHistory` â†’ last entry for "last transaction" display
- `model.isLoadingWallet`

Content plan (top â†’ bottom):

**Section 1 â€” Wallet Health Pill**  
Large balance display: `${currency} ${balance.toFixed(2)}`  
Sub-label: "Available Balance"  
Micro CTA: "Top Up +" (calls `model.handleTopUp`) â€” ghost button, branded

**Section 2 â€” Last Transaction**  
Single card: most recent `paymentHistory[0]` entry  
Shows: date, service type icon, amount, status badge  
If no history: "No transactions yet" empty state (matches PaymentHistoryList style)

**Section 3 â€” Security Footer**  
"Your payment data is encrypted and never stored on-device."  
Lock icon + muted text only.

Design: Section 1 and 2 have subtle section separators (1px `rgba` lines). No card borders.

---

## 5. Component Architecture

### New components in `PaymentScreenComponents.jsx`:
1. `PaymentContextIsland` â€” checkout right island, props: `{ cost, insuranceApplied, serviceType, isDarkMode }`
2. `WalletContextIsland` â€” management right island, props: `{ walletBalance, lastTransaction, isLoading, onTopUp, isDarkMode }`

### New util in `paymentSidebarLayout.js`:
```js
export function computeThirdColumnLayout({ width, surfaceConfig, layout }) {
  // Returns: { usesThirdColumn: bool, thirdIslandRight, thirdIslandWidth, centerPanelMaxWidth }
}
```

### New helper in `stackViewportConfig.js`:
```js
export function isXLStackVariant(variant) {
  return variant === WEB_XL || variant === WEB_2XL_3XL || variant === WEB_ULTRA_WIDE;
}
```

### Changes to existing files:
- `paymentSidebarLayout.js` â†’ add `computeThirdColumnLayout`
- `stackViewportConfig.js` â†’ add `isXLStackVariant` export
- `PaymentCheckoutVariant.jsx` â†’ render `PaymentContextIsland` when `usesThirdColumn`, adjust center panel `marginRight`
- `PaymentManagementVariant.jsx` â†’ render `WalletContextIsland` when `usesThirdColumn`, adjust center panel `marginRight`
- `PaymentScreenComponents.jsx` â†’ add both island components

---

## 6. Design Guardrails (non-negotiable)

1. **No borders** â€” iVisit no-borders rule applies. Islands use glass blur + ghost surface, no `borderWidth`.
2. **No interaction in PaymentContextIsland** â€” purely a trust/information surface. Do not add tappable cards.
3. **WalletContextIsland "Top Up" CTA** â€” ghost button only (no filled/accent style). One interaction max per island.
4. **No new API calls** â€” all data flows from `model` already in scope. No `useEffect` / service calls inside islands.
5. **Typography scale** â€” body copy max 14pt. Section headers 11pt uppercase tracked. Amount heroes 28â€“32pt weight-800.
6. **Island appears/disappears cleanly** â€” no animation on mount/unmount (the parent already fade-slides in via `PaymentStageBase`). No separate enter animation needed.
7. **Third island does not shift left island or center panel position** â€” it is `position: absolute` on the right. Center panel adjusts via `marginRight` only.
8. **Symmetry constraint** â€” left island and right island must share the same `sidebarWidth`. The center panel must never be narrower than the left island.

---

## 7. Geometry Validation (desktop at 1440px example)

```
Viewport: 1440px
sidebarGutter: 24 (DESKTOP_SURFACE_CONFIG.overlaySheetSideInset)
sidebarWidth: min(420, max(320, 1440-64)) = 420px

Left island:   left=24, width=420  â†’ right edge at 464px
Center panel:  left=464, right=464+24=488 from right edge
               â†’ available width = 1440 - 464 - 420 - 48 = 508px
               â†’ center maxWidth cap: min(800, 508) = 508px  â† fits, no overflow
Right island:  right=24, width=420 â†’ left edge at 1440-24-420=996px

Center panel occupies 464â€“996px = 532px of space
Content inside: min(800, 532) = 532px  â† fills the space naturally
```

At 1280px (WEB_XL minimum):
```
sidebarWidth: 420, sidebarGutter: 24
Left island:  444px right edge
Right island: starts at 1280-444=836px
Center panel: 836-444=392px â†’ content min(800, 392)=392px  â† tight but workable
```

**Risk at WEB_XL minimum (1280px):** center panel is only ~392px wide with two islands.  
**Mitigation:** Reduce third island width at WEB_XL to `min(320, sidebarWidth)` so center panel gets ~520px.  
At WEB_2XL+ the full 420px is fine.

---

## 8. Implementation Passes

### Pass A â€” `stackViewportConfig.js`
- Add `isXLStackVariant(variant)` export
- No surface config changes needed

### Pass B â€” `paymentSidebarLayout.js`  
- Add `computeThirdColumnLayout({ width, surfaceConfig, layout, viewportVariant })`
- Returns `{ usesThirdColumn, thirdIslandWidth, thirdIslandRight, centerPanelMarginRight }`
- `thirdIslandWidth`: `viewportVariant === WEB_XL ? Math.min(320, sidebarWidth) : sidebarWidth`

### Pass C â€” `PaymentScreenComponents.jsx`
- Add `PaymentContextIsland` component (checkout)
- Add `WalletContextIsland` component (management)

### Pass D â€” `PaymentCheckoutVariant.jsx`
- Import `isXLStackVariant`, `computeThirdColumnLayout`
- Pass `viewportVariant` into `computeThirdColumnLayout`
- Bump right panel `maxWidth` to 800 for desktop variants
- Conditionally render `PaymentContextIsland` + apply `marginRight` to center panel `View`

### Pass E â€” `PaymentManagementVariant.jsx`
- Same structural changes as Pass D
- Conditionally render `WalletContextIsland` + apply `marginRight` to center `ScrollView`

### Pass F â€” Commit + verify at 1280, 1440, 1920px

---

## 9. Files Changed Summary

| File | Change |
|---|---|
| `utils/ui/stackViewportConfig.js` | Add `isXLStackVariant` |
| `components/payment/paymentSidebarLayout.js` | Add `computeThirdColumnLayout` |
| `components/payment/PaymentScreenComponents.jsx` | Add `PaymentContextIsland`, `WalletContextIsland` |
| `components/payment/PaymentCheckoutVariant.jsx` | XL gate, `marginRight` adjustment, render `PaymentContextIsland` |
| `components/payment/PaymentManagementVariant.jsx` | XL gate, `marginRight` adjustment, render `WalletContextIsland` |

Total estimated additions: ~180â€“220 lines across 5 files. No deletions from existing behaviour.

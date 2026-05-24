# Payment Screen — XL Context Island + Progressive Width Plan
**Status:** PLANNED — not yet implemented  
**Scope:** WEB_XL + WEB_2XL_3XL + WEB_ULTRA_WIDE variants only  
**Variants affected:** PaymentCheckoutVariant, PaymentManagementVariant  
**Files to change:** paymentSidebarLayout.js, PaymentCheckoutVariant.jsx, PaymentManagementVariant.jsx, PaymentScreenComponents.jsx

---

## 1. Problem Statement

At `WEB_XL` (≥1280px) and above, the three-column composition is:

```
[ LEFT ISLAND (420px) ] [ CENTER PANEL (flex:1, max 640px) ] [ DEAD SPACE (~320–600px) ]
```

The dead space is a raw gradient void — structurally unused, visually unintentional.

Two parallel fixes:
- **Plan D**: Progressively widen right panel content cap from 640 → 800 before the third island appears (covers MACBOOK + WEB_LG + WEB_XL tablet-to-desktop transition)
- **Plan A**: At WEB_XL+, render a third glass island anchored to the right edge with contextual content per variant

---

## 2. Breakpoint Map + What Triggers What

| Variant | Width | `overlayLayout` | Right cap | Third island |
|---|---|---|---|---|
| TABLET (WEB_MD, IOS_PAD, ANDROID_TABLET) | 768–1023px | left-sidebar | 640 | ❌ |
| DESKTOP (MACBOOK, WEB_LG) | 1024–1279px | left-sidebar | **800** (new) | ❌ |
| WEB_XL | 1280–1535px | left-sidebar | **800** (new) | ✅ |
| WEB_2XL_3XL | 1536–2559px | left-sidebar | **800** (new) | ✅ |
| WEB_ULTRA_WIDE | ≥2560px | left-sidebar | **800** (new) | ✅ |

Gate: `isDesktopStackVariant(viewportVariant)` already exists — use it for both changes.  
XL gate: `variant === WEB_XL || variant === WEB_2XL_3XL || variant === WEB_ULTRA_WIDE`  
Add a helper: `isXLStackVariant(variant)` in `stackViewportConfig.js`.

---

## 3. Layout Geometry — Third Island

The right island mirrors the left island exactly in:
- Width: `sidebarWidth` (same `overlaySheetMaxWidth` / `sidebarMaxWidth` from surfaceConfig)
- Corner radius: `SIDEBAR_CORNER_RADIUS` (24pt continuous squircle)
- Glass tokens: same `getPaymentSidebarGlassTokens` 
- Top margin: `headerClearance` (same baseline as left island and right panel content)
- Bottom margin: `sidebarGutter`

Position: `position: 'absolute'`, `right: sidebarGutter`, `top: 0`, `height: '100%'`  
The center panel `ScrollView` needs `marginRight: sidebarWidth + sidebarGutter * 2` when the third island is active — to prevent content sliding under it.

Brand mark dead zone (right column): mirror the left brand mark in the right island's `headerClearance` zone — but this right one shows a **contextual label** ("Secure Checkout" / "Financial Hub") not the brand mark (brand mark stays on the left only).

---

## 4. Content Strategy — What Goes in the Right Island

### 4a. Checkout Variant — `PaymentContextIsland`

Data available from `model`:
- `model.cost` → `totalCost`, `breakdown[]`
- `model.insuranceApplied`
- `model.serviceType` → `'ambulance'` | `'bed'`
- `params.organizationId` (not surfaced to variant — needs pass-through or read from params)

Content plan (top → bottom, no scrolling needed):

**Section 1 — Service Assurance**  
Icon + "Secure Payment" heading, 3 trust bullets:
- 🔒 PCI-DSS Level 1 encrypted
- ⚡ Real-time service dispatch  
- 🛡️ Covered by iVisit guarantee

**Section 2 — What Happens Next**  
Ordered step list (3 steps), service-type-aware:
- Ambulance: "Request approved → Ambulance dispatched → Track live ETA"
- Bed: "Request approved → Bed assigned → Navigate to facility"

**Section 3 — Cost Transparency footer**  
Single line: "No hidden fees. Billed exactly ${totalCost.toFixed(2)}."  
If `insuranceApplied`: "Insurance has been applied to your total."

Design: No card backgrounds. Text + icons only. Uses `textMuted` / `text` colors.  
No borders. No interaction — purely informational / trust-signal surface.

---

### 4b. Management Variant — `WalletContextIsland`

Data available from `model`:
- `model.walletBalance` → `{ balance, currency }`
- `model.paymentHistory` → last entry for "last transaction" display
- `model.isLoadingWallet`

Content plan (top → bottom):

**Section 1 — Wallet Health Pill**  
Large balance display: `${currency} ${balance.toFixed(2)}`  
Sub-label: "Available Balance"  
Micro CTA: "Top Up +" (calls `model.handleTopUp`) — ghost button, branded

**Section 2 — Last Transaction**  
Single card: most recent `paymentHistory[0]` entry  
Shows: date, service type icon, amount, status badge  
If no history: "No transactions yet" empty state (matches PaymentHistoryList style)

**Section 3 — Security Footer**  
"Your payment data is encrypted and never stored on-device."  
Lock icon + muted text only.

Design: Section 1 and 2 have subtle section separators (1px `rgba` lines). No card borders.

---

## 5. Component Architecture

### New components in `PaymentScreenComponents.jsx`:
1. `PaymentContextIsland` — checkout right island, props: `{ cost, insuranceApplied, serviceType, isDarkMode }`
2. `WalletContextIsland` — management right island, props: `{ walletBalance, lastTransaction, isLoading, onTopUp, isDarkMode }`

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
- `paymentSidebarLayout.js` → add `computeThirdColumnLayout`
- `stackViewportConfig.js` → add `isXLStackVariant` export
- `PaymentCheckoutVariant.jsx` → render `PaymentContextIsland` when `usesThirdColumn`, adjust center panel `marginRight`
- `PaymentManagementVariant.jsx` → render `WalletContextIsland` when `usesThirdColumn`, adjust center panel `marginRight`
- `PaymentScreenComponents.jsx` → add both island components

---

## 6. Design Guardrails (non-negotiable)

1. **No borders** — iVisit no-borders rule applies. Islands use glass blur + ghost surface, no `borderWidth`.
2. **No interaction in PaymentContextIsland** — purely a trust/information surface. Do not add tappable cards.
3. **WalletContextIsland "Top Up" CTA** — ghost button only (no filled/accent style). One interaction max per island.
4. **No new API calls** — all data flows from `model` already in scope. No `useEffect` / service calls inside islands.
5. **Typography scale** — body copy max 14pt. Section headers 11pt uppercase tracked. Amount heroes 28–32pt weight-800.
6. **Island appears/disappears cleanly** — no animation on mount/unmount (the parent already fade-slides in via `PaymentStageBase`). No separate enter animation needed.
7. **Third island does not shift left island or center panel position** — it is `position: absolute` on the right. Center panel adjusts via `marginRight` only.
8. **Symmetry constraint** — left island and right island must share the same `sidebarWidth`. The center panel must never be narrower than the left island.

---

## 7. Geometry Validation (desktop at 1440px example)

```
Viewport: 1440px
sidebarGutter: 24 (DESKTOP_SURFACE_CONFIG.overlaySheetSideInset)
sidebarWidth: min(420, max(320, 1440-64)) = 420px

Left island:   left=24, width=420  → right edge at 464px
Center panel:  left=464, right=464+24=488 from right edge
               → available width = 1440 - 464 - 420 - 48 = 508px
               → center maxWidth cap: min(800, 508) = 508px  ← fits, no overflow
Right island:  right=24, width=420 → left edge at 1440-24-420=996px

Center panel occupies 464–996px = 532px of space
Content inside: min(800, 532) = 532px  ← fills the space naturally
```

At 1280px (WEB_XL minimum):
```
sidebarWidth: 420, sidebarGutter: 24
Left island:  444px right edge
Right island: starts at 1280-444=836px
Center panel: 836-444=392px → content min(800, 392)=392px  ← tight but workable
```

**Risk at WEB_XL minimum (1280px):** center panel is only ~392px wide with two islands.  
**Mitigation:** Reduce third island width at WEB_XL to `min(320, sidebarWidth)` so center panel gets ~520px.  
At WEB_2XL+ the full 420px is fine.

---

## 8. Implementation Passes

### Pass A — `stackViewportConfig.js`
- Add `isXLStackVariant(variant)` export
- No surface config changes needed

### Pass B — `paymentSidebarLayout.js`  
- Add `computeThirdColumnLayout({ width, surfaceConfig, layout, viewportVariant })`
- Returns `{ usesThirdColumn, thirdIslandWidth, thirdIslandRight, centerPanelMarginRight }`
- `thirdIslandWidth`: `viewportVariant === WEB_XL ? Math.min(320, sidebarWidth) : sidebarWidth`

### Pass C — `PaymentScreenComponents.jsx`
- Add `PaymentContextIsland` component (checkout)
- Add `WalletContextIsland` component (management)

### Pass D — `PaymentCheckoutVariant.jsx`
- Import `isXLStackVariant`, `computeThirdColumnLayout`
- Pass `viewportVariant` into `computeThirdColumnLayout`
- Bump right panel `maxWidth` to 800 for desktop variants
- Conditionally render `PaymentContextIsland` + apply `marginRight` to center panel `View`

### Pass E — `PaymentManagementVariant.jsx`
- Same structural changes as Pass D
- Conditionally render `WalletContextIsland` + apply `marginRight` to center `ScrollView`

### Pass F — Commit + verify at 1280, 1440, 1920px

---

## 9. Files Changed Summary

| File | Change |
|---|---|
| `utils/ui/stackViewportConfig.js` | Add `isXLStackVariant` |
| `components/payment/paymentSidebarLayout.js` | Add `computeThirdColumnLayout` |
| `components/payment/PaymentScreenComponents.jsx` | Add `PaymentContextIsland`, `WalletContextIsland` |
| `components/payment/PaymentCheckoutVariant.jsx` | XL gate, `marginRight` adjustment, render `PaymentContextIsland` |
| `components/payment/PaymentManagementVariant.jsx` | XL gate, `marginRight` adjustment, render `WalletContextIsland` |

Total estimated additions: ~180–220 lines across 5 files. No deletions from existing behaviour.

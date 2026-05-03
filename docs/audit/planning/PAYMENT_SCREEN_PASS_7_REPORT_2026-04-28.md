# Payment Screen — Pass 7 Finalization Report

**Date:** 2026-04-28
**Scope:** Payment screen MD+ liquid-glass sidebar, header alignment, modal centering, no-borders rule, dead-code removal
**Status:** ✅ COMPLETE & VERIFIED

---

## 1. Objective

Bring the Payment screen (Management + Checkout variants) to Apple HIG-level quality at MD+ breakpoints by:

1. Replacing the legacy single-column ScrollView with a true two-pane layout (liquid-glass sidebar + scrollable right panel)
2. Aligning the floating `ScrollAwareHeader` pill bounds with the right-panel content edges
3. Centering modals at MD+ (centered-modal presentation)
4. Ensuring detail sheets stack above the floating header
5. Enforcing the **iVisit no-borders rule**
6. Removing dead code that no longer serves the screen

---

## 2. Architecture Snapshot

```
app/(user)/payment.* (route)
└── PaymentScreenOrchestrator        (entry — phase/variant chooser, header insets owner)
    └── PaymentStageBase              (shell: motion, sidebar overlay, scroll handling)
        ├── PaymentManagementVariant  (mode-specific composition)
        └── PaymentCheckoutVariant    (mode-specific composition)
            ├── PaymentScreenComponents (cards, sections, modals)
            ├── PaymentMethodSelector
            ├── AddPaymentMethodModal (.jsx + .web.jsx)
            └── MapHistoryPaymentShell (transaction detail — left drawer at MD+)
```

**Single source of truth:** `paymentSidebarLayout.js` (`computePaymentSidebarLayout`, `computeHeaderClearance`, `getPaymentSidebarGlassTokens`, `PAYMENT_SIDEBAR_HIG`).

---

## 3. Visual Spec — MD+ (TABLET / DESKTOP)

| Property | Value |
|---|---|
| Sidebar surface | `BlurView` + `ghostSurface` (parity with map sheet) |
| Sidebar width | TABLET 380pt / DESKTOP 420pt |
| Sidebar gutter | TABLET 16pt / DESKTOP 24pt (all sides) |
| Sidebar squircle | 24pt + `borderCurve: 'continuous'` |
| Sidebar inner padding | Vertical: header-aligned (24/32pt). Horizontal: 12pt (tightened) |
| Header pill bounds | Outer edges = right-panel content edges (no inset offset) |
| Header topInset | TABLET ~8pt / DESKTOP ~11pt (60% reduction via `HEADER_TOP_INSET_REDUCTION`) |
| Right-panel header clearance | `56 + headerTopInset + insets.top + 28pt` |
| Sidebar overlay zIndex | 10000 (covers global header background; pill renders inside via `containerLeft`) |

### 3.1 Header alignment formula

```
containerLeft  = sidebarLeft + sidebarWidth + sidebarGutter   // = right panel content left
containerRight = sidebarGutter                                // = viewport - right panel content right
leftInset      = 0   // pill fills container; outer margin offset zeroed
rightInset     = 0
```

### 3.2 Sidebar layout decisions

- **Liquid glass** (BlurView + ghostSurface): mirrors `MapExploreLoadingOverlay` for visual coherence with map sheets
- **Vertical padding header-aligned** so card content lines up with the header pill's internal padding
- **Horizontal padding 12pt** (tighter than vertical) so cards have more horizontal breathing room
- **`justifyContent: 'space-between'`** in Management variant: pins `LinkPaymentCard` to the bottom of the sidebar (true island affordance)

---

## 4. Modals — MD+ Centered Presentation

All payment modals respond to `surfaceConfig.modalPresentationMode`:

| Modal | Compact | MD+ |
|---|---|---|
| `AddFundsModal` | bottom-sheet, slide | centered, fade |
| `PaymentHistoryModal` | bottom-sheet (85% h), slide | centered (maxHeight 85%), fade |
| `AddPaymentMethodModal` (orchestrator wrapper) | slide | fade |
| `MapHistoryPaymentModal` (transaction detail) | bottom-sheet | left-drawer (inherits `MapModalShell`) |

**Z-index fix:** `MapModalShell` root bumped **220 → 10001** so detail sheets stack above `ScrollAwareHeader` (zIndex 9999) on web.

---

## 5. iVisit No-Borders Rule

Active payment surfaces — all visible borders removed:

| File | Borders removed |
|---|---|
| `paymentScreenComponents.styles.js` | `ledgerDivider`, `historyDivider`, `filterContainer` (3 hairlines) |
| `PaymentMethodSelector.jsx` | Method card selection ring (`borderWidth: 1`) + `addCard` dashed border |
| `AddPaymentMethodModal.web.jsx` | Card dialog border + `cardInputShell` border |

**Selection / separation now relies on:**
- Background tint (selected method = colored `iconBox`)
- Vertical rhythm (gap-based separation)
- Squircle elevation (cards via `theme.card` + shadow, not outlines)

> Native `AddPaymentMethodModal.jsx` retains only `borderWidth: 0` declarations (already invisible — left as-is for Stripe `CardField` compatibility).

---

## 6. Squircle Continuous

`borderCurve: 'continuous'` applied to **every** rounded card surface in active payment files. Skeleton pill shapes (`borderRadius: 999`) intentionally untouched (perfect circles at any aspect ratio).

---

## 7. Dead Code Removed

### 7.1 Deleted files
- `components/payment/SimplifiedPaymentScreen.jsx` (zero imports — orphan)
- `components/payment/PaymentProcessingScreen.jsx` (zero imports — orphan)

### 7.2 Cleaned within active files
| File | Removal |
|---|---|
| `paymentSidebarLayout.js` | `HEADER_SIDE_INSET_REDUCTION` constant (zeroed insets in orchestrator) |
| `PaymentStageBase.jsx` | Unused `View`, `ScrollView` imports + `resetTabBar`, `resetHeader` destructures + `variantGroup` memo + `getStackViewportVariantGroup` import |
| `PaymentScreenOrchestrator.jsx` | Unused `variantGroup` memo + `getStackViewportVariantGroup` import |

### 7.3 Documentation
- `docs/flows/payment/payment.md` — `SimplifiedPaymentScreen` reference replaced with current orchestrator architecture

---

## 8. Cross-Breakpoint Regression

| Breakpoint | `usesSidebarLayout` | Path |
|---|---|---|
| Compact (mobile) | false | Single-column inline render in variants |
| SM | false | Same as compact |
| TABLET / DESKTOP / WIDE_DESKTOP | true | Liquid-glass sidebar + right panel |

All MD+ logic gated by `surfaceConfig.overlayLayout === "left-sidebar"`. Compact path completely unchanged.

---

## 9. File Inventory (Active Payment Surface)

```
components/payment/
├── PaymentScreenOrchestrator.jsx   (entry point, 202 lines)
├── PaymentStageBase.jsx             (shell + sidebar layout, 144 lines)
├── PaymentManagementVariant.jsx     (wallet/methods mode, 184 lines)
├── PaymentCheckoutVariant.jsx       (checkout mode, 165 lines)
├── PaymentScreenComponents.jsx      (cards, sections, modals, 760 lines)
├── PaymentMethodSelector.jsx        (saved methods list)
├── AddPaymentMethodModal.jsx        (native — RN)
├── AddPaymentMethodModal.web.jsx    (web variant)
├── paymentScreenComponents.styles.js
├── paymentScreen.theme.js
├── paymentScreen.content.js
├── paymentSidebarLayout.js          (single source of truth)
└── tokens/paymentGlassTokens.js
```

`PaymentScreenComponents.jsx` is approaching the 500-line soft cap (760 lines) — flagged as a future refactor candidate. Logical split candidates: `PaymentHistoryModal`, `AddFundsModal`, and identity/summary sections each into their own files.

---

## 10. Validation Checklist

- [x] All variants properly receive and consume `layout` prop
- [x] Header `layoutInsets` reactive to width changes (orchestrator `useEffect`)
- [x] Sidebar bounds match map sheet formula exactly
- [x] Header pill outer edges = right-panel content edges
- [x] Modals center at MD+ via `surfaceConfig.modalPresentationMode`
- [x] Detail sheets stack above floating header (`zIndex 10001 > 9999`)
- [x] No visible borders in active payment files
- [x] All squircles use `borderCurve: 'continuous'`
- [x] Compact path preserved (no regressions)
- [x] No dead imports / unused destructures / orphan memos
- [x] Doc references match current architecture

---

## 11. Pending / Future Work

- **Pass 8 — Apple HIG sweep** for remaining stack pages: `InsuranceScreen`, `MedicalProfileScreen`, `HelpSupportScreen`, `MoreScreen`
- **Refactor candidate:** `PaymentScreenComponents.jsx` (760 lines) → split into per-component files
- **Optional:** Extract Stripe-specific input styling so `AddPaymentMethodModal.jsx` border-zero declarations can be cleanly removed

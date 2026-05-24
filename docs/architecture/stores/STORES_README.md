---
status: living
owner: architecture
last_updated: 2026-05-24
---

# Zustand Stores â€” Layer 3 Inventory

> **Version:** 2.0
> **Date:** 2026-05-24
> **Scope:** `stores/` in `ivisit-app`
> **Role:** Layer 3 of the five-layer Gold Standard architecture â€” persisted, cross-surface client snapshots.

For the overall architecture see [`architecture/overview/ARCHITECTURE.md`](../overview/ARCHITECTURE.md). For the in-code dev guide see [`stores/README.md`](../../../stores/README.md). For the migration history that produced these stores see [`architecture/state/GOLD_STANDARD_STATE_ROADMAP.md`](../state/GOLD_STANDARD_STATE_ROADMAP.md).

---

## 1. Layer Position

Zustand is Layer 3. It sits between TanStack Query (L2 â€” server cache) and XState/Jotai (L4/L5 â€” lifecycle and ephemeral UI).

```
L1 Supabase  â†’  L2 TanStack Query  â†’  L3 Zustand  â†’  L4 XState  â†’  L5 Jotai
                                       â–²
                                       â”‚
                  persisted client snapshots live here
```

Use a Zustand store when **all** of these are true:

- The value must survive component unmount, route changes, and reloads.
- The value is cross-surface (more than one screen/hook reads it).
- The value is not authoritative server data (that's L1/L2).
- The value is not a named-lifecycle state machine (that's L4).
- The value is not purely ephemeral UI (that's L5).

If only some are true, pick another layer instead of a store.

---

## 2. Store Inventory (22 files)

Twenty-two store files exist in `stores/`. Most pair a `*Store.js` with optional `*Selectors.js` (pure derived reads) and an XState machine in `machines/`.

### 2A Â· Emergency surface

| Store | Selectors | Machine | Domain |
|---|---|---|---|
| `emergencyTripStore.js` | `emergencyTripSelectors.js` | `tripLifecycleMachine.js` | Active ambulance trips, bed bookings, pending approvals, event-gate versioning |
| `emergencyContactsStore.js` | `emergencyContactsSelectors.js` | `emergencyContactsMachine.js` | Patient emergency contacts (five-layer reference implementation) |

### 2B Â· Trip / map / route

| Store | Selectors | Machine | Domain |
|---|---|---|---|
| `mapRouteStore.js` | â€” | `mapRouteMachine.js` | Active route payload, ETA seed, route preview state |
| `lastHospitalStore.js` | â€” | â€” | Most-recent selected hospital (issue-3 reload-lag fix) |
| `coverageStore.js` | â€” | â€” | Live/demo coverage mode + nearby coverage counts |
| `locationStore.js` | â€” | â€” | Pickup truth, manual address, recents |
| `modeStore.js` | â€” | â€” | Service mode (`emergency` \| `booking`), serviceType, viewMode, selectedSpecialty |

### 2C Â· Booking / payment

| Store | Selectors | Machine | Domain |
|---|---|---|---|
| `bookVisitStore.js` | â€” | `bookVisitMachine.js` | Multi-step book-visit flow draft + lifecycle |
| `billingQuoteStore.js` | â€” | `billingQuoteMachine.js` | FX-aware billing quote lane |
| `paymentPreferencesStore.ts` | â€” | â€” | Persisted user payment preferences (TS) |

### 2D Â· Profile / care continuity

| Store | Selectors | Machine | Domain |
|---|---|---|---|
| `medicalProfileStore.js` | `medicalProfileSelectors.js` | `medicalProfileMachine.js` | Medical profile loading/saving |
| `visitsStore.js` | `visitsSelectors.js` | `visitsMachine.js` | Visit history snapshot + derived reads |
| `notificationsStore.js` | `notificationsSelectors.js` | `notificationsMachine.js` | In-app notifications inbox + unread counts |
| `helpSupportStore.js` | `helpSupportSelectors.js` | `helpSupportMachine.js` | Help / support ticket state |

### 2E Â· Barrel

| File | Role |
|---|---|
| `index.js` | Public barrel exports. **Not every store is re-exported** â€” some are imported directly by their owning hooks (e.g. `mapRouteStore`, `medicalProfileStore`, `visitsStore`, `billingQuoteStore`, `paymentPreferencesStore`). |

---

## 3. Store Authoring Rules

### 3.1 Persistence boundary

- Persisted stores write through the app-owned `database` + `StorageKeys` boundary (`database/`). Do **not** call `AsyncStorage` directly.
- Hydration is explicit. Stores that need it expose `hydrateXStore()` and `isXStoreHydrated()` and gate consumers with `useXStore((s) => s.hydrated)`.
- Pattern reference: `modeStore.js`, `coverageStore.js`, `locationStore.js`, `lastHospitalStore.js`.

### 3.2 Equality-guarded actions

- Every mutating action must equality-check before writing (`if (state.x !== next) state.x = next;`).
- This avoids redundant React subscriber re-renders and preserves event-gate semantics where realtime ordering matters.

### 3.3 Null vs populated-object semantics

- Stores migrated from `useState` must preserve `null` vs populated meaning. Do **not** coerce `null` to `{}`.
- Selectors must handle the null shape explicitly (e.g. `activeTrip == null` is a valid state, not an error).

### 3.4 No stale closures

- For fresh reads inside callbacks/effects, use `useXStore.getState()` rather than capturing `state` via a selector in a closure.

### 3.5 Selectors are pure

- Derived reads belong in `*Selectors.js` as pure functions of state. Memoize at the consumer (`useMemo` or `useShallow`).

### 3.6 No cross-store writes inside actions

- A store action mutates **its own** store only. Cross-store coordination happens in hooks/controllers (e.g. `hooks/emergency/useEmergencyActions.js`), never inside an action body.

### 3.7 Realtime is L1 â†’ L2 â†’ L3 (one direction)

- Realtime events (L1) invalidate TanStack Query (L2). Queries may then populate a store (L3) through a hook. Realtime must not push directly into stores.

### 3.8 PULLBACK NOTE for migrations

- Stores produced by the Gold Standard migration carry a `// PULLBACK NOTE:` block at the top citing the old owner and the new contract. Preserve and extend these notes when refactoring.

---

## 4. Anti-patterns

| Anti-pattern | Correct alternative |
|---|---|
| Directly importing a store inside a broad UI component | Wrap with a hook (`useXSnapshot`) or selector |
| Storing derived values (`hasActiveTrip = !!trip`) | Compute via selector or inline `useMemo` |
| Async fetch inside a store action | Move to a service (`services/`) called from a hook |
| `useState` mirroring a store value | Subscribe with `useXStore` selector instead |
| Mutating outside an action (`state.x = ...` from a hook) | Always go through an action |
| Replacing `null` with `{}` to "simplify" | Preserve the null sentinel â€” UI distinguishes |

---

## 5. Reference Implementations

For new stores, use these as templates:

- **Persisted with hydration:** `modeStore.js`, `coverageStore.js`
- **Persisted with selectors + machine:** `emergencyContactsStore.js` + `emergencyContactsSelectors.js` + `emergencyContactsMachine.js`
- **Event-gated realtime:** `emergencyTripStore.js` + `emergencyTripSelectors.js`
- **TS store:** `paymentPreferencesStore.ts`

---

## 6. Cross-references

| Topic | Doc |
|---|---|
| Five-layer architecture overview | [`../overview/ARCHITECTURE.md`](../overview/ARCHITECTURE.md) |
| Refactoring rules (incl. useEffect decision tree) | [`../../REFACTORING_GUARDRAILS.md`](../../REFACTORING_GUARDRAILS.md) |
| Migration history (which phase produced each store) | [`../state/GOLD_STANDARD_STATE_ROADMAP.md`](../state/GOLD_STANDARD_STATE_ROADMAP.md) |
| EmergencyContacts five-layer ref | [`../emergency/EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md`](../emergency/EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md) |
| Code-side dev guide | [`../../../stores/README.md`](../../../stores/README.md) |

---

## 7. Change Log

| Version | Date | Change |
|---|---|---|
| 2.0 | 2026-05-24 | Expanded from 1-store stub to full 22-store inventory; added authoring rules and anti-patterns |
| 1.0 | 2026-01-? | Initial single-store doc (emergencyTripStore only) |

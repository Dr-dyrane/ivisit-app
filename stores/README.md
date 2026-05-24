# `stores/` — Layer 3 (Zustand)

Persisted, cross-surface client state for `ivisit-app`. Layer 3 of the five-layer Gold Standard architecture.

For the full architectural rationale, layer rules, and anti-patterns, read the canonical doc:

> [`docs/architecture/stores/STORES_README.md`](../docs/architecture/stores/STORES_README.md)

This file is the in-code quick reference for engineers working **inside** `stores/`.

---

## Files at a glance (22)

```
stores/
├── index.js                              ← barrel (partial — see note below)
│
├── emergencyTripStore.js                 + emergencyTripSelectors.js
├── emergencyContactsStore.js             + emergencyContactsSelectors.js
├── mapRouteStore.js
├── lastHospitalStore.js
├── coverageStore.js
├── locationStore.js
├── modeStore.js
├── bookVisitStore.js
├── billingQuoteStore.js
├── paymentPreferencesStore.ts
├── medicalProfileStore.js                + medicalProfileSelectors.js
├── visitsStore.js                        + visitsSelectors.js
├── notificationsStore.js                 + notificationsSelectors.js
└── helpSupportStore.js                   + helpSupportSelectors.js
```

> **Barrel note:** `index.js` re-exports the most commonly consumed stores. Some stores (e.g. `mapRouteStore`, `medicalProfileStore`, `visitsStore`, `billingQuoteStore`, `paymentPreferencesStore`) are imported directly from their files by their owning feature hooks. Both patterns are valid.

---

## Rules (short form)

1. **Persistence goes through `database/` + `StorageKeys`** — never call `AsyncStorage` directly from a store.
2. **Equality-guard every action** — `if (state.x !== next) state.x = next;`
3. **Preserve `null` vs populated-object semantics** — do not coerce `null` to `{}`.
4. **No async / no cross-store writes inside actions** — services + hooks coordinate that.
5. **Selectors are pure** — derived values live in `*Selectors.js`, not in component code.
6. **Realtime is L1 → L2** — realtime events invalidate TanStack Query; queries populate stores via hooks. No L1 → L3 shortcut.
7. **Subscribe via hooks/selectors**, not by importing the store directly into broad UI components.
8. **Use `getState()` for fresh reads** inside callbacks where selector closures would go stale.

---

## Common usage

```javascript
// Subscribing in a component (preferred via a hook)
import { useEmergencyTripStore } from './';

const activeTrip = useEmergencyTripStore((s) => s.activeAmbulanceTrip);

// Fresh read inside a callback (no stale closure)
const handleSubmit = () => {
  const { activeAmbulanceTrip } = useEmergencyTripStore.getState();
  if (activeAmbulanceTrip) { /* … */ }
};

// Hydration gate for persisted stores
import { useModeStore, hydrateModeStore } from './';
await hydrateModeStore();
const hydrated = useModeStore((s) => s.hydrated);
```

---

## When **not** to add a new store

| Symptom | Right layer |
|---|---|
| The value comes from Supabase | L1/L2 — TanStack Query |
| Named lifecycle (`IDLE/WAITING/DISPATCHED/…`) | L4 — XState machine in `machines/` |
| Modal open flag, draft field, selected row | L5 — Jotai atom in `atoms/` |
| Derived from other state | None — `useMemo` / selector |
| Single component, no persistence | `useState` in the component |

If you reach for `create(...)` and only one component will read the result, you're probably in the wrong layer.

---

## Reference templates

- **Persisted + hydration:** `modeStore.js`, `coverageStore.js`
- **Persisted + selectors + machine:** `emergencyContactsStore.js` (five-layer reference)
- **Event-gated realtime:** `emergencyTripStore.js`
- **TypeScript:** `paymentPreferencesStore.ts`

---

For migration history (which phase produced which store) see [`docs/architecture/state/GOLD_STANDARD_STATE_ROADMAP.md`](../docs/architecture/state/GOLD_STANDARD_STATE_ROADMAP.md).

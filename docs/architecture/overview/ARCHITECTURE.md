---
status: living
owner: architecture
last_updated: 2026-05-24
---

# iVisit App Architecture

> **Version:** 2.0
> **Date:** 2026-05-24
> **Status:** Source of truth for the current `ivisit-app` codebase
> **Predecessor:** [`docs/archive/historical/ARCHITECTURE_v1.1_2026-01-09.md`](../../archive/historical/ARCHITECTURE_v1.1_2026-01-09.md) (pre–Gold-Standard 3-layer)

This document is the entry-point architectural overview for `ivisit-app`. It describes the **what** and **where** of the running system. For the **why and how to refactor**, see [`REFACTORING_GUARDRAILS.md`](../../REFACTORING_GUARDRAILS.md). For the **migration history**, see [`architecture/state/GOLD_STANDARD_STATE_ROADMAP.md`](../state/GOLD_STANDARD_STATE_ROADMAP.md).

---

## 1. Product Posture

`ivisit-app` is the canonical patient product across iOS, Android, and web PWA. It is led by two actions: **Request Ambulance** and **Find Hospital Bed**. Everything else supports those actions: share location, track response, coordinate handoff, continue into follow-up care.

Surface model:

- One persistent map canvas (`MapScreen.jsx`)
- One persistent sheet shell with changing phases
- A small number of stack routes layered above the map (profile, settings, payment, etc.)
- A welcome + intake flow that runs before the map mounts

For the full product doctrine, see [`MASTER_BLUEPRINT.md`](../../MASTER_BLUEPRINT.md) and [`rules.json`](../../rules.json).

---

## 2. Top-Level Repository Map

```
ivisit-app/
â”œâ”€â”€ app/                 Expo Router file-based routes
â”‚   â”œâ”€â”€ (auth)/          Auth-gated routes (welcome, login, signup, map)
â”‚   â”œâ”€â”€ (user)/          Stack routes (profile, settings, visits, payment, …)
â”‚   â”œâ”€â”€ auth/            Auth callback handlers
â”‚   â””â”€â”€ _layout.js       Root composition
â”œâ”€â”€ runtime/             Runtime gate, providers, navigator, bootstrap effects
â”œâ”€â”€ providers/           AppProviders (native + .web variants)
â”œâ”€â”€ screens/             Screen components mounted by route files
â”œâ”€â”€ components/          Presentational surfaces (StageBase, views, sheets, leafs)
â”œâ”€â”€ hooks/               Behavior, controllers, query lifecycles, runtime coord
â”œâ”€â”€ services/            API adapters (Supabase, payment, route, notification…)
â”œâ”€â”€ stores/              Zustand persisted client state (Layer 3)
â”œâ”€â”€ atoms/               Jotai ephemeral UI state (Layer 5)
â”œâ”€â”€ machines/            XState lifecycle/legal transitions (Layer 4)
â”œâ”€â”€ contexts/            React contexts (compatibility shells + UI scaffolding)
â”œâ”€â”€ database/            Local persistence boundary (AsyncStorage + StorageKeys)
â”œâ”€â”€ constants/           Tokens, enums, shared constants
â”œâ”€â”€ utils/               Pure helpers
â”œâ”€â”€ data/                Static data + OTA update manifests
â”œâ”€â”€ supabase/            Schema, RPCs, RLS, migrations, edge functions
â””â”€â”€ docs/                This documentation tree
```

---

## 3. The Five-Layer State Architecture

Client state is owned by exactly one of five layers. Each layer has a specific responsibility and a specific implementation. New domain state must land in the right layer — never in a new ad-hoc context or in `useState` that leaks across boundaries.

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ L1 Â· SERVER TRUTH                          Supabase + Realtime       â”‚
â”‚      Authoritative rows, RPC responses, realtime events              â”‚
â”‚      → supabase/                                                     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                  â”‚
                                  ▼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ L2 Â· SERVER CACHE                          TanStack Query            â”‚
â”‚      Cache, refetch, invalidation, optimistic mutation               â”‚
â”‚      → hooks/**/use*Query.js, providers/QueryProvider.jsx            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                  â”‚
                                  ▼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ L3 Â· PERSISTED CLIENT SNAPSHOT             Zustand                   â”‚
â”‚      Active trips, contacts, coverage mode, location, visits, …     â”‚
â”‚      → stores/ (22 files)                                            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                  â”‚
                                  ▼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ L4 Â· LIFECYCLE LEGALITY                    XState                    â”‚
â”‚      Trip lifecycle, billing quote, contacts, machine-like states    â”‚
â”‚      → machines/ (10 files)                                          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                  â”‚
                                  ▼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ L5 Â· EPHEMERAL UI STATE                    Jotai                     â”‚
â”‚      Modals, drafts, selected rows, sheet phase, wizards             â”‚
â”‚      → atoms/ (18 files)                                             â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Layer ownership cheatsheet

| Question | Answer |
|---|---|
| Did the server tell us this? | L1 → L2 |
| Should it survive an app reload? | L3 |
| Is it a named lifecycle state (`IDLE/WAITING/DISPATCHED`)? | L4 |
| Is it a modal flag, draft field, or "selected row" pointer? | L5 |
| Is it derived from any of the above? | **None** — compute via `useMemo`/selector |

For the full decision tree and anti-patterns, see [`REFACTORING_GUARDRAILS.md`](../../REFACTORING_GUARDRAILS.md) §1.

---

## 4. Layer 1 — Supabase (server truth)

Authoritative data lives in Postgres. See `supabase/docs/REFERENCE.md` for pillar ownership, the UUID-native identity model, RPC catalogue, and RLS posture. Key surfaces:

- **Schema:** `supabase/migrations/**`
- **RPCs:** `supabase/functions/**` (edge) + Postgres functions in migrations
- **RLS:** role/org-scoped, non-recursive, `SECURITY DEFINER` helpers where required
- **Realtime:** scoped channel subscriptions, declarative config (see §6 below)
- **Append-only:** `wallet_ledger` and audit tables

Cross-repo contract: `supabase/` is **shared** with `ivisit-console`. Treat schema/RPC/RLS changes as ecosystem infrastructure.

---

## 5. Layer 2 — TanStack Query (server cache)

Provider mounted at app root in `providers/QueryProvider.jsx`. Per-feature hooks live under `hooks/**` and follow the naming pattern `use<Domain><Resource>Query` / `…Mutation`.

Rules:

- Server data only enters the client through TanStack Query, never through `useState` + async `useEffect`.
- Use scalar `queryKey` IDs, not unstable objects.
- Gate queries with `enabled: Boolean(<resource id>)` instead of `if` guards inside hooks.
- Realtime (L1) invalidates queries here; it does not push data directly into L3/L5.

---

## 6. Layer 3 — Zustand (persisted client snapshot)

Twenty-two stores under `stores/`. Each store owns one cross-surface, persist-able client snapshot. Selectors are colocated where derived reads are non-trivial.

| Store | Selectors / Machine | Domain |
|---|---|---|
| `emergencyTripStore` | `emergencyTripSelectors`, `tripLifecycleMachine` | Active ambulance trips, bed bookings, pending approvals |
| `emergencyContactsStore` | `emergencyContactsSelectors`, `emergencyContactsMachine` | Patient emergency contacts (five-layer reference impl) |
| `bookVisitStore` | — , `bookVisitMachine` | Multi-step book-visit flow |
| `coverageStore` | — | Live/demo coverage mode + nearby counts |
| `locationStore` | — | Pickup truth, manual address, recents |
| `lastHospitalStore` | — | Most-recent selected hospital |
| `mapRouteStore` | — , `mapRouteMachine` | Active route payload + ETA seed |
| `modeâ€‹Store` | — | Service mode (ambulance / bed / paired) |
| `notificationsStore` | `notificationsSelectors`, `notificationsMachine` | In-app notifications |
| `medicalProfileStore` | `medicalProfileSelectors`, `medicalProfileMachine` | Medical profile |
| `visitsStore` | `visitsSelectors`, `visitsMachine` | Visit history |
| `helpSupportStore` | `helpSupportSelectors`, `helpSupportMachine` | Help / support tickets |
| `billingQuoteStore` | — , `billingQuoteMachine` | FX-aware billing quotes |
| `paymentPreferencesStore` (TS) | — | Persisted payment preferences |

Rules:

- Stores must preserve `null` vs populated-object meaning — do not coerce null to `{}`.
- Do not access stores from broad UI components — go through a hook or selector.
- Cross-store coordination happens in hooks/controllers, not inside store actions.

See [`architecture/stores/STORES_README.md`](../stores/STORES_README.md) for the full per-store contract.

---

## 7. Layer 4 — XState (lifecycle legality)

Ten machines under `machines/`. Use a machine when the state space has named values with legal transitions (`IDLE → WAITING → DISPATCHED → ARRIVED → COMPLETED`), not when you just want a flag.

| Machine | Purpose |
|---|---|
| `tripLifecycleMachine` | Canonical trip lifecycle (request → dispatch → arrival → completion) |
| `billingQuoteMachine` | FX quote lifecycle |
| `bookVisitMachine` | Multi-step booking |
| `emergencyChatRoomMachine` | Communication room state |
| `emergencyContactsMachine` | Contacts five-layer ref |
| `helpSupportMachine` | Ticket lifecycle |
| `mapRouteMachine` | Route preview + active |
| `medicalProfileMachine` | Medical profile loading/saving |
| `notificationsMachine` | Notifications lifecycle |
| `visitsMachine` | Visits loading/saving |

---

## 8. Layer 5 — Jotai (ephemeral UI state)

Eighteen atom files under `atoms/`. Use atoms for modal flags, drafts, selected-row pointers, wizard steps, sheet phases, and any cross-component UI sync that does not need to survive a reload.

Representative atoms:

- `mapScreenAtoms` — sheet phase, sheet view, scroll state, sheet height
- `mapFlowAtoms` — explore-intent state, modal flags
- `emergencyAtoms`, `emergencyChatAtoms` — emergency-surface UI flags
- `paymentAtoms` (TS) — payment-screen drafts and selection
- `searchAtoms` (TS) — search-screen drafts
- `commitAtoms` (TS) — commit-flow drafts
- `locationIntentAtoms` — pending location intent

Rule: derived UI values belong in inline `const` / `useMemo`, not in atoms.

---

## 9. Compatibility Layer — Contexts

`contexts/**` still exists. After the Gold Standard migration, contexts fall into three classes:

1. **Thin orchestration shells over hooks** — `EmergencyContext`, `EmergencyUIContext`, `GlobalLocationContext`, `SearchContext`. These compose feature hooks and expose a stable consumer surface, but do not own state. Treat as thin compatibility — do **not** add new domain state here.
2. **UI scaffolding** — `ThemeContext`, `ToastContext`, `FABContext`, `TabBarVisibilityContext`, `HeaderStateContext`, `ScrollAwareHeaderContext`, `UnifiedScrollContext`. Layout/visual coordination only.
3. **Auth / session boundary** — `AuthContext`, `LoginContext`, `RegistrationContext`, `OTAUpdatesContext`, `PreferencesContext`, `NotificationsContext`, `VisitsContext`, `HelpSupportContext`, `GlobalMapContext`. Boundary or facade roles; verify against the five-layer rule when touching.

If you need new domain state, do **not** add a new context. Choose the correct layer (L1–L5) instead. See [`AGENTS.md`](../../../AGENTS.md) §Migration Awareness.

---

## 10. Runtime + Providers

```
app/_layout.js
  â””â”€â”€ RootProviders (providers/AppProviders.{jsx, web.jsx})
       â”œâ”€â”€ QueryProvider          ← L2 root
       â”œâ”€â”€ ThemeProvider
       â”œâ”€â”€ AuthProvider
       â”œâ”€â”€ ToastProvider
       â””â”€â”€ RootRuntimeGate        ← gates first-paint on readiness
            â”œâ”€â”€ RootBootstrapEffects
            â”œâ”€â”€ RootNavigator
            â””â”€â”€ OTAModalLayer
```

`runtime/useRootRuntimeReady.js` decides when the app is ready to render its first interactive screen. Bootstrap effects (auth hydration, OTA check, preferences load) run before paint.

---

## 11. Screen Anatomy

Stack routes follow a layered pattern:

```
app/(user)/<route>.jsx              ← thin route file (≤100 lines target)
  â””â”€â”€ screens/<Screen>.jsx          ← screen orchestrator (≤500 lines)
       â””â”€â”€ <Screen>Orchestrator    ← domain wiring, header, FAB, route coord
            â””â”€â”€ <Screen>StageBase   ← shell, motion, responsive composition
                 â””â”€â”€ <Screen>Model  ← business composition
                      â””â”€â”€ leaf components (presentational only)
```

Reference variant for new surfaces is typically iOS mobile; shared behavior is then lifted into orchestrators, StageBase components, themes, and formatters before web/tablet/Android variants compose differently. See [`flows/emergency/architecture/STACK_SURFACE_STANDARDIZATION_V1.md`](../../flows/emergency/architecture/STACK_SURFACE_STANDARDIZATION_V1.md).

---

## 12. Emergency / Map Surface (special)

The emergency experience is **not** a stack of routes. It is one persistent map canvas with a persistent sheet shell whose phases change. Rules:

- `MapScreen.jsx` stays thin; new decision logic goes into the map flow/controller layer (`hooks/map/**`) first.
- Persistent map stays mounted while sheet phases change.
- Full-screen wrappers above the map use `pointerEvents="box-none"`.
- Tracking-ready requires a complete contract: request id + active status + hospital/service context + route or ETA seed + responder identity (or explicit hydrating state).
- Fallback ETAs/routes must be marked and bounded; never fabricate confident arrival times.
- Realtime recovery must converge to backend truth after reconnect.

For the full implementation contract see [`flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`](../../flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md). For the live working tracker see [`flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md`](../../flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md).

---

## 13. Local Persistence — `database/`

`database/` is the app-owned `AsyncStorage` boundary. It is **not** the canonical client-state model anymore (that role belongs to Zustand stores). `database/` is used for:

- Migration compatibility (legacy keys + one-time migrations)
- Tiny app-scoped flags that don't need realtime, query, or machine semantics
- Optional persistence helpers used inside Zustand `persist` middleware

Rules:

- Use `database` + `StorageKeys` boundaries where they exist.
- Avoid scattered direct `AsyncStorage` calls for feature persistence.
- Do **not** move Supabase auth storage behind app-owned helpers — the Supabase client owns that adapter contract.

---

## 14. Web vs Native

Same product, posture-aware composition. The split happens at the provider and component levels:

- `providers/AppProviders.web.jsx` overrides where the web posture differs (e.g. specific provider order, web-only OTA layer).
- Components use `.web.jsx` siblings when web rendering must differ materially.
- `app.config.js` + `vercel.json` + `public/` carry web-specific runtime assets.
- The web map surface is a true web surface with explicit spacing/rendering decisions, not a stretched native card.

For deployment specifics: [`deployment/VERCEL_WEB_DEPLOYMENT.md`](../../deployment/VERCEL_WEB_DEPLOYMENT.md), [`deployment/WEB_MAPS_SETUP.md`](../../deployment/WEB_MAPS_SETUP.md).

---

## 15. Where to Look Next

| If you need to… | Read |
|---|---|
| Understand current sprint and priorities | [`SPONSOR_SPRINT.md`](../../SPONSOR_SPRINT.md) |
| Apply code-standard refactoring rules | [`REFACTORING_GUARDRAILS.md`](../../REFACTORING_GUARDRAILS.md) |
| See the migration history that produced today's shape | [`architecture/state/GOLD_STANDARD_STATE_ROADMAP.md`](../state/GOLD_STANDARD_STATE_ROADMAP.md) |
| Understand a specific Zustand store | [`architecture/stores/STORES_README.md`](../stores/STORES_README.md) |
| Work on the emergency map surface | [`flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`](../../flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md) + [`flows/emergency/MASTER_REFERENCE_FLOW_V1.md`](../../flows/emergency/MASTER_REFERENCE_FLOW_V1.md) |
| Touch Supabase schema/RPC/RLS | `supabase/docs/REFERENCE.md` + `supabase/docs/CONTRIBUTING.md` |
| Onboard as a new engineer | [`../../../AGENTS.md`](../../../AGENTS.md) (root) — required reading map |

---

## 16. Change Log

| Version | Date | Change |
|---|---|---|
| 2.0 | 2026-05-24 | Full rewrite to 5-layer Gold Standard. Predecessor v1.1 archived. |
| 1.1 | 2026-01-09 | Three-layer (Presentation / Business Logic / `database/`+`services/`). Archived. |

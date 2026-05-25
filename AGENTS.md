# Repository Agent Instructions

These instructions apply to the whole `ivisit-app` repository unless a more specific `AGENTS.md` exists in a subdirectory.

## How To Work Here

This repo has accumulated rules across docs, audits, and implementation patterns. Do not treat a single doc or stale instruction file as enough context.

Before substantial work, read the current source-of-truth docs for the touched surface, then inspect the live code that implements that doctrine. The goal is to preserve the iVisit way, not merely satisfy a local diff.

For quick fixes, still check the relevant nearby code and any doc explicitly named by that code or folder.

## Authority Order

When guidance conflicts, use this order:

1. `docs/rules.json`
2. `docs/MASTER_BLUEPRINT.md`
3. `docs/SPONSOR_SPRINT.md`
4. Current flow trackers and implementation contracts in `docs/flows/**`
5. Current architecture and refactor docs in `docs/architecture/**` and `docs/REFACTORING_GUARDRAILS.md`
6. Current audit and checkpoint docs in `docs/audit/**`
7. Supabase current docs in `supabase/docs/**` for database, RPC, RLS, Edge Function, and shared schema work
8. Repo-local agent hints such as `.github/copilot-instructions.md` and `.agent/workflows/**` only where they do not conflict with current docs
9. Archived docs under `docs/archive/**` or `supabase/docs/archive/**` only for historical context

If repo-local agent workflow files, including `.agent/workflows/**` in this repo or `.windsurf/workflows/**` during cross-repo console work, conflict with `supabase/docs/CONTRIBUTING.md` or `supabase/docs/REFERENCE.md`, prefer the current Supabase docs and call out the conflict in your final note.

## Required Reading Map

Use this map before changing a domain:

- Product doctrine: `docs/rules.json`, `docs/MASTER_BLUEPRINT.md`, `docs/SPONSOR_SPRINT.md`
- Docs placement: `docs/README.md`, `docs/INDEX.md`, `docs/CONTRIBUTING.md`
- Emergency/map work: `docs/flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md`, `docs/flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`, `docs/flows/emergency/MASTER_REFERENCE_FLOW_V1.md`
- State/refactor work: `docs/REFACTORING_GUARDRAILS.md`, `docs/architecture/state/GOLD_STANDARD_STATE_ROADMAP.md`, `docs/architecture/refactoring/REFACTORING_BIBLE.md`, `docs/architecture/refactoring/TRACKING_SHEET_LEARNINGS.md`
- Stack surfaces: `docs/flows/emergency/architecture/STACK_SURFACE_STANDARDIZATION_V1.md`
- UI/product design: `docs/product_design/ui_ux_bible.md`, `docs/product_design/SCREEN_CONSISTENCY_GUIDE.md`, `docs/research/APPLE_MAPS_IPHONE_UI_REFERENCE.md` when map/sheet behavior is involved
- Supabase/database: `supabase/docs/CONTRIBUTING.md`, `supabase/docs/REFERENCE.md`, `supabase/docs/TESTING.md`, `supabase/docs/MODULE_SCHEMA_BIBLE.md`
- Edge Functions: `supabase/functions/README.md`
- Release/deployment: `README.md`, `docs/deployment/**`, `app.config.js`, `version.js`, `package.json`
- Patent, trade-secret, valuation, sponsor materials: `docs/algorithm/**`, `docs/SPONSOR_SPRINT.md`

Search `docs/INDEX.md` before creating or moving docs.

## Product Role

`ivisit-app` is the canonical patient product for iVisit across iOS, Android, and web PWA. It owns patient-facing emergency, bed, visit, wallet, profile, and follow-up care flows.

The ecosystem surface split is:

- `ivisit`: marketing, acquisition, legal, public trust, SEO, and product handoff
- `ivisit-app`: canonical patient product across native and web
- `ivisit-console`: provider onboarding, provider operations, sponsor/admin dashboards, dispatch, approval, and CRUD workflows
- `iVisit-docs`: NDA-gated data room, sponsor/investor/legal enablement, invite/access governance

Do not duplicate authenticated patient flows into marketing surfaces. Do not mix provider console workflows into the patient app. When valuation or sponsor docs are touched, present iVisit as the four-surface ecosystem above, not as a single app idea.

## The iVisit Way

iVisit is an emergency response and hospital capacity platform. The patient product is led by two actions:

- Request Ambulance
- Find Hospital Bed

Everything else supports those actions: share location, track response, coordinate handoff, continue into follow-up care.

The product promise is: "Get help fast when something feels wrong."

The intended user feeling is: "We are already helping you."

In urgent situations, users do not explore. They act. The system should make safe decisions for the user whenever it can.

## Surface Differentiation

iVisit does not shrink one desktop or phone layout everywhere. Major surfaces use differentiated variants when posture changes materially.

Implementation signal:

- Welcome uses `WelcomeScreenOrchestrator` and many device/web variants.
- Emergency intake uses `EmergencyIntakeOrchestrator`.
- Map sheet modes use orchestrators and StageBase components, for example `MapExploreIntentOrchestrator` plus `MapExploreIntentStageBase`.
- Stack routes increasingly delegate to screen orchestrators, for example `PaymentScreenOrchestrator`, `ProfileScreenOrchestrator`, `EmergencyContactsScreenOrchestrator`.

Rules:

- Establish design truth on the reference variant, often iOS mobile, then move shared behavior into controllers, models, themes, formatters, tokens, and StageBase components.
- Do not rebuild the same behavior separately for web, tablet, Android, and iOS.
- Phone, tablet, desktop, and web variants may compose differently, but they must share product logic and state truth.
- Web must be a true web surface with explicit spacing, rendering, and map-treatment decisions, not a stretched native card.
- Full-canvas experiences such as welcome and map should not be boxed by inherited auth or stack wrappers.
- Wide-screen dead space should become context panels or breathing room, not oversized forms or stretched modal cards.

## Code-Reviewed Product Architecture Truths

The live app has deeper architecture patterns that must be preserved when changing UI or logic.

Map flow doctrine:

- `/map` is a persistent canvas with changing sheet phases, not a stack of route-like screens.
- `MapScreen.jsx` is a high-level wiring surface. It should compose hooks, orchestrators, and renderers; new product logic should land in the relevant map hook, controller, transition builder, runtime model, or StageBase.
- `useMapExploreFlow` is intentionally decomposed into single-owner hooks. Preserve this ownership instead of adding broad state or callbacks back into `MapScreen.jsx`.
- Sheet state changes should use transition builders from `hooks/map/exploreFlow/mapExploreFlow.transitions.js`, not ad hoc `{ phase, snapState, payload }` objects.
- Back/close behavior depends on `sourcePhase`, `sourceSnapState`, `sourcePayload`, and sometimes source-surface metadata. Preserve source-return payloads when opening detail, search, service, visit, decision, commit, and tracking sheets.
- `useMapSheetPhaseReducer` validates observed transitions in development. New sheet phases or jumps should update the valid-transition table from real call sites rather than bypassing it.
- Tracking auto-open requires both request identity and lifecycle truth. Do not treat a truthy request id as tracking-ready unless XState/lifecycle and runtime readiness also agree.
- Location truth is resolved through the map pickup-location layer. Manual session location, resolved place, device location, saved fallbacks, demo bootstrap, and unavailable states have different meanings and should not be collapsed into a generic location object.
- Map loading must distinguish loading, background refresh, route calculation, and terminal no-location states. Location-off users should see interactive manual-pickup UI, not a blocking spinner.
- Commit flow has a restorable lifecycle: details, triage, payment, and tracking handoff. Suppression refs and persisted commit snapshots prevent unintended restore loops; do not remove them without proving the lifecycle remains stable.
- Rating recovery and visit-detail return behavior are session-sensitive. Preserve handled-id refs, cancellation sentinels, and return-target refs so recovered modals do not duplicate or return to the wrong surface.

Runtime and state doctrine:

- Runtime model builders and controller hooks are part of the UI contract. Tracking labels, ETA, telemetry warnings, responder identity, request labels, and route progress should come from runtime/model helpers, not from leaf presentation guesses.
- Derived data hooks should remain pure memos where possible. Shared clocks such as tracking `nowMs` should be owned once and passed down, not recreated with per-component intervals.
- UI atoms own ephemeral surface state, Zustand owns persistent client snapshots, XState owns lifecycle legality, TanStack Query owns server data, and Supabase/realtime owns backend truth. Do not migrate state between layers just to simplify a local component.
- PULLBACK NOTE comments mark rollback-sensitive migrations, copied logic, and non-obvious runtime changes. Preserve existing notes and add new ones for risky architecture moves.

## Visual And Interaction Doctrine

The interface should feel calm, direct, premium, borderless, low-noise, and trustworthy.

Rules:

- Prefer spacing, contrast, surface depth, shadows, and elevation over visible borders.
- Use borders only when they carry state, accessibility, or necessary separation that depth/spacing cannot provide.
- Keep one obvious primary action per moment.
- Avoid theatrical dashboard styling, fake enterprise metrics, decorative simulation, or visible debug artifacts.
- Motion explains state change. It should be short, purposeful, predictable, reversible, and respectful of reduced motion.
- Haptics must have meaning and must not stack.
- Every tap, submit, route transition, and primary action needs immediate visible feedback.
- Important async surfaces need skeletons or compact structural loading states, not blank pauses or generic full-screen spinners.
- Emergency map-loading states should use skeleton or scrim treatment, not activity indicators.
- Empty states should lead to the next useful action.
- Tap targets must be comfortable: target at least 44px/pt where practical, and add `hitSlop` to small icon buttons.
- Non-essential motion must respect reduced-motion hooks and settings.
- Compact text must defend against overflow with appropriate `numberOfLines`, font scaling caps, or fitting behavior.
- Use the two-state status palette: accent sky for in-progress states and success emerald for completed states. Red is reserved for danger, emergency, or telemetry-critical meaning, not casual accent use.

Copy rules:

- Use short, directive, human wording.
- Headlines communicate outcome, not category.
- Buttons describe the user's action, not implementation.
- Status text explains what is happening now.
- Avoid technical, internal, hype-driven, or explainer-heavy copy.
- Do not repeat the same word across headline, support line, CTA, and status unless repetition improves panic-time comprehension.

## Specific UI Design Implementation Doctrine

The codebase implements a concrete Apple-like visual system. Treat these as product rules, not incidental styling.

Glass and surfaces:

- Prefer glass, translucency, depth, soft shadows, large radii, and restrained contrast over bordered card stacks.
- Map sheets are Apple Maps-style islands, not generic modals. Use the existing map sheet tokens for island margin, 44px sheet radius, 30px card radius, handle width, glass surface, blur, and shadow behavior.
- Use borders only when depth, spacing, blur, or contrast cannot carry the separation or state.
- Android, iOS, and web glass treatments intentionally differ. Do not force one platform's blur/shadow implementation onto every platform.

Layout and density:

- StageBase components own shell layout, motion, responsive spacing, safe-area treatment, and surface presentation. Leaf components should not invent local page chrome.
- Leaf components should consume existing tokens, metrics, and screen configs before adding one-off spacing, type sizes, shadows, or radii.
- iVisit density is compact and calm: small padding can be correct when hierarchy is clear. Do not inflate emergency surfaces into marketing-page spacing.
- Stack screens use shared compact/tablet/desktop metrics. Respect the existing 44px compact controls and 48px tablet/desktop controls unless a surface-specific token says otherwise.
- Full-canvas flows such as welcome, map, and wide payment layouts may escape inherited stack chrome when chrome would make the experience feel boxed.

Responsive variants:

- Major surfaces are variant-driven, not breakpoint-only. Preserve explicit iOS, Android, tablet, foldable, Chromebook, web mobile, desktop, and ultra-wide variants when posture changes materially.
- Wide screens should become anchored sidebars, panels, context rails, or bounded compositions. Do not stretch phone cards across desktop width.
- Web is a first-class surface. It needs explicit max widths, panel placement, hover/scroll behavior, and map occlusion decisions.

Motion and gestures:

- Motion must use existing motion tokens, tuned springs, and Apple-like easing unless there is a proven product reason to add a new token.
- Non-essential animation must respect reduced-motion hooks.
- Sheet detents, scroll detents, wheel behavior, drag thresholds, and expanded-collapse behavior are centrally choreographed. Do not add competing scroll views or gesture handlers inside map sheets without checking `useMapSheetDetents` and shared stage scroll primitives.
- Motion should explain state change. Avoid decorative pulsing, parallax, or animated noise unless it communicates urgency, focus, progress, or availability.

Visual truth:

- UI hierarchy must follow backend/runtime truth. Do not make uncertain states look dispatched, paid, tracking-ready, arrived, completed, or reserved before the model supports it.
- ETA, route, telemetry, responder, bed, payment, and approval surfaces must show bounded uncertainty when truth is incomplete.
- The primary action should be the clearest visual object at each moment; secondary metrics and context should support confidence without becoming a dashboard.
- Red remains reserved for emergency, danger, destructive, or telemetry-critical meaning. Use accent sky for in-progress and success emerald for completed states.

## Engineering Architecture

Prefer existing patterns over new abstractions. Reuse before creating.

Core separation:

- Views render structure and interaction wiring.
- Hooks/controllers own state orchestration and side effects.
- Services own Supabase, payment, route, notification, and other API boundaries.
- Utils own pure helpers.
- Tokens, themes, content, helpers, and styles should be split from JSX once a surface grows.

Common placement:

- `screens/*.jsx`: thin route/screen orchestration
- `components/**`: presentational surfaces and StageBase/view variants
- `hooks/**`: feature behavior, controllers, query lifecycle, and runtime coordination
- `services/*.js`: API adapters and business operations
- `utils/**`: pure helpers
- `atoms/*.js`: Jotai UI state
- `stores/*.js`: Zustand persisted state
- `machines/*.js`: XState lifecycle/legal transitions
- `constants/**`: shared tokens and constants

Avoid files over 500 lines without an extraction plan. Above 800 lines is a refactor candidate; above 1000 lines is an architectural violation unless generated.

Use named exports for hooks/services where the local pattern expects them. Keep hook names aligned with filenames. Prefer barrel exports in hook directories when the directory is a feature family.

Rendering anti-patterns:

- Do not put business logic inside JSX expressions.
- Do not define inline sub-components inside render bodies.
- Avoid anonymous functions in hot prop paths when stable callbacks are expected.
- Do not add wrappers, gradients, overlays, or animation layers before checking whether the target component already owns that visual primitive.

## State Ownership

Use the five-layer architecture:

- Supabase/Realtime: server truth
- TanStack Query: server cache, refetch, invalidation, optimistic mutation
- Zustand: persisted cross-surface client snapshot
- XState: lifecycle readiness, legality, and transitions
- Jotai: modal, draft, selected row, sheet, wizard, and other ephemeral UI state

Do not mix server truth and client presentation state in the same hook. Do not store derived state when it can be selected or computed. Do not access Zustand stores directly from broad UI components when a hook/selector boundary already exists.

Use `useEffect` only for real side effects: subscriptions, cleanup, timers, navigation, or external synchronization. Derived values belong in inline constants, selectors, or `useMemo`. Refs that mirror current values should usually be assigned during render.

Persistence rule:

- Use the app-owned `database` and `StorageKeys` boundaries where they exist.
- Avoid scattered direct `AsyncStorage` calls for feature persistence.
- Do not move Supabase auth storage behind app-specific helpers; the Supabase client owns that adapter contract.

Realtime rule:

- Realtime is Layer 1. It should invalidate or refresh Layer 2 TanStack Query data, not hold canonical data or directly drive UI state.
- Prefer declarative channel configuration plus small channel components/hooks over hooks-in-loops or per-screen bespoke subscriptions.
- Scope channels narrowly, clean them up reliably, and let query/store/lifecycle layers project the result to the UI.

## Common Pitfalls

These bugs recur in this repo. Check them before changing hooks, flows, or async state.

- TDZ: never reference `const` or `let` values before their declaration line. Declare capabilities before any memo, callback, effect, or hook config that consumes them.
- Hook API: before using a hook value at a call site, read the hook's `return {}` block. Internal variables are not public API; add exports at the hook source first.
- Layer disguise: `useState` plus async `useEffect` that fetches server data is usually TanStack Query work. Machine-like string state usually belongs in XState or Jotai.
- Ref sync: an effect whose only job is `ref.current = value` is usually wrong; assign the ref during render.
- Object truthiness: do not use object `||` chains when field validity matters. Use explicit predicates such as valid coordinate checks.
- Store semantics: when migrating `useState` to Zustand, preserve `null` versus populated object meaning. Do not replace meaningful null with `{}`.
- Timers: fallback timers must not be guarded by the exact state they are meant to compensate for.
- Auth/cache: guarded flows should seed from safe cached state before async sync when the product needs immediate continuity.

## Debugging Doctrine

Map the full data flow before touching code: source -> state owner -> hook/controller -> component -> platform/library.

Fix at the source of truth, not at the symptom surface. Name the broken contract before editing: owner layer, user symptom, existing guard to preserve, and smallest safe change.

Change one variable at a time when isolating a root cause. Do not claim a compound fix proves which part mattered unless you verified it separately.

Prefer minimal upstream fixes over downstream workarounds. A one-line fix is better than a refactor when it truly closes the defect.

Add validation at data-entry and service boundaries rather than scattering defensive checks through render code.

## Change Hygiene

Use `PULLBACK NOTE` comments for rollback-sensitive changes: refactors, migrations, contract changes, copied/adopted prior logic, risky runtime fixes, and non-obvious UI behavior changes.

Format:

```js
// PULLBACK NOTE: [pass or reason]
// OLD: original behavior or location
// NEW: new behavior or location
```

Keep these notes short and factual. Do not add them for trivial edits where the diff is self-explanatory.

Do not commit, push, merge, rebase, reset, or tag unless the user explicitly asks for that git operation or the task clearly includes publishing. Never use history-mutating commands casually.

Commit messages should describe the product or engineering outcome, not a file list.

## Migration Awareness

The Gold Standard state migration is substantially complete. `EmergencyContext` is no longer the place to add new domain state.

Rules:

- Treat `EmergencyContext` as a thin compatibility/orchestration shell over `hooks/emergency/**`.
- New server data goes to Supabase/TanStack Query boundaries.
- New persistent client snapshots go to Zustand stores.
- New lifecycle legality goes to XState machines.
- New UI drafts, selected rows, modal state, and sheet state go to Jotai or local StageBase state as appropriate.
- Do not create new broad contexts for domain state without proving the five-layer model cannot handle the case.

## Emergency And Map Rules

The emergency experience is one persistent map canvas, one persistent sheet shell, and changing sheet phases. Do not create route-like hard cuts for normal map-flow state changes.

`MapScreen.jsx` must stay thin. If a new `/map` state needs decision logic or cross-surface side effects, add it to the map flow/controller layer first.

Required emergency checks:

- Ambulance-only, bed-only, paired ambulance plus bed, payment approval, and realtime recovery flows remain coherent.
- The committed request lifecycle cannot imply dispatch before backend truth releases it.
- Matched and tracking states reuse real trip truth, responder coordinates, telemetry health, route/ETA state, and route animation contracts.
- ETA is the primary anchor after responder match; route/responder details support trust without becoming a dashboard.
- Tracking-ready is stronger than request id plus active trip. It needs request identity, hospital/service context, active status, route or ETA seed, pickup/patient context when available, and either responder identity or an explicit hydrating state.
- Route previews preload route data before the map-backed state appears.
- Destination changes use stable route keys, cached route payloads, and pending-selection swaps.
- Fallback routes/ETAs must be marked and bounded; never fabricate confident arrival times.
- Realtime recovery must converge to backend truth after reconnect or missed events.

Touch/pointer rules for map work:

- Persistent map stays mounted while sheet state changes.
- Full-screen wrappers above the map use `pointerEvents="box-none"`.
- Hidden or fading overlays release touches with the actual React Native `pointerEvents` prop.
- Sheet touch capture stays inside visible sheet bounds unless a real blocking modal is open.

## Stack Surface Rules

Stack routes should follow the reference pattern:

- Thin route file
- Orchestrator handles domain wiring, header, FAB, and route-level coordination
- StageBase owns shell, motion, and responsive composition
- Screen model owns business composition
- Leaf components own presentational sections

The path `welcome -> map -> mini profile -> stack route` must acknowledge navigation immediately. Stack routes must render cached, skeleton, or real loading states instead of blank pauses.

Side-effect surfaces such as editor modals, add forms, detail modals, and history modals must use shared viewport surface config. Compact variants may use bottom sheets. Tablet/desktop variants should be width and height bounded.

## Supabase And Data Rules

Supabase schema/RPC/RLS work is shared across App and Console. Treat it as ecosystem infrastructure.

Current source of truth:

- `supabase/docs/REFERENCE.md` for pillar ownership, UUID/display ID system, data flows, and RPCs
- `supabase/docs/CONTRIBUTING.md` for migration hygiene, service patterns, sync discipline, cleanup gates, and test strategy
- `supabase/docs/MODULE_SCHEMA_BIBLE.md` for module ownership

Rules:

- Preserve UUID-native internal identity and display-id resolution.
- Never inline UUID regex or ID resolution logic; use canonical helpers.
- Keep RLS non-recursive and role/org scoped.
- Use `SECURITY DEFINER` helpers where policies or internal RPCs require controlled bypass.
- Keep `wallet_ledger` append-only.
- Scope realtime subscriptions aggressively and unsubscribe on cleanup.
- Reads should use retry helpers where appropriate; mutations must be idempotent or guarded before retry.
- Critical mutations need auditability.
- Restricted frontend services should silently guard unauthorized roles and return neutral empty state instead of producing noisy console errors.
- Sync shared schema/docs/types to `ivisit-console` after relevant Supabase changes.
- Run zero side-effect cleanup gates after hardening/test suites and before push.

Migration note:

- The repo contains older "new migration only" instructions and newer pillar-based consolidation instructions. Follow the current Supabase docs for the active workflow and mention any conflict encountered.

## Payments And Wallets

Payment changes must preserve idempotency, lifecycle clarity, and user-visible certainty.

Required checks:

- Card, cash, wallet, approval, failure, retry, and ledger paths remain distinct.
- UI does not imply completion before backend confirmation.
- Cash approval states do not look like dispatch release.
- Stripe webhook and RPC transition metadata remains auditable.
- No duplicate charge, duplicate wallet mutation, duplicate ledger entry, or silent payment failure path is introduced.

## Docs Discipline

Docs are part of the product system.

Rules:

- Search `docs/INDEX.md` before creating a new doc.
- Prefer updating an existing source-of-truth doc over adding a sibling.
- Root `docs/` files are rare and doctrine-oriented.
- New docs must follow `docs/CONTRIBUTING.md` folder routing and naming rules.
- New docs need `docs/INDEX.md` updates when they are part of the maintained docs tree.
- Superseded docs get archival notices and move to the correct archive folder; do not silently delete history.
- Audit, patent, valuation, and sponsor docs must distinguish verified code evidence from inference.

## Confidentiality And Patent-Sensitive Work

Treat `docs/algorithm/**`, claim charts, trade-secret notes, valuation evidence, filing packs, prior-art comparisons, sponsor packs, staging traces, and empirical logs as confidential by default.

Before committing or pushing this material:

- Verify repo, branch, remote, and disclosure path.
- Avoid public disclosure of protectable algorithms, line exhibits, internal valuation logic, private traces, staging logs, and attorney-facing claim language.
- Keep attorney-review placeholders clearly labeled when legal language has not been reviewed.
- Do not present legal, tax, securities, patentability, or valuation conclusions as professional advice.
- Prefer sponsor-safe summaries for broad docs and controlled exact exhibits for filing materials.

## Release And Version Discipline

Release posture spans several files. Keep these consistent when versioning or distribution changes:

- `package.json`
- `package-lock.json`
- `app.config.js`
- `version.js`
- `README.md`
- `docs/deployment/**`
- `data/update.json` when OTA/update messaging changes

Follow the README's Expo/EAS channels, Google Play closed-test notes, and SemVer guidance. Do not change production release settings casually.

Call out whether a change needs local Expo testing, web export, EAS preview/staging/production build validation, closed-test artifact updates, store metadata updates, or Vercel verification.

## Encoding And Mojibake Gate

Before finishing any change that creates or edits text files, run a mojibake and encoding check on touched files.

Required checks:

- New or edited text files must be UTF-8 unless the file type requires another encoding.
- Do not commit mojibake signatures, replacement characters, or corrupted punctuation, arrows, checkmarks, emoji, or section symbols.
- If a generated audit, filing pack, report, migration, or exported doc contains smart punctuation, emoji, arrows, or checkmarks, reopen it in plain text and verify the rendered characters are intentional.
- If mojibake is found, fix the source encoding or regenerate the file before final response, commit, or push.
- Mention the check in final verification when the task touches docs, generated files, migrations, exports, or public-facing copy.

Useful checks:

```powershell
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" <touched-files>
rg -n --pcre2 "[^\x00-\x7F]" <touched-files>
```

The non-ASCII check is not a failure by itself. It is a review prompt: non-ASCII is allowed when intentional and correctly rendered.

## Verification Expectations

Scale verification to risk and touched surface.

Common checks:

- `git diff --check`
- Mojibake/encoding scan for touched text files
- `npm run build:web` for web export changes
- `npx expo start` or targeted device/browser verification for runtime UI changes
- Targeted `npm run hardening:*` scripts for touched database, emergency, payment, and Console contract surfaces
- `npm run hardening:full` for broad Supabase/emergency hardening when feasible
- Supabase cleanup side-effect guard after hardening/test matrix runs

Test discipline:

- Design or update targeted tests before major implementation when the expected behavior is not already protected.
- Never delete, weaken, or bypass a test without explicit rationale.
- When a check is skipped, include the skipped command and reason in the final response.

## Git And Workspace Safety

The workspace may contain user changes. Do not revert unrelated files.

Before committing or pushing:

- Review `git status --short`.
- Review relevant diffs.
- Stage only intended files.
- Keep confidential docs out of broad/public pushes unless the user explicitly confirms the disclosure path.
- Run appropriate verification.

Use concise commit messages that describe the product or engineering outcome.

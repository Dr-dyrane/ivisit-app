---
status: living
owner: architecture
last_updated: 2026-05-24
---

# Architecture Documentation

Index for cross-cutting architectural decisions, refactor bibles, roadmaps, and per-domain design notes in `ivisit-app`.

Start here for the entry-point system overview:

> [`overview/ARCHITECTURE.md`](./overview/ARCHITECTURE.md) — v2.0, the five-layer Gold Standard

For code standards and the `useEffect` decision tree, see [`../REFACTORING_GUARDRAILS.md`](../REFACTORING_GUARDRAILS.md).

---

## Subfolders

| Folder | Scope |
|---|---|
| [`overview/`](./overview/) | High-level system architecture (start here) |
| [`state/`](./state/) | Five-layer state architecture, migration roadmap, post-mortems |
| [`stores/`](./stores/) | Zustand store inventory + authoring rules (Layer 3) |
| [`emergency/`](./emergency/) | Emergency-surface architecture (state refactor, five-layer migrations) |
| [`location/`](./location/) | Location truth, address management, location sheet, manual entry plans |
| [`map/`](./map/) | Map explore flow modularization, Metro/Mapbox routing |
| [`refactoring/`](./refactoring/) | Refactoring bible, phase plans, stash audit, tracking-sheet learnings |
| [`roadmap/`](./roadmap/) | Implementation + product execution roadmaps |
| [`ux/`](./ux/) | Focused UX passes, location guardrails, modal recovery |

---

## Anchor documents

| Doc | Role |
|---|---|
| [`overview/ARCHITECTURE.md`](./overview/ARCHITECTURE.md) | System overview (v2.0, 5-layer) |
| [`state/GOLD_STANDARD_STATE_ROADMAP.md`](./state/GOLD_STANDARD_STATE_ROADMAP.md) | Migration phases 1–7, completion record |
| [`stores/STORES_README.md`](./stores/STORES_README.md) | Layer 3 inventory (22 stores) |
| [`refactoring/REFACTORING_BIBLE.md`](./refactoring/REFACTORING_BIBLE.md) | Refactoring patterns and guidelines |
| [`refactoring/TRACKING_SHEET_LEARNINGS.md`](./refactoring/TRACKING_SHEET_LEARNINGS.md) | Defect classes, heuristics, recurring pitfalls |
| [`emergency/EMERGENCY_STATE_REFACTOR.md`](./emergency/EMERGENCY_STATE_REFACTOR.md) | Emergency flow state architecture |
| [`emergency/EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md`](./emergency/EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md) | Five-layer reference implementation |
| [`location/LOCATION_ADDRESS_MANAGEMENT_ARCHITECTURE.md`](./location/LOCATION_ADDRESS_MANAGEMENT_ARCHITECTURE.md) | Location truth architecture |

---

## Topics covered

- Five-layer state architecture (Supabase → TanStack Query → Zustand → XState → Jotai)
- Component composition (Orchestrator → StageBase → Screen Model → leaves)
- Service layer design
- Realtime data flow (L1 → L2 invalidation pattern)
- Store / hook / context separation
- Map and emergency surface architecture
- Location truth + address management
- Refactor passes and migration phases

# Emergency Architecture Guide

> Status: Active refactor guide
> Scope: `welcome`, `/map`, and the modern stack-screen architecture surfaces
> Purpose: keep code structure, docs, and implementation order aligned as the new emergency flow grows

## Read Order

1. [WELCOME_AND_MAP_CODE_STRUCTURE_V1.md](./WELCOME_AND_MAP_CODE_STRUCTURE_V1.md)
2. [MAP_STATE_STRATEGY_V1.md](./MAP_STATE_STRATEGY_V1.md)
3. [MAP_SHEET_IMPLEMENTATION_NOTES_V1.md](./MAP_SHEET_IMPLEMENTATION_NOTES_V1.md)
4. [MAP_SHEET_PARITY_TASKLIST_V1.md](./MAP_SHEET_PARITY_TASKLIST_V1.md)
5. [REFACTOR_SEQUENCE_V1.md](./REFACTOR_SEQUENCE_V1.md)
6. [MAP_RUNTIME_PASS_PLAN_V1.md](./MAP_RUNTIME_PASS_PLAN_V1.md)
7. [MAP_MINI_PROFILE_HANDOFF_V1.md](./MAP_MINI_PROFILE_HANDOFF_V1.md)
8. [STACK_SURFACE_STANDARDIZATION_V1.md](./STACK_SURFACE_STANDARDIZATION_V1.md)
9. [PROFILE_STACK_PASS_PLAN_V1.md](./PROFILE_STACK_PASS_PLAN_V1.md)
10. [../../../audit/PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../../../audit/PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
11. [SETTINGS_STACK_PASS_PLAN_V1.md](./SETTINGS_STACK_PASS_PLAN_V1.md)
12. [../../../audit/SETTINGS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../../../audit/SETTINGS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
13. [MEDICAL_PROFILE_STACK_PASS_PLAN_V1.md](./MEDICAL_PROFILE_STACK_PASS_PLAN_V1.md)
14. [../../../audit/MEDICAL_PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../../../audit/MEDICAL_PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
15. [INSURANCE_STACK_PASS_PLAN_V1.md](./INSURANCE_STACK_PASS_PLAN_V1.md)
16. [../../../audit/INSURANCE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../../../audit/INSURANCE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
17. [SEARCH_STACK_PASS_PLAN_V1.md](./SEARCH_STACK_PASS_PLAN_V1.md)
18. [../../../audit/SEARCH_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../../../audit/SEARCH_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
19. [STACK_SCREENS_PASS_V1.md](./STACK_SCREENS_PASS_V1.md)
20. [../MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](../MAP_SCREEN_IMPLEMENTATION_RULES_V1.md)
21. [../../../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md](../../../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md)

## Why This Subtree Exists

The emergency flow is no longer a small feature with page-by-page routing.

It now has:

- one welcome system with many device variants
- one map-first app surface
- one growing state model behind `/map`

That means implementation guidance needs its own readable structure, not scattered notes.

## Working Rule

Before changing file layout or adding new state layers:

- read the structure guide
- read the state strategy
- follow the refactor sequence

This subtree is the planning layer. The runtime contract still lives in:

- [../MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](../MAP_SCREEN_IMPLEMENTATION_RULES_V1.md)
- [../EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md](../EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md)
- [MAP_SHEET_IMPLEMENTATION_NOTES_V1.md](./MAP_SHEET_IMPLEMENTATION_NOTES_V1.md)

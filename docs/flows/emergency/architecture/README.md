# Emergency Architecture Guide

> Status: Active refactor guide
> Scope: `welcome` and `/map`
> Purpose: keep code structure, docs, and implementation order aligned as the new emergency flow grows

## Read Order

1. [WELCOME_AND_MAP_CODE_STRUCTURE_V1.md](./WELCOME_AND_MAP_CODE_STRUCTURE_V1.md)
2. [MAP_STATE_STRATEGY_V1.md](./MAP_STATE_STRATEGY_V1.md)
3. [MODAL_TO_SHEET_SWAP_V1.md](./MODAL_TO_SHEET_SWAP_V1.md)
4. [MODAL_TO_SHEET_REFINEMENT_TRACKER_V1.md](./MODAL_TO_SHEET_REFINEMENT_TRACKER_V1.md)
5. [MAP_SHEET_PARITY_TASKLIST_V1.md](./MAP_SHEET_PARITY_TASKLIST_V1.md)
6. [REFACTOR_SEQUENCE_V1.md](./REFACTOR_SEQUENCE_V1.md)
7. [../MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](../MAP_SCREEN_IMPLEMENTATION_RULES_V1.md)
8. [../../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md](../../research/APPLE_MAPS_IPHONE_UI_REFERENCE.md)

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

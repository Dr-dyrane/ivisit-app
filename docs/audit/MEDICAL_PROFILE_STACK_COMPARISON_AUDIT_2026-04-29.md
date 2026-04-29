# Medical Profile Stack Comparison Audit (2026-04-29)

Status: Baseline captured before implementation

## Scope

`MedicalProfileScreen` compared against the current stack references:

- `Payment`
- `Emergency Contacts`
- `Profile`
- `Settings`

## Baseline Findings

1. `screens/MedicalProfileScreen.jsx` was still a route-owned monolith.
   It owned shell, animation, header wiring, FAB registration, local edit state, and every field render in one file.
2. The edit form was always open inline.
   The page never resolved to a readable summary surface first, so mobile started in edit mode and wide screens just stretched the same compact form.
3. Save behavior was tied to a route-level FAB instead of a bounded side-effect surface.
   That made the page harder to reason about and kept the health-information route outside the newer stack-screen modal contract.
4. The data hook treated save like first-load.
   `useMedicalProfile()` set `isLoading` during updates, which is acceptable for an inline editor but not for a modal workflow that should keep the summary surface stable underneath.
5. There was no wide-screen dead-space strategy.
   Unlike payment, emergency contacts, profile, and settings, the screen had no left context island, no right action/status island, and no centered/bounded edit surface.

## Required Outcome

- thin route
- dedicated screen model
- stage base using shared stack viewport config
- readable summary blades on the page
- editor moved into `InputModal`
- compact stays simple
- wide screens use context/action islands instead of stretching the form

## Guardrail Notes

- keep copy short and task-led
- do not reintroduce all-caps section headers
- keep visible type at `700` max
- keep the edit modal bounded and centered on MD+/desktop variants
- preserve truthful fallback behavior when remote profile sync fails but local save succeeds

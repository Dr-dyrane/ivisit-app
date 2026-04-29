# Medical Profile Stack Pass Plan (v1)

Status: Implemented on 2026-04-29; retained as pre-pass reference

## Intent

Bring `/medical-profile` into the same stack-screen family as payment, emergency contacts, profile, and settings.

## Target Architecture

- `screens/MedicalProfileScreen.jsx` as a thin route
- `components/medicalProfile/MedicalProfileScreenOrchestrator.jsx`
- `components/medicalProfile/MedicalProfileStageBase.jsx`
- `components/medicalProfile/MedicalProfileWideLayout.jsx`
- `hooks/medicalProfile/useMedicalProfileScreenModel.js`
- `components/medicalProfile/MedicalProfileEditorModal.jsx`

## Primary Change

The screen should no longer render the health-information form inline by default.

The page becomes:

- a readable summary surface first
- one primary edit action
- a responsive modal editor for actual form work

## Preserved Behavior

- medical profile still loads from the existing service/hook path
- blood type, allergies, medications, conditions, surgeries, and notes all remain editable
- updates still persist through the existing `medicalProfileService`
- local fallback remains usable when backend sync is unavailable

## Additional Hardening

- separate first-load state from save-pending state in `useMedicalProfile`
- surface truthful local-save fallback messaging when remote sync fails
- keep mobile simple and avoid extra explanatory hero blocks
- keep the editor bounded by shared stack viewport modal config

## State Management Posture

This pass is not the five-layer medical-profile migration.

- current state lane remains `useMedicalProfile` + `medicalProfileService`
- Query, Zustand, XState, and Jotai are still deferred for a later architecture pass
- this wave is responsible for UI quality, modular screen anatomy, and honest documentation about that remaining gap

## Verification Target

- page loads as summary, not editor
- edit modal opens from mobile and wide-screen surfaces
- save success closes modal and updates summary
- local-save fallback closes modal and keeps updated summary visible
- no FAB dependency remains on the route

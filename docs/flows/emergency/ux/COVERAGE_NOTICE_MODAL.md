# Coverage Notice Modal

## Purpose
Show a calm, empathetic notice when nearby hospital coverage is weak, while still guiding users to available nearby hospitals and emergency calling.

## Trigger Rules
- `none`: nearby **iVisit-verified** hospital count is `0`.
- `poor`: nearby **iVisit-verified** hospital count is `< 3` (recommended threshold).
- `good`: nearby **iVisit-verified** hospital count is `>= 3` (no modal).

Note:
- Nearby non-verified hospitals are still shown to users for distance + direct phone calls.
- They do not count toward coverage quality for this notice.

The modal is shown when:
- Emergency screen is focused.
- Map has finished initial loading.
- No active ambulance trip or bed booking.
- Coverage is `none` or `poor`.
- User has not opted out on this device.

## Local Preference (Device Only)
- AsyncStorage key: `@ivisit/coverage_disclaimer_opt_out_v1`
- Value `1` means "Don't remind me again on this device".
- Preference is intentionally local (not stored in DB).

## UX Intent
- Calm and supportive tone.
- Borderless bottom-sheet style.
- Primary action: continue to nearby hospitals.
- Secondary action: call `911`.

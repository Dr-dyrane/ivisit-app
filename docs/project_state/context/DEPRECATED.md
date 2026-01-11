# Deprecated Items & Patterns

This document tracks items that have been removed or deprecated from the codebase to maintain a clean architecture.

## 1. Folders & Files Removed
| Item | Type | Date | Reason | Replacement |
|------|------|------|--------|-------------|
| `api/` | Folder | 2026-01-09 | Redundant wrapper layer. (Folder now exists as an empty/unused migration artifact.) | Direct usage of `services/` layer. |
| `hooks/mutations/` | Folder | 2026-01-09 | Poor organization. | Reorganized into `hooks/auth/`, `hooks/user/`, `hooks/emergency/`. |
| `hooks/useUpdateUser.js` | File | 2026-01-09 | Redundant/Legacy. | `hooks/user/useUpdateProfile.js` |
| `hooks/useEmergencyContacts.js` | File Location | 2026-01-09 | Moved for modularity. | `hooks/emergency/useEmergencyContacts.js` |
| `hooks/useMedicalProfile.js` | File Location | 2026-01-09 | Moved for modularity. | `hooks/user/useMedicalProfile.js` |
| `hooks/useProfileCompletion.js` | File Location | 2026-01-09 | Moved for modularity. | `hooks/auth/useProfileCompletion.js` |

## 2. Deprecated Patterns
| Pattern | Status | Reason | New Pattern |
|---------|--------|--------|-------------|
| **UI calling Services directly** | ⛔ FORBIDDEN | Breaks separation of concerns; harder to test/mock state. | **UI -> Custom Hook -> Service**. UI should only see data/loading/error/functions. |
| **`api.get(...)` wrappers** | ⛔ FORBIDDEN | Unnecessary abstraction over Supabase client. | Services call `supabase` client directly. |
| **Mock Data in Components** | ⚠️ AVOID | Hard to maintain. | Move mock logic to Services or use real DB calls. |

## 3. Architecture Evolution
- **Pre-2026**: Mixed architecture with `api/` wrappers and direct service calls.
- **Jan 2026**: Strict **Service -> Hook -> UI** flow enforced. `api/` wrappers deprecated (folder may remain as an empty migration artifact).

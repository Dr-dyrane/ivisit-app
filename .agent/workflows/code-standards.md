---
description: Code Standards and Anti-Surprise Patterns
---

To avoid "is not a function" (TypeError) and "undefined" surprises, follow these rules:

## 1. Hooks & Services
- **ALWAYS use Named Exports**. Avoid `export default`.
- **Reason**: Named exports provide better static analysis, preventing the issue where a component tries to import a default export with `{ braces }`.
- **Barrel Files**: Every hook directory should have an `index.js` exporting all hooks.

Example (Good):
```javascript
// hooks/auth/useExample.js
export const useExample = () => { ... }

// hooks/auth/index.js
export * from './useExample';
```

Example (Bad):
```javascript
// hooks/auth/useExample.js
const useExample = () => { ... }
export default useExample;
```

## 2. Component Imports
- **Prefer Barrel Imports**: Import from the folder level rather than specific files.
- **Reason**: Cleaner code and ensures we are using the standardized export API.

Example:
```javascript
import { useLogin, useSignUp } from "../../hooks/auth";
```

## 3. Naming Consistency
- Match the hook name exactly with the filename (e.g., `useLogin.js` exports `useLogin`).
- Exception: In `hooks/auth/useSignup.js`, the export is `useSignUp` (camelCase) to match project conventions.

## 4. Deep Audit & Certification Protocol
Follow this 6-step protocol for all database fixes and module integrations to ensure absolute system integrity.

### 🔍 Step 1: Deep Audit & Evidence Gathering
Before any fix, perform a "Truth Search" on the remote state.
- **Tools**: Use `search_web` for news, `grep_search` or `run_command` (powershell) to find every occurrence of the table/RPC/policy in the consolidated schema.
- **Scope**: Identify Table Schema, RPC signatures, Triggers, and RLS Policies.
- **Deliverable**: A "Findings Log" summarizing current bugs vs. expected state.

### 📋 Step 2: Task Verification Metadata
Create a tracking file in `docs/archive/tasks/TASK_VERIFICATION_[NAME].md`.
- **Purpose**: Track the pipeline progress (Audit -> Migration -> Test -> Consolidation).
- **Rule**: Never start a fix without a tracker.

### 🛡️ Step 3: Certification Migration
Create a "Staged Evolution" migration file (e.g., `20260218XXXXXX_module_certification.sql`).
- **Standard**: Always implement **Non-Recursive RLS** using `public.get_current_user_role()` and `public.get_current_user_org_id()`.
- **Standard**: Force-align all relational columns to `UUID` (no Text-to-UUID operator mismatches).
- **Standard**: Include a `COMMIT;` and `NOTIFY pgrst, 'reload schema';` at the end.

### 🧪 Step 4: CRUD Verification Script
Create a JavaScript test script in `docs/archive/test-scripts/verify-[module]-crud.js`.
- **Rule**: Test every field update **separately**.
- **Rule**: Verify that RLS is actually blocking unauthorized access and allowing authorized access.

### 🏆 Step 5: Golden Master Integration
Fold the certified changes back into the **Primary Consolidated Schema** (`supabase/migrations/20260218060000_consolidated_schema.sql`).
- **Rule**: Remove redundant/duplicate definitions.
- **Rule**: The Golden Master should be the absolute, single source of truth for the entire environment.

### 🧹 Step 6: Zero-Litter Maintenance
Clean the root and migration folders immediately after success.
- **Rule**: Move all test scripts and task trackers to `docs/archive/`.
- **Rule**: Purge temporary migration files from `supabase/migrations/` once they are folded into the Master.
- **Rule**: Sync changes to `ivisit-console` using `sync_to_console.js`.

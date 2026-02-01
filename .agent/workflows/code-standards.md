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

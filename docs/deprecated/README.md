# 📁 Deprecated Code Reference

> **Purpose:** This folder contains backup copies of code that has been refactored or replaced.  
> **Use Case:** Reference these files if something breaks during migration to understand original behavior.

---

## ⚠️ Warning

**DO NOT import or use any code from this folder in production!**

These files are documentation only and may contain outdated patterns.

---

## Contents

| File | Original Location | Replaced By | Status |
|------|-------------------|-------------|--------|
| `userStore.js.md` | `store/userStore.js` | `services/authService.js` | 🔄 Pending |
| `imageStore.js.md` | `store/imageStore.js` | `services/imageService.js` | 🔄 Pending |

---

## When to Reference

1. **Service method not working as expected** → Check original store implementation
2. **Edge case not handled** → See how original handled it
3. **Error format mismatch** → Compare error structures
4. **Token/session logic issues** → Review original flow

---

## Migration Checklist

Before deleting original store files, verify:

- [ ] All service methods match original functionality
- [ ] All error codes are preserved
- [ ] Token generation/storage works identically
- [ ] All screens/components still function
- [ ] All edge cases are handled


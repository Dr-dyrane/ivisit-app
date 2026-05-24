---
status: living
owner: product
last_updated: 2026-05-15
---

# Location Hardening Passes

**Owner:** `/map` location architecture  
**Parent Dossier:** [DOSSIER_LOCATION_HARDENING_V1.md](../DOSSIER_LOCATION_HARDENING_V1.md)

---

## Pass Order & Status

| Order | Pass | File | Status | Risk | Dependencies | Priority |
|-------|------|------|--------|------|--------------|----------|
| 0 | Architecture Review | [LOC-0_ARCHITECTURE_REVIEW.md](./LOC-0_ARCHITECTURE_REVIEW.md) | âœ… Complete | â€” | â€” | Reference |
| ~~1~~ | ~~Places Rendering~~ | ~~[LOC-5_PLACES_RENDERING.md](./LOC-5_PLACES_RENDERING.md)~~ | âšª **SKIPPED** | â€” | â€” | Already implemented via `hospitalPriorityScore()` |
| 1 | Cache Determinism | [LOC-4_CACHE_DETERMINISM.md](./LOC-4_CACHE_DETERMINISM.md) | âœ… Complete | ðŸ”´ High | None | **HIGH** - Real cache collision risk |
| 2 | Manual Address | [LOC-2_MANUAL_ADDRESS.md](./LOC-2_MANUAL_ADDRESS.md) | âœ… Complete | ðŸ”´ High | None | **MEDIUM** - Gap before truth layer |
| 3 | Pickup Sources | [LOC-1_PICKUP_SOURCES.md](./LOC-1_PICKUP_SOURCES.md) | âœ… Complete | ðŸ”´ High | None | **MEDIUM** - Enum mismatch exists |
| 4 | Location Recovery | [LOC-3_LOCATION_RECOVERY.md](./LOC-3_LOCATION_RECOVERY.md) | âœ… Complete | ðŸŸ¡ Medium | LOC-1 | **LOW** - Generic errors work |
| 5 | Runtime Validation | [LOC-6_RUNTIME_VALIDATION.md](./LOC-6_RUNTIME_VALIDATION.md) | âœ… Complete | ðŸŸ¡ Medium | LOC-1, LOC-2 | **LOW** - Nice to have |

**Status Legend:**
- âœ… Complete â€” Done, verified
- ðŸŸ¢ Ready â€” Ready to start
- ðŸ”µ In Progress â€” Currently being implemented
- ðŸŸ¡ Pending â€” Waiting for dependencies
- âšª Draft / Skipped â€” Not needed or deferred
- ðŸ”´ Rolled Back â€” Reverted due to issues

**Live Code Audit:** [LIVE_CODE_AUDIT.md](../LIVE_CODE_AUDIT.md) â€” Verified actual implementation status

---

## Pass Document Template

Create new pass documents from the template:

```bash
cp passes/PASS_TEMPLATE.md passes/PASS_LOC{N}_{SHORT_NAME}.md
```

**Template includes:**
- Pass summary and goals
- Files modified table
- Feature flag pattern
- Verification checklist
- Rollback information
- Decision log
- Post-pass review section

---

## Git Checkpoint Protocol

From [DOSSIER_LOCATION_HARDENING_V1.md](../DOSSIER_LOCATION_HARDENING_V1.md):

### Before Starting Each Pass

```bash
# 1. Record baseline hash
git log --oneline -1 > passes/LOC-{N}-BASELINE.txt

# 2. Create pass-specific backup branch
git checkout -b backup/loc-{N}-{short-desc}-YYYY-MM-DD

# 3. Return to working branch
git checkout feat/grand-refactor

# 4. Create pass document
cp passes/PASS_TEMPLATE.md passes/PASS_LOC{N}_{SHORT_NAME}.md
```

### During Pass: Reversible Patterns

1. **Feature Flags**: Add `ENABLE_LOC_HARDENING_LOC{N} = false` (default off)
2. **Dual-Path Functions**: New code behind flag, existing code as default
3. **Additive Only**: Never remove/change existing enum values or contracts

### After Pass Commit

```bash
# Commit with structured message
git commit -m "refactor(location): LOC-N â€” Description

- Change 1
- Change 2
- Feature flag: ENABLE_LOC_HARDENING_LOC{N} = false (default)

Verification:
- [x] Flag off: original behavior preserved
- [x] Flag on: new behavior working

Rollback:
- git revert <hash>
- or: set ENABLE_LOC_HARDENING_LOC{N} = false"
```

---

## Rollback Procedures

### Revert Single Pass
```bash
# Find commit
git log --oneline --grep="LOC-N"

# Revert
git revert <hash> --no-edit
```

### Emergency Disable (Faster)
```bash
# Edit file, set flag to false
ENABLE_LOC_HARDENING_LOC{N} = false

# Commit
git commit -m "hotfix(location): Disable LOC-N due to issue"
```

### Complete Rollback to Pre-Hardening
```bash
# Use backup branch
git checkout backup/loc-1-pickup-sources-YYYY-MM-DD

# Or reset to baseline
git reset --hard <baseline-hash>
```

---

## Update Rule

Before starting a pass:
- Mark its status as `ðŸ”µ In Progress` in this README
- Record baseline hash in `passes/LOC-{N}-BASELINE.txt`

After finishing a pass:
- Update status to `âœ… Complete` or `ðŸ”´ Rolled Back`
- Add changed files, decisions, verification results
- Add rollback notes if issues discovered
- Update [DOSSIER_LOCATION_HARDENING_V1.md](../DOSSIER_LOCATION_HARDENING_V1.md) pass table

**Do not start a later pass if an earlier pass still has unresolved architecture questions.**

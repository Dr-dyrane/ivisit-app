---
status: living
owner: product
last_updated: 2026-05-24
---

# Location Truth Architecture

**Owner:** `/map` location architecture  
**Status:** Active implementation dossier  
**Scope:** Canonical pickup truth, provider discovery determinism, location hardening

---

## Quick Reference

| Document | Purpose |
|----------|---------|
| **[DOSSIER_LOCATION_HARDENING_V1.md](./DOSSIER_LOCATION_HARDENING_V1.md)** | Master dossier — **start here** |
| [audits/](./audits/) | Pre-implementation audits |
| [passes/](./passes/) | Implementation records |
| [passes/PASS_TEMPLATE.md](./passes/PASS_TEMPLATE.md) | Pass template with code guardrails |

---

## Directory Structure

```
location-truth/
â”œâ”€â”€ README.md                          ← You are here
â”œâ”€â”€ DOSSIER_LOCATION_HARDENING_V1.md   ← Master dossier
â”œâ”€â”€ audits/                            ← Pre-implementation audits
â”‚   â”œâ”€â”€ AUDIT_PICKUP_SOURCES.md       ← LOC-1
â”‚   â”œâ”€â”€ AUDIT_MANUAL_ADDRESS.md       ← LOC-2
â”‚   â”œâ”€â”€ AUDIT_LOCATION_RECOVERY.md     ← LOC-3
â”‚   â”œâ”€â”€ AUDIT_CACHE_DETERMINISM.md   ← LOC-4
â”‚   â”œâ”€â”€ AUDIT_RUNTIME_VALIDATION.md  ← LOC-6
â”‚   â”œâ”€â”€ AUDIT_LOCATION_TRUTH_LAYER.md
â”‚   â”œâ”€â”€ AUDIT_GEOCODING_LAYER.md
â”‚   â””â”€â”€ AUDIT_PROVIDER_DISCOVERY_LAYER.md
â””â”€â”€ passes/                            ← Implementation records
    â”œâ”€â”€ README.md                      ← Pass status tracker
    â”œâ”€â”€ PASS_TEMPLATE.md               ← Template
    â”œâ”€â”€ LOC-0_ARCHITECTURE_REVIEW.md  ← ✅ Complete
    â”œâ”€â”€ LOC-1_PICKUP_SOURCES.md       ← ✅ Complete
    â”œâ”€â”€ LOC-2_MANUAL_ADDRESS.md       ← ✅ Complete
    â”œâ”€â”€ LOC-3_LOCATION_RECOVERY.md     ← ✅ Complete
    â”œâ”€â”€ LOC-4_CACHE_DETERMINISM.md   ← ✅ Complete
    â””â”€â”€ LOC-6_RUNTIME_VALIDATION.md   ← ✅ Complete
```

---

## The Five Passes (LOC-1 through LOC-6, LOC-5 Skipped)

| Pass | Name | Status | Risk | Priority |
|------|------|--------|------|----------|
| LOC-4 | Cache Determinism | ✅ Complete | 🔴 High | **First** — Real cache collision risk |
| LOC-2 | Manual Address | ✅ Complete | 🔴 High | Entry validation gap |
| LOC-1 | Pickup Sources | ✅ Complete | 🔴 High | Enum mismatch |
| LOC-3 | Location Recovery | ✅ Complete | 🟡 Medium | Generic errors work |
| ~~LOC-5~~ | ~~Places Rendering~~ | âšª **SKIPPED** | — | Already implemented |
| LOC-6 | Runtime Validation | ✅ Complete | 🟡 Medium | Nice to have |

> **Reconciliation 2026-05-24:** Status synced with `passes/README.md` (the authoritative tracker). Verified during full sweep — see `docs/audit/VERIFICATION_LOG_2026-05-24.md` § F8.

See [DOSSIER_LOCATION_HARDENING_V1.md](./DOSSIER_LOCATION_HARDENING_V1.md) for details.

---

## Document Conventions

### Naming
- `DOSSIER_*.md` — Master implementation plan with all passes
- `AUDIT_*.md` — Pre-implementation audit findings (in `audits/`)
- `PASS_*.md` — Post-implementation record (in `passes/`)
- `*_LAYER.md` — Layer analysis documents (supporting)

### Document Template
Each document must include:
```
**Date:** YYYY-MM-DD
**Owner:** Component/feature owner
**Status:** Status indicator
**Scope:** What this covers
**Related:** Cross-references
```

---

## Related Documentation

- [MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](../MAP_SCREEN_IMPLEMENTATION_RULES_V1.md) — Map flow contract
- [REFACTORING_GUARDRAILS.md](../../../../REFACTORING_GUARDRAILS.md) — Architecture rules
- [LOCATION_ADDRESS_MANAGEMENT_ARCHITECTURE.md](../../../architecture/location/LOCATION_ADDRESS_MANAGEMENT_ARCHITECTURE.md) — Location sheet architecture

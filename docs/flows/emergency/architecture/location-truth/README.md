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
├── README.md                          ← You are here
├── DOSSIER_LOCATION_HARDENING_V1.md   ← Master dossier
├── audits/                            ← Pre-implementation audits
│   ├── AUDIT_PICKUP_SOURCES.md       ← LOC-1
│   ├── AUDIT_MANUAL_ADDRESS.md       ← LOC-2
│   ├── AUDIT_LOCATION_RECOVERY.md     ← LOC-3
│   ├── AUDIT_CACHE_DETERMINISM.md   ← LOC-4
│   ├── AUDIT_RUNTIME_VALIDATION.md  ← LOC-6
│   ├── AUDIT_LOCATION_TRUTH_LAYER.md
│   ├── AUDIT_GEOCODING_LAYER.md
│   └── AUDIT_PROVIDER_DISCOVERY_LAYER.md
└── passes/                            ← Implementation records
    ├── README.md                      ← Pass status tracker
    ├── PASS_TEMPLATE.md               ← Template
    ├── LOC-0_ARCHITECTURE_REVIEW.md  ← ✅ Complete
    ├── LOC-1_PICKUP_SOURCES.md       ← 🟡 Pending
    ├── LOC-2_MANUAL_ADDRESS.md       ← 🟡 Pending
    ├── LOC-3_LOCATION_RECOVERY.md     ← 🟡 Pending
    ├── LOC-4_CACHE_DETERMINISM.md   ← 🟡 Pending
    └── LOC-6_RUNTIME_VALIDATION.md   ← 🟡 Pending
```

---

## The Five Passes (LOC-1 through LOC-6, LOC-5 Skipped)

| Pass | Name | Status | Risk | Priority |
|------|------|--------|------|----------|
| LOC-4 | Cache Determinism | 🟡 Ready | 🔴 High | **First** — Real cache collision risk |
| LOC-2 | Manual Address | 🟡 Ready | 🔴 High | Entry validation gap |
| LOC-1 | Pickup Sources | 🟡 Ready | � High | Enum mismatch |
| LOC-3 | Location Recovery | 🟡 Ready | � Medium | Generic errors work |
| ~~LOC-5~~ | ~~Places Rendering~~ | ⚪ **SKIPPED** | — | Already implemented |
| LOC-6 | Runtime Validation | 🟡 Ready | 🟡 Medium | Nice to have |

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

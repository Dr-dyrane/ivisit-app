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
| **[DOSSIER_LOCATION_HARDENING_V1.md](./DOSSIER_LOCATION_HARDENING_V1.md)** | Master dossier â€” **start here** |
| [audits/](./audits/) | Pre-implementation audits |
| [passes/](./passes/) | Implementation records |
| [passes/PASS_TEMPLATE.md](./passes/PASS_TEMPLATE.md) | Pass template with code guardrails |

---

## Directory Structure

```
location-truth/
â”œâ”€â”€ README.md                          â† You are here
â”œâ”€â”€ DOSSIER_LOCATION_HARDENING_V1.md   â† Master dossier
â”œâ”€â”€ audits/                            â† Pre-implementation audits
â”‚   â”œâ”€â”€ AUDIT_PICKUP_SOURCES.md       â† LOC-1
â”‚   â”œâ”€â”€ AUDIT_MANUAL_ADDRESS.md       â† LOC-2
â”‚   â”œâ”€â”€ AUDIT_LOCATION_RECOVERY.md     â† LOC-3
â”‚   â”œâ”€â”€ AUDIT_CACHE_DETERMINISM.md   â† LOC-4
â”‚   â”œâ”€â”€ AUDIT_RUNTIME_VALIDATION.md  â† LOC-6
â”‚   â”œâ”€â”€ AUDIT_LOCATION_TRUTH_LAYER.md
â”‚   â”œâ”€â”€ AUDIT_GEOCODING_LAYER.md
â”‚   â””â”€â”€ AUDIT_PROVIDER_DISCOVERY_LAYER.md
â””â”€â”€ passes/                            â† Implementation records
    â”œâ”€â”€ README.md                      â† Pass status tracker
    â”œâ”€â”€ PASS_TEMPLATE.md               â† Template
    â”œâ”€â”€ LOC-0_ARCHITECTURE_REVIEW.md  â† âœ… Complete
    â”œâ”€â”€ LOC-1_PICKUP_SOURCES.md       â† âœ… Complete
    â”œâ”€â”€ LOC-2_MANUAL_ADDRESS.md       â† âœ… Complete
    â”œâ”€â”€ LOC-3_LOCATION_RECOVERY.md     â† âœ… Complete
    â”œâ”€â”€ LOC-4_CACHE_DETERMINISM.md   â† âœ… Complete
    â””â”€â”€ LOC-6_RUNTIME_VALIDATION.md   â† âœ… Complete
```

---

## The Five Passes (LOC-1 through LOC-6, LOC-5 Skipped)

| Pass | Name | Status | Risk | Priority |
|------|------|--------|------|----------|
| LOC-4 | Cache Determinism | âœ… Complete | ðŸ”´ High | **First** â€” Real cache collision risk |
| LOC-2 | Manual Address | âœ… Complete | ðŸ”´ High | Entry validation gap |
| LOC-1 | Pickup Sources | âœ… Complete | ðŸ”´ High | Enum mismatch |
| LOC-3 | Location Recovery | âœ… Complete | ðŸŸ¡ Medium | Generic errors work |
| ~~LOC-5~~ | ~~Places Rendering~~ | âšª **SKIPPED** | â€” | Already implemented |
| LOC-6 | Runtime Validation | âœ… Complete | ðŸŸ¡ Medium | Nice to have |

> **Reconciliation 2026-05-24:** Status synced with `passes/README.md` (the authoritative tracker). Verified during full sweep â€” see `docs/audit/VERIFICATION_LOG_2026-05-24.md` Â§ F8.

See [DOSSIER_LOCATION_HARDENING_V1.md](./DOSSIER_LOCATION_HARDENING_V1.md) for details.

---

## Document Conventions

### Naming
- `DOSSIER_*.md` â€” Master implementation plan with all passes
- `AUDIT_*.md` â€” Pre-implementation audit findings (in `audits/`)
- `PASS_*.md` â€” Post-implementation record (in `passes/`)
- `*_LAYER.md` â€” Layer analysis documents (supporting)

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

- [MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](../MAP_SCREEN_IMPLEMENTATION_RULES_V1.md) â€” Map flow contract
- [REFACTORING_GUARDRAILS.md](../../../../REFACTORING_GUARDRAILS.md) â€” Architecture rules
- [LOCATION_ADDRESS_MANAGEMENT_ARCHITECTURE.md](../../../architecture/location/LOCATION_ADDRESS_MANAGEMENT_ARCHITECTURE.md) â€” Location sheet architecture

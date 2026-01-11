# 📚 iVisit Documentation Index

> **Last Updated:** 2026-01-11

---

## 📁 Folder Structure

```
docs/
  ├── INDEX.md                    # This file - documentation overview
  │
  ├── emergency/                  # Emergency refactor + UX docs
  │   ├── refactor/
  │   │   ├── EMERGENCY_REFACTOR_MANIFEST.md
  │   │   ├── EMERGENCY_SCREEN_REFACTOR_PLAN.md
  │   │   ├── BOTTOM_SHEET_MAP_REFACTOR_PLAN.md
  │   │   └── BOTTOM_SHEET_MAP_SUMMARY.md
  │   ├── ux/
  │   │   ├── EMERGENCY_SCREEN_UX_REDESIGN.md
  │   │   └── EMERGENCY_UI_IMPROVEMENTS.md
  │   └── checklists/
  │       └── POST_BOOKING_UI_CHECKLIST.md
  │
  ├── architecture/               # Architecture & refactoring plans
  │   ├── overview/
  │   │   └── ARCHITECTURE.md
  │   ├── auth/
  │   │   └── AUTH_REFACTOR_PLAN.md
  │   └── roadmap/
  │       └── PRODUCT_EXECUTION_ROADMAP.md
  │
  ├── deprecated/                 # Backup of replaced code
  │   ├── README.md               # Guide for deprecated code
  │   ├── userStore.js.md         # Original userStore (parts 1-3)
  │   └── imageStore.js.md        # Original imageStore
  │
  ├── archive/                    # Archived historical docs
  │   └── legacy-web/
  │       └── IVISIT_COMPREHENSIVE_DOCUMENTATION.md
  │
  ├── flows/
  │   ├── auth/
  │   │   ├── login.md
  │   │   ├── register.md
  │   │   └── REGISTRATION_UI_UX.md
  │
  │   └── emergency/
  │       └── ambulance_and_bed_booking.md
  │
  ├── onboarding/
  │   └── Technical.md
  │
  ├── product_design/
  │   ├── ui_ux_bible.md
  │   └── SCREEN_CONSISTENCY_GUIDE.md
  │
  └── project_state/
      ├── CONTEXT_REVIEW.md
      ├── QUICK_START.md
      ├── repo.md
      └── context/
          ├── CURRENT_STATE.md
          └── DEPRECATED.md
```

---

## 🎯 Quick Navigation

### Currently Active Work

| Document | Description | Status |
|----------|-------------|--------|
| [AUTH_REFACTOR_PLAN.md](./architecture/auth/AUTH_REFACTOR_PLAN.md) | Authentication layer refactoring | 🟡 In Progress |
| [EMERGENCY_REFACTOR_MANIFEST.md](./emergency/refactor/EMERGENCY_REFACTOR_MANIFEST.md) | EmergencyBottomSheet refactor feature manifest | 🟡 In Progress |

### Architecture

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./architecture/overview/ARCHITECTURE.md) | Overall app architecture & layers |
| [PRODUCT_EXECUTION_ROADMAP.md](./architecture/roadmap/PRODUCT_EXECUTION_ROADMAP.md) | Product execution roadmap |
| [CONTEXT_REVIEW.md](./project_state/CONTEXT_REVIEW.md) | Review of all context providers |
| [Technical.md](./onboarding/Technical.md) | Technical specifications |

### Authentication & Flows

| Document | Description |
|----------|-------------|
| [login.md](./flows/auth/login.md) | Login flow & components |
| [register.md](./flows/auth/register.md) | Registration flow |
| [REGISTRATION_UI_UX.md](./flows/auth/REGISTRATION_UI_UX.md) | Registration UI/UX details |
| [ambulance_and_bed_booking.md](./flows/emergency/ambulance_and_bed_booking.md) | SOS user flow: ambulance request + bed reservation |

### Design & UX

| Document | Description |
|----------|-------------|
| [ui_ux_bible.md](./product_design/ui_ux_bible.md) | UI/UX design guidelines |
| [SCREEN_CONSISTENCY_GUIDE.md](./product_design/SCREEN_CONSISTENCY_GUIDE.md) | Screen consistency guide |

### Emergency (Refactor & UX)

| Document | Description |
|----------|-------------|
| [EMERGENCY_REFACTOR_MANIFEST.md](./emergency/refactor/EMERGENCY_REFACTOR_MANIFEST.md) | Feature tracking manifest for modularization |
| [EMERGENCY_SCREEN_REFACTOR_PLAN.md](./emergency/refactor/EMERGENCY_SCREEN_REFACTOR_PLAN.md) | EmergencyScreen modularization plan |
| [BOTTOM_SHEET_MAP_REFACTOR_PLAN.md](./emergency/refactor/BOTTOM_SHEET_MAP_REFACTOR_PLAN.md) | EmergencyBottomSheet + FullScreenEmergencyMap modularization plan |
| [BOTTOM_SHEET_MAP_SUMMARY.md](./emergency/refactor/BOTTOM_SHEET_MAP_SUMMARY.md) | Implementation summary (phases completed) |
| [POST_BOOKING_UI_CHECKLIST.md](./emergency/checklists/POST_BOOKING_UI_CHECKLIST.md) | Post-booking UX + stability checklist |
| [EMERGENCY_SCREEN_UX_REDESIGN.md](./emergency/ux/EMERGENCY_SCREEN_UX_REDESIGN.md) | Apple Maps-style Emergency screen UX plan |
| [EMERGENCY_UI_IMPROVEMENTS.md](./emergency/ux/EMERGENCY_UI_IMPROVEMENTS.md) | Changes made + rationale for Emergency request UI |

### Reference

| Document | Description |
|----------|-------------|
| [repo.md](./project_state/repo.md) | Repository structure & commands |
| [QUICK_START.md](./project_state/QUICK_START.md) | Getting started guide |
| [IVISIT_COMPREHENSIVE_DOCUMENTATION.md](./archive/legacy-web/IVISIT_COMPREHENSIVE_DOCUMENTATION.md) | Archived (legacy web/PWA) documentation |

---

## 🔄 Migration & Refactoring

### Current Refactoring: Authentication Layer

**Goal:** Clean separation of concerns for auth logic

**Tracking Document:** [AUTH_REFACTOR_PLAN.md](./architecture/auth/AUTH_REFACTOR_PLAN.md)

**Progress:**
- [x] Documentation created
- [x] Old code backed up to `deprecated/`
- [ ] Database layer migration
- [ ] Service layer creation
- [ ] API layer updates
- [ ] Context layer updates
- [ ] Cleanup & deletion

---

## 📝 Documentation Guidelines

### When to Update

1. **New feature:** Add to relevant existing doc or create new one
2. **Refactoring:** Create plan in `architecture/`, backup old code in `deprecated/`
3. **Bug fix:** Update relevant flow documentation
4. **API change:** Update Technical.md and affected flow docs

### File Naming

- Architecture plans: `FEATURE_PLAN.md` (all caps with underscores)
- Flow docs: `feature.md` (lowercase)
- Guides: `QUICK_START.md` or `GUIDE_NAME.md`
- Deprecated: `originalFile.extension.md`

---

## 🚨 Important Notes

1. **Never import from `deprecated/`** - These are documentation only
2. **Keep AUTH_REFACTOR_PLAN.md updated** as work progresses
3. **Mark deprecated docs with date** when code is actually deleted

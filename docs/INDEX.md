# 📚 iVisit Documentation Index

> **Last Updated:** 2026-01-08

---

## 📁 Folder Structure

```
docs/
├── INDEX.md                    # This file - documentation overview
│
├── architecture/               # Architecture & refactoring plans
│   └── AUTH_REFACTOR_PLAN.md   # ⭐ Current: Auth layer refactoring
│
├── deprecated/                 # Backup of replaced code
│   ├── README.md               # Guide for deprecated code
│   ├── userStore.js.md         # Original userStore (parts 1-3)
│   └── imageStore.js.md        # Original imageStore
│
├── ARCHITECTURE.md             # Overall app architecture
├── CONTEXT_REVIEW.md           # Context providers review
├── Technical.md                # Technical specifications
│
├── login.md                    # Login flow documentation
├── register.md                 # Registration flow documentation
├── REGISTRATION_UI_UX.md       # Registration UI/UX specs
│
├── ui_ux_bible.md              # UI/UX design guidelines
├── repo.md                     # Repository overview
├── QUICK_START.md              # Getting started guide
│
└── IVISIT_COMPREHENSIVE_DOCUMENTATION.md  # Full app documentation
```

---

## 🎯 Quick Navigation

### Currently Active Work

| Document | Description | Status |
|----------|-------------|--------|
| [AUTH_REFACTOR_PLAN.md](./architecture/AUTH_REFACTOR_PLAN.md) | Authentication layer refactoring | 🟡 In Progress |

### Architecture

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Overall app architecture & layers |
| [CONTEXT_REVIEW.md](./CONTEXT_REVIEW.md) | Review of all context providers |
| [Technical.md](./Technical.md) | Technical specifications |

### Authentication & Flows

| Document | Description |
|----------|-------------|
| [login.md](./login.md) | Login flow & components |
| [register.md](./register.md) | Registration flow |
| [REGISTRATION_UI_UX.md](./REGISTRATION_UI_UX.md) | Registration UI/UX details |

### Design & UX

| Document | Description |
|----------|-------------|
| [ui_ux_bible.md](./ui_ux_bible.md) | UI/UX design guidelines |

### Reference

| Document | Description |
|----------|-------------|
| [repo.md](./repo.md) | Repository structure & commands |
| [QUICK_START.md](./QUICK_START.md) | Getting started guide |
| [IVISIT_COMPREHENSIVE_DOCUMENTATION.md](./IVISIT_COMPREHENSIVE_DOCUMENTATION.md) | Complete documentation |

---

## 🔄 Migration & Refactoring

### Current Refactoring: Authentication Layer

**Goal:** Clean separation of concerns for auth logic

**Tracking Document:** [AUTH_REFACTOR_PLAN.md](./architecture/AUTH_REFACTOR_PLAN.md)

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


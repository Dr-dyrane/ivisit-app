# 📚 iVisit Documentation Index

> **Last Updated:** 2026-02-17

---

## 📁 Folder Structure

```
docs/
  ├── INDEX.md                          # This file
  ├── MASTER_BLUEPRINT.md               # Complete DNA of iVisit
  ├── README.md                         # Quick intro
  │
  ├── emergency/                        # Emergency system docs
  │   ├── POST_PAYMENT_DISPATCH_FLOW.md # ⭐ Source of truth for post-payment
  │   ├── EMERGENCY_PAYMENT_FLOW_AUDIT_COMPLETE.md
  │   ├── flows/
  │   │   ├── EMERGENCY_VISIT_LIFECYCLE.md
  │   │   └── REQUEST_FLOW_AUDIT.md
  │   ├── refactor/
  │   │   └── EMERGENCY_REFACTOR_MANIFEST.md
  │   ├── ux/
  │   │   └── EMERGENCY_SCREEN_UX_REDESIGN.md
  │   └── checklists/
  │       └── POST_BOOKING_UI_CHECKLIST.md
  │
  ├── flows/                            # User flow documentation
  │   ├── auth/
  │   │   ├── login.md
  │   │   ├── register.md
  │   │   ├── REGISTRATION_UI_UX.md
  │   │   └── OAUTH_TROUBLESHOOTING.md
  │   ├── emergency/
  │   │   └── ambulance_and_bed_booking.md
  │   └── payment/
  │       └── payment.md                # Payment architecture & Stripe setup
  │
  ├── architecture/                     # Technical architecture
  │   ├── data-flow-audit.md            # Schema-to-state mapping
  │   ├── REFACTORING_BIBLE.md
  │   ├── TEMPORAL_DEAD_ZONE_FIXES.md
  │   ├── WEB_DASHBOARD_SPEC.md
  │   ├── WEB_MAPS_SETUP.md
  │   ├── overview/
  │   │   └── ARCHITECTURE.md
  │   └── roadmap/
  │       ├── PRODUCT_EXECUTION_ROADMAP.md
  │       └── IMPLEMENTATION_ROADMAP.md
  │
  ├── console/                          # Console/web dashboard
  │   ├── console-ui-theme-guide.md
  │   ├── dashboard-crud-plan.md
  │   ├── implementation-guide.md
  │   ├── quick-reference.md
  │   └── starter-template.md
  │
  ├── product_design/                   # Design & UX
  │   ├── ui_ux_bible.md
  │   ├── SCREEN_CONSISTENCY_GUIDE.md
  │   ├── FAB_ANALYSIS_REVIEW.md
  │   ├── GLOBAL_FAB_IMPLEMENTATION_PLAN.md
  │   └── manifesto.md
  │
  ├── project_state/                    # Project context & state
  │   ├── CONTEXT_REVIEW.md
  │   ├── QUICK_START.md
  │   ├── repo.md
  │   ├── baseline-documentation.md
  │   └── context/
  │       ├── CURRENT_STATE.md
  │       └── DEPRECATED.md
  │
  ├── onboarding/
  │   └── Technical.md
  │
  └── archive/                          # Historical / superseded docs
      ├── POST_PAYMENT_EMERGENCY_FLOW_PLAN.md  # Superseded by emergency/POST_PAYMENT_DISPATCH_FLOW.md
      ├── POST_PAYMENT_FLOW_ANALYSIS.md        # Superseded
      ├── legacy-web/
      │   └── IVISIT_COMPREHENSIVE_DOCUMENTATION.md
      ├── test-scripts/                 # One-off test scripts
      │   ├── test-debug-org-fees.js
      │   ├── test-payment-service.js
      │   ├── test-task2-functions.js
      │   ├── test-task3-parameters.js
      │   ├── test-task4-org-fees.js
      │   └── test-task5-payment-creation.js
      └── task-verifications/           # Task completion records
          ├── task2-verification.md
          ├── task3-verification.md
          ├── task4-verification.md
          ├── task5-verification.md
          ├── task6-verification.md
          └── task7-verification.md
```

---

## 🎯 Quick Navigation

### 🧬 Start Here

| Document | Description |
|:---|:---|
| **[MASTER_BLUEPRINT.md](./MASTER_BLUEPRINT.md)** | The complete DNA of iVisit |
| **[POST_PAYMENT_DISPATCH_FLOW.md](./emergency/POST_PAYMENT_DISPATCH_FLOW.md)** | ⭐ Source of truth for post-payment dispatch, RLS, triggers |
| **[EMERGENCY_PAYMENT_FLOW_AUDIT_COMPLETE.md](./emergency/EMERGENCY_PAYMENT_FLOW_AUDIT_COMPLETE.md)** | Payment flow from user through to ledger |

### Emergency System

| Document | Description |
|:---|:---|
| [POST_PAYMENT_DISPATCH_FLOW.md](./emergency/POST_PAYMENT_DISPATCH_FLOW.md) | **Dispatch, assignment, status lifecycle, known issues** |
| [EMERGENCY_PAYMENT_FLOW_AUDIT_COMPLETE.md](./emergency/EMERGENCY_PAYMENT_FLOW_AUDIT_COMPLETE.md) | Card vs Cash flows, notification triggers, wallet ledger |
| [EMERGENCY_VISIT_LIFECYCLE.md](./emergency/flows/EMERGENCY_VISIT_LIFECYCLE.md) | Status state machine, concurrency rules |
| [REQUEST_FLOW_AUDIT.md](./emergency/flows/REQUEST_FLOW_AUDIT.md) | Visit types, request state machine |
| [ambulance_and_bed_booking.md](./flows/emergency/ambulance_and_bed_booking.md) | SOS user flow: ambulance + bed reservation |

### Payment & Financial

| Document | Description |
|:---|:---|
| [payment.md](./flows/payment/payment.md) | Payment architecture, Stripe integration, fee distribution |
| [data-flow-audit.md](./architecture/data-flow-audit.md) | Schema-to-state mapping for all tables |

### Architecture

| Document | Description |
|:---|:---|
| [ARCHITECTURE.md](./architecture/overview/ARCHITECTURE.md) | Overall app architecture & layers |
| [data-flow-audit.md](./architecture/data-flow-audit.md) | Complete schema-to-frontend mapping |
| [PRODUCT_EXECUTION_ROADMAP.md](./architecture/roadmap/PRODUCT_EXECUTION_ROADMAP.md) | Product roadmap |
| [WEB_DASHBOARD_SPEC.md](./architecture/WEB_DASHBOARD_SPEC.md) | Console specification |

### Console & Dashboard

| Document | Description |
|:---|:---|
| [console-ui-theme-guide.md](./console/console-ui-theme-guide.md) | UI theme & component guide |
| [dashboard-crud-plan.md](./console/dashboard-crud-plan.md) | Full CRUD plan with RBAC |

### Authentication

| Document | Description |
|:---|:---|
| [login.md](./flows/auth/login.md) | Login flow |
| [register.md](./flows/auth/register.md) | Registration flow |
| [OAUTH_TROUBLESHOOTING.md](./flows/auth/OAUTH_TROUBLESHOOTING.md) | OAuth redirect fixes |

### Design & UX

| Document | Description |
|:---|:---|
| [ui_ux_bible.md](./product_design/ui_ux_bible.md) | UI/UX design guidelines |
| [SCREEN_CONSISTENCY_GUIDE.md](./product_design/SCREEN_CONSISTENCY_GUIDE.md) | Screen consistency |

### Reference

| Document | Description |
|:---|:---|
| [repo.md](./project_state/repo.md) | Repository structure |
| [QUICK_START.md](./project_state/QUICK_START.md) | Getting started |
| [CONTEXT_REVIEW.md](./project_state/CONTEXT_REVIEW.md) | Context providers review |

---

## 📝 Documentation Guidelines

### File Naming
- Architecture plans: `FEATURE_PLAN.md` (all caps with underscores)
- Flow docs: `feature.md` (lowercase)
- Guides: `QUICK_START.md` or `GUIDE_NAME.md`

### When to Update
1. **New feature:** Add to relevant existing doc or create new
2. **Refactoring:** Create plan in `architecture/`, old code in `archive/`
3. **Bug fix:** Update relevant flow documentation
4. **Superseded docs:** Move to `archive/` with a note

---

## 🚨 Important Notes

1. **Never import from `archive/`** — documentation only
2. **Post-payment flow**: The source of truth is `emergency/POST_PAYMENT_DISPATCH_FLOW.md`
3. The two old `POST_PAYMENT_*.md` files in `archive/` contained speculative SQL that was never implemented

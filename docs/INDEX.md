# 📚 iVisit Documentation Index

> **Last Updated:** 2026-02-18

---

## 📁 Folder Structure

```
docs/
  ├── INDEX.md                          # This file
  ├── MASTER_BLUEPRINT.md               # Complete DNA of iVisit
  ├── README.md                         # Quick intro
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
  │   └── context/
  │       ├── CURRENT_STATE.md
  │       └── DEPRECATED.md
  │
  ├── onboarding/
  │   └── Technical.md
  │
  └── archive/                          # Historical / superseded docs
```

---

## 🗄️ Database & Schema
All database schema, RLS policies, and SQL architecture documentation reside in **[supabase/docs/](../supabase/docs/)**.

- **[SUPABASE_MONOLITH_SPLIT_PLAN.md](../supabase/docs/SUPABASE_MONOLITH_SPLIT_PLAN.md)**: The 8-module transition plan.
- **[GROUND_ZERO_REPORT.md](../supabase/docs/GROUND_ZERO_REPORT.md)**: Current system audit and cleanup status.
- **[DATA_FLOW_AUDIT.md](../supabase/docs/DATA_FLOW_AUDIT.md)**: Complete schema-to-frontend mapping.
- **[RBAC_ARCHITECTURE.md](../supabase/docs/RBAC_ARCHITECTURE.md)**: Multi-hospital RBAC & Scoping.
- **[POST_PAYMENT_DISPATCH_FLOW.md](../supabase/docs/POST_PAYMENT_DISPATCH_FLOW.md)**: ⭐ Source of truth for post-payment behaviors.
- **[EMERGENCY_PAYMENT_FLOW_AUDIT.md](../supabase/docs/EMERGENCY_PAYMENT_FLOW_AUDIT.md)**: Card vs Cash flow audit.

---

## 🎯 Quick Navigation

### 🧬 Core Systems
- **[MASTER_BLUEPRINT.md](./MASTER_BLUEPRINT.md)**: The complete DNA of iVisit.
- **[ARCHITECTURE.md](./architecture/overview/ARCHITECTURE.md)**: Overall app architecture & layers.
- **[WEB_DASHBOARD_SPEC.md](./architecture/WEB_DASHBOARD_SPEC.md)**: Console specification.

### 🏥 Emergency & SOS
- **[EMERGENCY_VISIT_LIFECYCLE.md](../supabase/docs/EMERGENCY_VISIT_LIFECYCLE.md)**: Status state machine.
- **[REQUEST_FLOW_AUDIT.md](../supabase/docs/REQUEST_FLOW_AUDIT.md)**: Visit types & request state.
- **[ambulance_and_bed_booking.md](./flows/emergency/ambulance_and_bed_booking.md)**: SOS User flow.

### 💳 Financials
- **[payment.md](./flows/payment/payment.md)**: Payment architecture & Stripe setup.

---

## 🚨 Important Notes

1. **Never import from `archive/`** — documentation only.
2. **Post-payment flow**: The source of truth is now located at `supabase/docs/POST_PAYMENT_DISPATCH_FLOW.md`.

# 🗄️ Database Architecture & Engineering

Welcome to the data engineering hub for the iVisit application.
This directory contains the Source of Truth for the application's schema, migrations, and documentation.

## 📚 Documentation Index
- **[Developer Manual & Rules](docs/CONTRIBUTING.md)**: Standards and Workflow.
- **[System Specification](docs/ARCHITECTURE.md)**: UUID & Display ID Logic.
- **[Ground Zero ID Specs](docs/GROUND_ZERO_SPEC.md)**: Detailed Mapping Rules.
- **[Table Reference](docs/REFERENCE.md)**: Complete Inventory.

## 🔄 Core Workflows
*Detailed steps in [CONTRIBUTING.md](docs/CONTRIBUTING.md).*

1. **Diagnose**: Run `docs/archive/test-scripts/run-inspection.js` to see remote state.
2. **Fix & Verify**: Apply floating migrations and verify with `docs/archive/test-scripts/`.
3. **Consolidate**: Once verified, fold into `migrations/20260218060000_consolidated_schema.sql`.
4. **Sync**: `node scripts/sync_to_console.js`.

## 🛠️ Commands
- `docs/archive/test-scripts/run-inspection.js` : Check live RLS policies.
- `docs/archive/test-scripts/test-recursion-fix.js` : Verify recursion kill.
- `node scripts/sync_to_console.js` : Align all workspaces.

---
**Standard**: All IDs are **UUID native**. Verified via `docs/archive/task-verifications/`.

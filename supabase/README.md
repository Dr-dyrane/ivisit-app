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

1. **Diagnose**: Run `docs/archive/test-scripts/run-inspection.js` to see the live state.
2. **Fix & Verify**: Apply fixes directly to the relevant **Migration Pillar** file and verify with `docs/archive/test-scripts/`.
3. **Commit**: Once the UI is confirmed, permanently update the main migration files (No migration bloating!).
4. **Sync**: Run `node scripts/sync_to_console.js` to align both workspaces.

## 🛠️ Commands
- `docs/archive/test-scripts/run-inspection.js` : Check live RLS policies.
- `docs/archive/test-scripts/test-recursion-fix.js` : Verify recursion kill.
- `node scripts/sync_to_console.js` : Align all workspaces.

---
**Standard**: All IDs are **UUID native**. Verified via `docs/archive/task-verifications/`.

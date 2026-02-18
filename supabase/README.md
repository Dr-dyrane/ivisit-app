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

1. **Refine Baseline**: Edit `migrations/20260218060000_consolidated_schema.sql`.
2. **Redeploy**: `npx supabase migration repair --status reverted ...` & `push`.
3. **Sync**: `node scripts/sync_to_console.js`.

## 🛠️ Commands
- `npx supabase start` : Local Dev Environment.
- `node scripts/sync_to_console.js` : Align all workspaces.

---
**Standard**: All IDs are **UUID native**. Mapping to Display IDs (REQ-XXXX) is handled by triggers.

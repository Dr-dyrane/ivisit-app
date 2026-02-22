# Documentation Archive.

This directory contains historical documentation and legacy files from the evolution of the iVisit Supabase architecture.

## 📁 **Archive Contents**

### **🏗️ Architecture & Engineering**
- **ARCHITECTURE.md** - Ground zero architecture and design principles
- **ENGINEERING_PATTERNS.md** - Development patterns and best practices
- **FLUID_FLOW_MANIFESTO.md** - Emergency response flow definitions
- **INTENT_MANIFESTO.md** - Intent handling patterns
- **MIGRATION_MANIFEST.md** - Migration strategy and patterns
- **SERVICE_STANDARDS.md** - Service design standards

### **📋 Legacy SQL Files**
- **20260218060000_consolidated_schema.sql** (21MB) - Original monolithic schema
- **20260219012623_display_id_triggers.sql** - Early display ID implementation
- **20260219012714_rls_policies.sql** - Initial RLS policies
- **20260219012737_emergency_functions.sql** - Early emergency functions
- **HOSPITAL_SEED_INTENT.sql** - Hospital seeding data
- **NEWS_SEED_INTENT.sql** - News seeding data
- **LEGACY_PUSH_LOG_REFERENCE.log** (4.4MB) - Historical deployment logs

### **📊 Audit Reports**
- **CONTRIBUTING_OLD.md** - Previous contribution guidelines
- **TESTING_GUIDE_OLD.md** - Original testing documentation
- **DATA_FLOW_AUDIT.md** - Data flow analysis and audit
- **EMERGENCY_PAYMENT_FLOW_AUDIT.md** - Payment flow audit
- **EMERGENCY_VISIT_LIFECYCLE.md** - Emergency visit lifecycle analysis
- **GROUND_ZERO_REPORT.md** - Ground zero implementation report
- **RBAC_ARCHITECTURE.md** - Role-based access control design
- **REQUEST_FLOW_AUDIT.md** - Request processing audit
- **SCHEMA_AUDIT.md** - Schema evolution audit
- **SUPABASE_MONOLITH_SPLIT_PLAN.md** - Modularization plan
- **POST_PAYMENT_DISPATCH_FLOW.md** - Payment dispatch flow analysis

### **🧪 Task Validation**
- **TASK_VALIDATION_FLUID_SYNC.md** - Fluid sync task validation

## 🎯 **Historical Context**

### **Evolution Stages:**
1. **Monolithic Schema** → **Modular 11-Pillar Architecture**
2. **Legacy Functions** → **Organized RPC Functions**
3. **Manual Testing** → **Automated Test Framework**
4. **Console Separation** → **Cross-Workspace Sync**
5. **Display ID Mapping** → **UUID-Native Architecture**

### **Key Decisions Preserved:**
- **UUID Native** architecture with display ID mapping
- **11 modular pillars** for clear separation of concerns
- **Comprehensive testing framework** with task-based validation
- **Cross-workspace synchronization** for consistency

## 📋 **When to Reference This Archive**

### **For Historical Context:**
- Understanding architectural decisions and evolution
- Learning from previous implementation attempts
- Reviewing audit findings and recommendations

### **For Legacy Code:**
- Referencing old SQL implementations
- Understanding migration paths from legacy systems
- Comparing with current modular approach

### **For Troubleshooting:**
- Reviewing audit reports for known issues
- Understanding historical constraints and limitations
- Tracing root causes of architectural decisions

## ⚠️ **Important Notes**

### **Current vs. Legacy:**
- **Active documentation** in `../docs/` contains current standards
- **Archive** preserves historical context for reference
- **Do not use** legacy files without understanding current context

### **File Sizes:**
- Large files like `20260218060000_consolidated_schema.sql` (21MB) are preserved for reference
- Consider cleanup of very large files if disk space becomes an issue

---

*Last Updated: February 19, 2026*

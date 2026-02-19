# Contributing to iVisit Supabase Schema

## 🎯 Overview

This document outlines standards and processes for contributing to iVisit Supabase database schema and documentation.

## 📋 Core Rules

### **1. Migration Hygiene**
- **Always update core migrations** instead of creating fix migrations
- **Delete redundant migrations** after integrating fixes
- **Never create separate fix files** for issues that can be resolved in core
- **Run comprehensive tests** before and after schema changes

### **2. File Organization**
- **Tests**: `supabase/tests/`
- **Scripts**: `supabase/scripts/`
- **No files in project root**
- **Archive outdated docs** to `supabase/docs/archive/`

### **3. Documentation Standards**
- **Single source of truth** per topic
- **Update existing docs** instead of creating new ones
- **Console sync required** for schema changes
- **Version control** for architecture changes

## 🔄 Migration Process

### **Schema Changes**
1. **Identify core module** that needs updating
2. **Update core migration file** directly
3. **Test changes** with comprehensive test suite
4. **Update documentation** to reflect changes
5. **Delete any fix migrations** created during development

### **Example: Fixing Display ID Issues**
❌ **Wrong**: Create `20260219011000_fix_critical_issues.sql`
✅ **Right**: Update `20260219000100_identity.sql` with id_mappings table

### **Migration Hygiene Checklist**
- [ ] Core migration updated instead of fix migration created
- [ ] All changes integrated into appropriate module
- [ ] Redundant migrations deleted
- [ ] Tests pass (100% success rate)
- [ ] Documentation updated

## 📚 Documentation Standards

### **Core Documentation Structure**
```
supabase/docs/
├── README.md              # Main overview & quick start
├── ARCHITECTURE.md        # Current modular schema architecture
├── CONTRIBUTING.md         # This file - contribution guidelines
├── TESTING.md             # Testing procedures & standards
└── REFERENCE.md           # API reference & function catalog
```

### **Archive Structure**
```
supabase/docs/archive/
├── legacy_audits/         # All flow audit files
├── old_architecture/       # Pre-modular schema docs
└── deprecated_specs/       # Outdated specifications
```

### **Documentation Updates**
1. **Update existing files** before creating new ones
2. **Consolidate overlapping content**
3. **Archive outdated documentation**
4. **Maintain single source of truth**

## 🧪 Testing Standards

### **Required Tests**
- **All tables accessible** with proper structure
- **All functions callable** without errors
- **Display ID system** working correctly
- **Security policies** active and functional
- **RPC functions** returning expected results

### **Test Success Criteria**
- **100% test pass rate** required
- **No schema cache errors**
- **All modules deployed**
- **Emergency system operational**

### **Testing Process**
```bash
# Run comprehensive tests
node supabase/tests/test_comprehensive_system.js

# Verify migration status
npx supabase migration list
```

## 🔄 Console Sync Process

### **When to Sync**
- **After any schema changes**
- **After migration updates**
- **After function additions**
- **After policy changes**

### **Sync Checklist**
- [ ] Schema changes documented in console
- [ ] New functions added to console docs
- [ ] Migration history updated
- [ ] API reference updated
- [ ] Testing guide updated if needed

## 🏗️ Module Responsibilities

### **Core Modules**
1. **Infrastructure** (20260219000000) - Extensions, utilities
2. **Identity** (20260219000100) - Profiles, preferences, medical
3. **Organizations** (20260219000200) - Hospitals, doctors
4. **Logistics** (20260219000300) - Ambulances, emergency requests
5. **Financials** (20260219000400) - Wallets, payments, insurance
6. **Operations** (20260219000500) - Notifications, support, CMS
7. **Analytics** (20260219000600) - Activity logs, search trends
8. **Security** (20260219000700) - RLS policies, access control
9. **Emergency Logic** (20260219000800) - Atomic operations
10. **Automations** (20260219000900) - Cross-table hooks
11. **Core RPCs** (20260219010000) - Location services

### **Module Ownership**
- **Each module has clear responsibility boundaries**
- **No circular dependencies**
- **Proper foreign key relationships**
- **Consistent naming conventions**

## 🎯 Quality Gates

### **Before Committing**
- [ ] Migration hygiene followed
- [ ] File organization correct
- [ ] Documentation updated
- [ ] Tests passing (100%)
- [ ] Console sync completed

### **Code Review Checklist**
- [ ] Changes in appropriate core module
- [ ] No redundant migrations created
- [ ] Single source of truth maintained
- [ ] File organization standards followed
- [ ] Testing requirements met

## 🚀 Getting Started

### **For Schema Changes**
1. **Identify affected module**
2. **Update core migration**
3. **Run tests locally**
4. **Update documentation**
5. **Submit for review**

### **For Documentation Updates**
1. **Check existing docs first**
2. **Consolidate overlapping content**
3. **Archive outdated content**
4. **Update single source of truth**

### **For Testing**
1. **Use comprehensive test suite**
2. **Verify all modules**
3. **Check display ID system**
4. **Validate security policies**

## 📞 Support

### **Questions**
- **Module ownership**: Check module responsibilities section
- **Migration hygiene**: Follow core migration update process
- **Documentation**: Maintain single source of truth
- **Testing**: Use comprehensive test suite

### **Escalation**
- **Architecture decisions**: Document in ARCHITECTURE.md
- **Breaking changes**: Update version and migration notes
- **Security issues**: Follow security reporting process
- **Performance issues**: Profile and optimize queries

---

**Remember**: Clean migrations, organized files, and comprehensive testing are foundation of maintainable database architecture.

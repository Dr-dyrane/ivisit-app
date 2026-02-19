# Error Constraints and Definitions

## 🎯 Overview

This document defines error types, constraints, and handling procedures for the iVisit Supabase testing system.

## 🚨 Error Classification System

### **Critical Errors (Block Deployment)**
These errors prevent deployment and must be fixed immediately:

#### **Schema Errors**
- **Missing Tables**: Core tables not found in database
  - **Detection**: Table count < 13 or specific table missing
  - **Impact**: System cannot function
  - **Fix**: Check migration deployment, run missing migrations

- **Missing Functions**: RPC functions not accessible
  - **Detection**: Function calls return "does not exist" errors
  - **Impact**: Critical functionality unavailable
  - **Fix**: Check function definitions, verify deployment

- **Data Type Mismatches**: Column types don't match expectations
  - **Detection**: Type conversion errors in queries/functions
  - **Impact**: Data corruption or query failures
  - **Fix**: Update column types, fix function signatures

#### **Security Errors**
- **RLS Policy Failures**: Row Level Security not working
  - **Detection**: Users can access unauthorized data
  - **Impact**: Security breach
  - **Fix**: Review and fix RLS policies

- **Permission Errors**: Functions lack proper permissions
  - **Detection**: Permission denied errors
  - **Impact**: Functionality unavailable
  - **Fix**: Update function security definitions

#### **System Errors**
- **Schema Cache Issues**: Database schema not synchronized
  - **Detection**: Functions exist but not callable
  - **Impact**: System inconsistency
  - **Fix**: Refresh schema cache, sync migrations

### **Warning Errors (Fix Required)**
These errors don't block deployment but should be fixed:

#### **Display ID Issues**
- **Missing Display ID Columns**: Tables missing display_id columns
  - **Detection**: Column count mismatch in display ID system
  - **Impact**: User-facing ID generation fails
  - **Fix**: Add display_id columns to affected tables

- **Display ID Generation Failures**: Triggers not working
  - **Detection**: New records missing display_id values
  - **Impact**: User experience issues
  - **Fix**: Check trigger definitions, fix mapping table

#### **Naming Inconsistencies**
- **Inconsistent Column Names**: Similar columns with different names
  - **Detection**: Pattern analysis of column names
  - **Impact**: Developer confusion, maintenance issues
  - **Fix**: Standardize naming conventions

- **Inconsistent Function Names**: Functions not following naming patterns
  - **Detection**: Function name pattern analysis
  - **Impact**: API inconsistency
  - **Fix**: Rename functions to follow standards

#### **Performance Issues**
- **Missing Indexes**: Critical queries slow
  - **Detection**: Query execution time > threshold
  - **Impact**: Poor performance
  - **Fix**: Add appropriate indexes

- **Inefficient Queries**: Suboptimal query patterns
  - **Detection**: Query plan analysis
  - **Impact**: Resource waste, slow response
  - **Fix**: Optimize query structure

### **Info Messages (Monitor)**
These are informational and don't require immediate action:

#### **Data State Messages**
- **Empty Tables**: Expected tables with no data
  - **Detection**: Table count = 0 in clean deployment
  - **Impact**: None (expected in clean system)
  - **Action**: Monitor for unexpected emptiness

- **Missing Test Data**: Test scenarios not fully populated
  - **Detection**: Test data validation failures
  - **Impact**: Limited test coverage
  - **Action**: Create test data if needed

#### **Configuration Messages**
- **Optional Features**: Optional features not configured
  - **Detection**: Configuration gaps in optional systems
  - **Impact**: Reduced functionality
  - **Action**: Configure if needed

- **Environment Differences**: Dev/staging/production differences
  - **Detection**: Environment-specific validation
  - **Impact**: Potential deployment issues
  - **Action**: Standardize environments

## 📊 Error Detection Methods

### **Automated Detection**
```javascript
// Error detection patterns
const errorPatterns = {
  critical: [
    /does not exist/i,
    /permission denied/i,
    /column .* does not exist/i,
    /relation .* does not exist/i,
    /function .* does not exist/i
  ],
  warning: [
    /missing display_id/i,
    /trigger .* does not exist/i,
    /index .* not found/i,
    /constraint violation/i
  ],
  info: [
    /no rows returned/i,
    /empty result/i,
    /optional feature/i
  ]
};
```

### **Manual Detection**
- **Schema inspection**: Visual verification of structure
- **Function testing**: Manual function calls with various inputs
- **Security testing**: Access control validation
- **Performance testing**: Load and stress testing

## 🔧 Error Handling Procedures

### **Critical Error Handling**
1. **Immediate Action**: Stop deployment process
2. **Error Analysis**: Identify root cause and impact
3. **Fix Generation**: Create targeted SQL fix
4. **Fix Testing**: Apply fix in test environment
5. **Validation**: Verify fix resolves issue
6. **Migration Update**: Integrate fix into core migration
7. **Re-testing**: Run full test suite after fix

### **Warning Error Handling**
1. **Error Documentation**: Log warning with full context
2. **Impact Assessment**: Determine severity and priority
3. **Fix Planning**: Schedule fix for next deployment
4. **Fix Implementation**: Create and test fix
5. **Migration Integration**: Add fix to appropriate core migration
6. **Validation**: Verify fix doesn't break other functionality

### **Info Message Handling**
1. **Message Logging**: Record info message with context
2. **Pattern Analysis**: Look for recurring patterns
3. **Trend Monitoring**: Track message frequency over time
4. **Documentation**: Update documentation if needed
5. **Preventive Action**: Address underlying causes if patterns emerge

## 🛠️ Fix Generation Guidelines

### **SQL Fix Structure**
```sql
-- Fix for [Error Description]
-- Generated: [Timestamp]
-- Error Type: [Critical/Warning/Info]
-- Migration: [Target migration file]

-- PULLBACK NOTE: Brief description of change
-- OLD: original code/value
-- NEW: new code/value

-- Fix implementation
[SQL fix code]

-- Validation query
[SQL to verify fix]
```

### **Fix Categories**
- **Schema Fixes**: Table/column modifications
- **Function Fixes**: Function definition updates
- **Security Fixes**: RLS policy modifications
- **Performance Fixes**: Index additions, query optimizations
- **Data Fixes**: Data correction scripts

### **Fix Validation**
- **Syntax Check**: SQL syntax validation
- **Logic Check**: Fix logic verification
- **Impact Check**: Side effect analysis
- **Performance Check**: Performance impact assessment

## 📋 Error Reporting Format

### **Error Log Entry**
```json
{
  "timestamp": "2026-02-19T03:56:00Z",
  "taskId": "task_name",
  "errorType": "critical|warning|info",
  "category": "schema|security|performance|data",
  "message": "Human-readable error description",
  "technicalDetails": {
    "errorCode": "ERROR_CODE",
    "sqlState": "SQL_STATE",
    "query": "Query that failed",
    "context": "Additional context"
  },
  "impact": "Description of impact",
  "fix": {
    "recommended": "Recommended fix approach",
    "sql": "SQL fix if available",
    "migration": "Target migration file"
  },
  "status": "detected|analyzed|fixed|validated"
}
```

### **Validation Report**
```json
{
  "taskId": "task_name",
  "timestamp": "2026-02-19T03:56:00Z",
  "summary": {
    "totalTests": 25,
    "passed": 23,
    "failed": 2,
    "warnings": 3,
    "info": 1
  },
  "errors": [
    {
      "type": "critical",
      "count": 1,
      "details": "Error details..."
    }
  ],
  "recommendations": [
    "Fix recommendation 1",
    "Fix recommendation 2"
  ],
  "nextSteps": [
    "Apply critical fixes",
    "Re-run validation",
    "Update migrations"
  ]
}
```

## 🎯 Error Prevention Strategies

### **Pre-Deployment Checks**
- **Schema validation**: Verify all tables and functions exist
- **Security review**: Check RLS policies and permissions
- **Performance analysis**: Validate query performance
- **Data integrity**: Check foreign key relationships

### **Development Standards**
- **Code review**: Peer review for all changes
- **Testing requirements**: Comprehensive test coverage
- **Documentation**: Clear documentation for all changes
- **Version control**: Proper branching and merging

### **Monitoring**
- **Error tracking**: Continuous error monitoring
- **Performance monitoring**: Regular performance checks
- **Security monitoring**: Ongoing security validation
- **Usage monitoring**: Track system usage patterns

---

**This error constraint system ensures consistent error handling, proper categorization, and systematic resolution of all issues.**

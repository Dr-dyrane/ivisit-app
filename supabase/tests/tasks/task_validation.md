# Task Validation Framework

## 🎯 Overview

This framework defines how tasks are structured, validated, and executed in the iVisit Supabase testing system.

## 📋 Task Definition Structure

### **Standard Task Template**
```markdown
## Task: [Task Name]

### **Objective**
Clear, measurable goal of what the test should accomplish.

### **Prerequisites**
Required conditions that must be met before testing:
- Database state requirements
- Required migrations deployed
- Environment variables needed
- Test data requirements

### **Test Steps**
1. **Step 1**: [Action to perform]
   - Expected result: [What should happen]
   - Validation method: [How to verify]
   
2. **Step 2**: [Action to perform]
   - Expected result: [What should happen]
   - Validation method: [How to verify]

3. **Step N**: [Action to perform]
   - Expected result: [What should happen]
   - Validation method: [How to verify]

### **Expected Results**
Primary outcomes that indicate success:
- [Result 1]: [Description and validation criteria]
- [Result 2]: [Description and validation criteria]
- [Result N]: [Description and validation criteria]

### **Error Scenarios**
Potential errors and their meanings:
- **Error Type 1**: [Description] → [Fix approach]
- **Error Type 2**: [Description] → [Fix approach]
- **Error Type N**: [Description] → [Fix approach]

### **Success Criteria**
Specific conditions that must be met for task completion:
- [ ] [Criterion 1]: [Measurable condition]
- [ ] [Criterion 2]: [Measurable condition]
- [ ] [Criterion N]: [Measurable condition]

### **Constraints**
Limits and boundaries for the test:
- **Time limits**: [Maximum execution time]
- **Resource limits**: [Memory/CPU constraints]
- **Data limits**: [Maximum data size/records]
- **Access limits**: [Required permissions/roles]

### **Dependencies**
Other tasks or systems this task depends on:
- **Required tasks**: [List of prerequisite tasks]
- **System dependencies**: [External systems needed]
- **Data dependencies**: [Required data setup]
```

## 🧪 Task Categories

### **1. Schema Validation Tasks**
Validate database structure and integrity:
- Table existence and structure
- Column definitions and types
- Foreign key relationships
- Index presence and effectiveness

### **2. Function Testing Tasks**
Validate RPC functions and procedures:
- Function existence and accessibility
- Parameter validation
- Return value verification
- Error handling

### **3. Security Testing Tasks**
Validate RLS policies and access control:
- Policy effectiveness
- Role-based access
- Data protection
- Permission boundaries

### **4. Integration Testing Tasks**
Validate cross-module functionality:
- Emergency workflow testing
- Payment processing flows
- Notification systems
- Data synchronization

### **5. Performance Testing Tasks**
Validate system performance:
- Query execution times
- Resource usage
- Concurrent access
- Load handling

## 📊 Task Execution Process

### **Step 1: Task Definition**
1. **Create task file** using standard template
2. **Define clear objectives** with measurable outcomes
3. **Set success criteria** with specific conditions
4. **Identify dependencies** and prerequisites

### **Step 2: Test Preparation**
1. **Verify prerequisites** are met
2. **Set up test environment** as required
3. **Prepare test data** if needed
4. **Validate dependencies** are available

### **Step 3: Test Execution**
1. **Execute test steps** in defined order
2. **Record results** at each step
3. **Document any deviations** from expected results
4. **Log errors** with full context

### **Step 4: Result Validation**
1. **Compare actual results** with expected results
2. **Verify all success criteria** are met
3. **Identify any errors** or failures
4. **Document performance metrics** if applicable

### **Step 5: Error Handling**
1. **Categorize errors** using error constraints
2. **Generate appropriate fixes** from fix library
3. **Apply fixes** and re-run affected steps
4. **Document fix effectiveness**

### **Step 6: Task Completion**
1. **Generate task report** with full results
2. **Archive test data** for future reference
3. **Update task status** in validation system
4. **Notify stakeholders** of completion

## 🔍 Task Validation Rules

### **Mandatory Requirements**
- **Clear objective** with measurable outcome
- **Specific success criteria** with validation methods
- **Defined error scenarios** with fix approaches
- **Documented constraints** and dependencies

### **Quality Standards**
- **Reproducible steps** that can be followed consistently
- **Unambiguous validation** methods
- **Comprehensive error coverage**
- **Realistic time and resource limits**

### **Documentation Standards**
- **Consistent formatting** using standard template
- **Clear language** without ambiguity
- **Complete information** for independent execution
- **Version control** for task evolution

## 📝 Task Examples

### **Example 1: Schema Validation**
```markdown
## Task: Validate Core Tables Structure

### **Objective**
Ensure all core tables exist with proper structure and display ID columns.

### **Prerequisites**
- All 11 core migrations deployed
- Database connection available
- Read access to system tables

### **Test Steps**
1. **Check table existence**: Verify all 13 core tables exist
   - Expected result: All tables present
   - Validation method: Query information_schema
   
2. **Validate column structure**: Check display_id columns in required tables
   - Expected result: All required display_id columns present
   - Validation method: DESCRIBE table queries
   
3. **Verify foreign keys**: Ensure all relationships are properly defined
   - Expected result: All foreign keys valid
   - Validation method: Check constraint tables

### **Success Criteria**
- [ ] All 13 core tables exist
- [ ] All required display_id columns present
- [ ] All foreign keys valid
- [ ] No orphaned relationships
```

### **Example 2: Function Testing**
```markdown
## Task: Validate Emergency RPC Functions

### **Objective**
Ensure emergency creation function works with proper payment integration.

### **Prerequisites**
- Emergency logic module deployed
- Test user available
- Payment methods configured

### **Test Steps**
1. **Test emergency creation**: Call create_emergency_v4 with valid data
   - Expected result: Emergency created successfully
   - Validation method: Check return value and database state
   
2. **Test payment integration**: Verify payment records created correctly
   - Expected result: Payment record with proper status
   - Validation method: Query payments table
   
3. **Test error handling**: Call with invalid data
   - Expected result: Appropriate error returned
   - Validation method: Check error messages

### **Success Criteria**
- [ ] Emergency created with valid data
- [ ] Payment integration working
- [ ] Error handling functional
- [ ] Display ID generated correctly
```

## 🎯 Task Management

### **Task Status Tracking**
- **Pending**: Task defined but not executed
- **In Progress**: Task currently being executed
- **Completed**: Task finished successfully
- **Failed**: Task failed with errors
- **Blocked**: Task blocked by dependencies

### **Task Priority Levels**
- **Critical**: Blocks deployment or major functionality
- **High**: Important feature or security issue
- **Medium**: Enhancement or improvement
- **Low**: Minor issue or optimization

### **Task Dependencies**
- **Hard Dependency**: Required for task execution
- **Soft Dependency**: Recommended but not required
- **Conflicting**: Cannot run simultaneously
- **Sequential**: Must run in specific order

---

**This framework ensures consistent, comprehensive, and maintainable task validation across all testing activities.**

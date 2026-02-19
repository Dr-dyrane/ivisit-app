/**
 * Error Filter Component
 * Centralized error filtering and categorization
 */

class ErrorFilter {
    constructor() {
        this.errorPatterns = {
            database: /database|connection|query|constraint|permission|PGRST|42P17|42P01|42501/gi,
            test: /assertion|validation|timeout|setup|test|assert/gi,
            consolidation: /migration|conflict|dependency|validation|consolidation/gi,
            system: /configuration|environment|resource|network|system/gi,
            rpc: /rpc|function|procedure|call|execute/gi,
            trigger: /trigger|constraint|foreign|key|cascade/gi,
            rls: /rls|row level security|policy|permission|auth/gi
        };
    }

    categorizeError(error) {
        const errorString = JSON.stringify(error);
        
        for (const [category, pattern] of Object.entries(this.errorPatterns)) {
            if (pattern.test(errorString)) {
                return this.getSubcategory(errorString, category);
            }
        }
        
        return { category: 'UNKNOWN', subcategory: 'unclassified' };
    }

    getSubcategory(errorString, category) {
        const subcategories = {
            database: ['connection', 'query', 'constraint', 'permission'],
            test: ['assertion', 'validation', 'timeout', 'setup'],
            consolidation: ['migration', 'conflict', 'dependency', 'validation'],
            system: ['configuration', 'environment', 'resource', 'network'],
            rpc: ['function', 'procedure', 'call', 'execute'],
            trigger: ['trigger', 'constraint', 'foreign', 'key'],
            rls: ['rls', 'row level security', 'policy', 'permission', 'auth']
        };

        for (const subcategory of subcategories[category]) {
            if (errorString.includes(subcategory)) {
                return { category, subcategory };
            }
        }

        return { category, subcategory: 'general' };
    }

    filterErrors(errors, filters = {}) {
        return errors.filter(error => {
            if (filters.category && error.category !== filters.category) {
                return false;
            }
            if (filters.severity && error.severity !== filters.severity) {
                return false;
            }
            if (filters.component && error.component !== filters.component) {
                return false;
            }
            if (filters.subcategory && error.subcategory !== filters.subcategory) {
                return false;
            }
            return true;
        });
    }

    getSeverity(error) {
        const message = error.message || '';
        const code = error.code || '';
        
        // Critical errors
        if (message.includes('infinite recursion') || code === '42P17') {
            return 'CRITICAL';
        }
        
        // High severity errors
        if (message.includes('not found') || code === 'PGRST202' || code === '42P01') {
            return 'HIGH';
        }
        
        // Medium severity errors
        if (message.includes('permission') || code === '42501' || message.includes('constraint')) {
            return 'MEDIUM';
        }
        
        // Low severity errors
        if (message.includes('timeout') || message.includes('connection')) {
            return 'LOW';
        }
        
        return 'ERROR';
    }

    getResolutionSuggestion(error) {
        const { category, subcategory, message, code } = error;
        
        // Database errors
        if (category === 'DATABASE') {
            if (subcategory === 'connection') {
                return 'Check database connection string and network connectivity';
            }
            if (subcategory === 'query') {
                return 'Verify SQL syntax and table/column existence';
            }
            if (subcategory === 'constraint') {
                return 'Check foreign key constraints and data integrity';
            }
            if (subcategory === 'permission') {
                return 'Verify user permissions and RLS policies';
            }
        }
        
        // RPC errors
        if (category === 'RPC') {
            if (message.includes('not found in schema cache')) {
                return 'Check if function exists in database and is properly deployed';
            }
            if (message.includes('parameter')) {
                return 'Verify function parameters match expected signature';
            }
            return 'Check function definition and deployment status';
        }
        
        // RLS errors
        if (category === 'RLS') {
            if (message.includes('infinite recursion')) {
                return 'Use SECURITY DEFINER helper functions instead of direct table queries';
            }
            return 'Review RLS policies and helper function implementations';
        }
        
        // Trigger errors
        if (category === 'TRIGGER') {
            return 'Check trigger function definition and table dependencies';
        }
        
        // Test errors
        if (category === 'TEST') {
            return 'Review test setup and expected values';
        }
        
        // Consolidation errors
        if (category === 'CONSOLIDATION') {
            return 'Check migration order and dependency resolution';
        }
        
        return 'Review error context and system logs for more details';
    }

    getAffectedComponents(error) {
        const { component, message } = error;
        const affected = [component];
        
        // Add related components based on error context
        if (message.includes('emergency')) {
            affected.push('emergency_flow', 'payment_system');
        }
        
        if (message.includes('payment')) {
            affected.push('payment_system', 'wallet_system');
        }
        
        if (message.includes('auth') || message.includes('permission')) {
            affected.push('auth_system', 'rls_policies');
        }
        
        if (message.includes('trigger')) {
            affected.push('automation_system', 'notification_system');
        }
        
        return [...new Set(affected)]; // Remove duplicates
    }

    analyzeErrorPatterns(errors) {
        const patterns = {};
        
        for (const error of errors) {
            const key = `${error.category}_${error.subcategory}`;
            patterns[key] = (patterns[key] || 0) + 1;
        }
        
        // Sort by frequency
        const sortedPatterns = Object.entries(patterns)
            .sort(([,a], [,b]) => b - a)
            .reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {});
        
        return sortedPatterns;
    }

    getErrorSummary(errors) {
        const summary = {
            total: errors.length,
            byCategory: {},
            bySeverity: {},
            byComponent: {},
            recent: errors.slice(-10) // Last 10 errors
        };
        
        for (const error of errors) {
            // Count by category
            summary.byCategory[error.category] = (summary.byCategory[error.category] || 0) + 1;
            
            // Count by severity
            summary.bySeverity[error.severity] = (summary.bySeverity[error.severity] || 0) + 1;
            
            // Count by component
            summary.byComponent[error.component] = (summary.byComponent[error.component] || 0) + 1;
        }
        
        return summary;
    }
}

module.exports = ErrorFilter;

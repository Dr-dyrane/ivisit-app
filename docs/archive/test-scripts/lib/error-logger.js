/**
 * Error Logger Component
 * Centralized error logging and persistence
 */

const fs = require('fs').promises;
const path = require('path');
const ErrorFilter = require('./error-filter');

class ErrorLogger {
    constructor() {
        this.filter = new ErrorFilter();
        this.errorDir = path.join(__dirname, '../../supabase/errors');
        this.ensureErrorDir();
    }

    async ensureErrorDir() {
        try {
            await fs.mkdir(this.errorDir, { recursive: true });
            await fs.mkdir(path.join(this.errorDir, 'consolidation'), { recursive: true });
            await fs.mkdir(path.join(this.errorDir, 'testing'), { recursive: true });
            await fs.mkdir(path.join(this.errorDir, 'migration'), { recursive: true });
            await fs.mkdir(path.join(this.errorDir, 'patterns'), { recursive: true });
            await fs.mkdir(path.join(this.errorDir, 'archive'), { recursive: true });
        } catch (error) {
            console.error('Failed to create error directories:', error);
        }
    }

    async logError(error, context = {}) {
        const categorizedError = {
            timestamp: new Date().toISOString(),
            category: 'UNKNOWN',
            subcategory: 'unclassified',
            severity: 'ERROR',
            ...error,
            ...context
        };

        // Categorize error
        const { category, subcategory } = this.filter.categorizeError(error);
        categorizedError.category = category;
        categorizedError.subcategory = subcategory;
        categorizedError.severity = this.filter.getSeverity(error);

        // Determine file path
        const filePath = this.getFilePath(categorizedError);
        
        // Write error to file
        await this.writeErrorToFile(filePath, categorizedError);
        
        // Update patterns
        await this.updatePatterns(categorizedError);
        
        return categorizedError;
    }

    getFilePath(error) {
        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toISOString().split('T')[1].replace(/:/g, '-').split('.')[0];
        
        let directory = 'unknown';
        if (error.category === 'CONSOLIDATION') {
            directory = 'consolidation';
        } else if (error.category === 'TEST') {
            directory = 'testing';
        } else if (error.category === 'DATABASE') {
            directory = 'migration';
        } else if (error.category === 'RPC') {
            directory = 'testing';
        } else if (error.category === 'TRIGGER') {
            directory = 'testing';
        } else if (error.category === 'RLS') {
            directory = 'testing';
        }

        const filename = `${date}_${time}_${error.component || 'unknown'}.json`;
        return path.join(this.errorDir, directory, filename);
    }

    async writeErrorToFile(filePath, error) {
        try {
            let existingErrors = [];
            
            // Read existing errors if file exists
            try {
                const existingData = await fs.readFile(filePath, 'utf8');
                existingErrors = JSON.parse(existingData);
            } catch (error) {
                // File doesn't exist, create new
            }

            // Add new error
            existingErrors.push(error);
            
            // Write back to file
            await fs.writeFile(filePath, JSON.stringify(existingErrors, null, 2));
            
        } catch (writeError) {
            console.error('Failed to write error to file:', writeError);
        }
    }

    async updatePatterns(error) {
        const patternsPath = path.join(this.errorDir, 'patterns', 'common_errors.json');
        
        try {
            let patterns = {};
            
            // Read existing patterns
            try {
                const existingData = await fs.readFile(patternsPath, 'utf8');
                patterns = JSON.parse(existingData);
            } catch (error) {
                // File doesn't exist, create new
            }

            // Update pattern count
            const key = `${error.category}_${error.subcategory}`;
            patterns[key] = (patterns[key] || 0) + 1;
            
            // Write back
            await fs.writeFile(patternsPath, JSON.stringify(patterns, null, 2));
            
        } catch (error) {
            console.error('Failed to update patterns:', error);
        }
    }

    async getErrors(filters = {}) {
        const errors = [];
        
        // Read all error files
        const directories = ['consolidation', 'testing', 'migration'];
        
        for (const directory of directories) {
            const dirPath = path.join(this.errorDir, directory);
            
            try {
                const files = await fs.readdir(dirPath);
                
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const filePath = path.join(dirPath, file);
                        const fileData = await fs.readFile(filePath, 'utf8');
                        const fileErrors = JSON.parse(fileData);
                        errors.push(...fileErrors);
                    }
                }
            } catch (error) {
                // Directory doesn't exist or can't read
            }
        }

        // Apply filters
        return this.filter.filterErrors(errors, filters);
    }

    async logConsolidationError(error, phase, component = null) {
        const enhancedError = {
            ...error,
            phase,
            component: component || 'consolidation_runner',
            operation: phase
        };

        await this.logError(enhancedError, {
            component: 'consolidation_runner',
            operation: phase
        });
    }

    async logTestError(error, testName, component = null) {
        const enhancedError = {
            ...error,
            test_name: testName,
            component: component || 'test_runner'
        };

        await this.logError(enhancedError, {
            component: component || 'test_runner',
            operation: testName
        });
    }

    async logDatabaseError(error, operation, component = null) {
        const enhancedError = {
            ...error,
            database_operation: operation,
            component: component || 'database_component'
        };

        await this.logError(enhancedError, {
            component: component || 'database_component',
            operation: operation
        });
    }

    async logRPCError(error, functionName, params = {}) {
        const enhancedError = {
            ...error,
            rpc_function: functionName,
            rpc_parameters: params,
            component: 'rpc_component'
        };

        await this.logError(enhancedError, {
            component: 'rpc_component',
            operation: functionName
        });
    }

    async logTriggerError(error, triggerName, tableName = null) {
        const enhancedError = {
            ...error,
            trigger_name: triggerName,
            trigger_table: tableName,
            component: 'trigger_component'
        };

        await this.logError(enhancedError, {
            component: 'trigger_component',
            operation: triggerName
        });
    }

    async logRLSError(error, policyName, tableName = null) {
        const enhancedError = {
            ...error,
            rls_policy: policyName,
            rls_table: tableName,
            component: 'rls_component'
        };

        await this.logError(enhancedError, {
            component: 'rls_component',
            operation: policyName
        });
    }

    async generateErrorReport() {
        console.log('\n📊 Generating Error Report...\n');
        
        const allErrors = await this.getErrors();
        const consolidationErrors = await this.getErrors({ category: 'CONSOLIDATION' });
        const testErrors = await this.getErrors({ category: 'TEST' });
        const databaseErrors = await this.getErrors({ category: 'DATABASE' });

        console.log('=== ERROR SUMMARY ===');
        console.log(`Total Errors: ${allErrors.length}`);
        console.log(`Consolidation Errors: ${consolidationErrors.length}`);
        console.log(`Test Errors: ${testErrors.length}`);
        console.log(`Database Errors: ${databaseErrors.length}`);
        
        // Group errors by category
        const errorsByCategory = this.groupErrorsByCategory(allErrors);
        
        for (const [category, categoryErrors] of Object.entries(errorsByCategory)) {
            console.log(`\n${category.toUpperCase()}: ${categoryErrors.length} errors`);
            
            for (const error of categoryErrors) {
                console.log(`  - ${error.message} (${error.severity})`);
                if (error.resolution_suggestion) {
                    console.log(`    💡 Suggestion: ${error.resolution_suggestion}`);
                }
            }
        }

        // Error patterns
        const patterns = await this.getErrorPatterns();
        console.log('\n=== ERROR PATTERNS ===');
        for (const [pattern, count] of Object.entries(patterns)) {
            console.log(`${pattern}: ${count} occurrences`);
        }

        // Error file locations
        console.log('\n=== ERROR FILES ===');
        console.log('Consolidation errors: supabase/errors/consolidation/');
        console.log('Test errors: supabase/errors/testing/');
        console.log('Database errors: supabase/errors/migration/');
        console.log('Error patterns: supabase/errors/patterns/');
    }

    groupErrorsByCategory(errors) {
        const grouped = {};
        
        for (const error of errors) {
            const category = error.category || 'UNKNOWN';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(error);
        }
        
        return grouped;
    }

    async getErrorPatterns() {
        const patternsPath = path.join(this.errorDir, 'patterns', 'common_errors.json');
        
        try {
            const data = await fs.readFile(patternsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {};
        }
    }
}

module.exports = ErrorLogger;

/**
 * Error Reporting Component
 * Enhanced error readability and formatting
 */

class ErrorReporter {
    constructor() {
        this.severityColors = {
            ERROR: '🔴',
            WARNING: '🟡',
            INFO: '🔵',
            SUCCESS: '🟢',
            CRITICAL: '🚨',
            HIGH: '🔴',
            MEDIUM: '🟠',
            LOW: '🟡'
        };
    }

    formatError(error) {
        const icon = this.severityColors[error.severity] || '⚪';
        
        return {
            icon,
            category: error.category,
            subcategory: error.subcategory,
            component: error.component,
            operation: error.operation,
            message: error.message,
            timestamp: new Date(error.timestamp).toLocaleString(),
            suggestion: error.resolution_suggestion,
            context: this.formatContext(error.context)
        };
    }

    formatContext(context) {
        if (!context) return '';
        
        const formatted = [];
        for (const [key, value] of Object.entries(context)) {
            formatted.push(`${key}: ${value}`);
        }
        
        return formatted.join(', ');
    }

    generateReadableReport(errors) {
        let report = '📊 CONSOLIDATION ERROR REPORT\n';
        report += '=' .repeat(50) + '\n\n';
        
        // Group errors by category
        const grouped = this.groupErrorsByCategory(errors);
        
        for (const [category, categoryErrors] of Object.entries(grouped)) {
            report += `${category.toUpperCase()}: ${categoryErrors.length} errors\n`;
            report += '-'.repeat(30) + '\n';
            
            for (const error of categoryErrors) {
                const formatted = this.formatError(error);
                report += `${formatted.icon} ${formatted.message}\n`;
                report += `   Component: ${formatted.component}\n`;
                report += `   Operation: ${formatted.operation}\n`;
                report += `   Time: ${formatted.timestamp}\n`;
                
                if (formatted.suggestion) {
                    report += `   💡 Suggestion: ${formatted.suggestion}\n`;
                }
                
                if (formatted.context) {
                    report += `   📋 Context: ${formatted.context}\n`;
                }
                
                report += '\n';
            }
        }
        
        return report;
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

    generateTestReport(testResults) {
        let report = '📊 TEST EXECUTION REPORT\n';
        report += '=' .repeat(50) + '\n\n';
        
        for (const [suiteName, suiteResult] of Object.entries(testResults)) {
            report += `${suiteName.toUpperCase()}\n`;
            report += '-'.repeat(30) + '\n';
            
            if (suiteResult.total) {
                const successRate = ((suiteResult.total.passed / suiteResult.total.total) * 100).toFixed(1);
                report += `Tests: ${suiteResult.total.passed}/${suiteResult.total.total}\n`;
                report += `Success Rate: ${successRate}%\n`;
                
                if (suiteResult.error) {
                    report += `Error: ${suiteResult.error}\n`;
                }
            } else {
                report += `Error: ${suiteResult.error}\n`;
            }
            
            report += '\n';
        }
        
        return report;
    }

    generateConsolidationReport(consolidationResults) {
        let report = '🚀 CONSOLIDATION EXECUTION REPORT\n';
        report += '=' .repeat(50) + '\n\n';
        
        // Phase results
        if (consolidationResults.phases) {
            report += 'PHASE EXECUTION\n';
            report += '-'.repeat(20) + '\n';
            
            for (const [phaseName, phaseResult] of Object.entries(consolidationResults.phases)) {
                const status = phaseResult.success ? '✅ SUCCESS' : '❌ FAILED';
                report += `${phaseName}: ${status}\n`;
                
                if (phaseResult.error) {
                    report += `  Error: ${phaseResult.error}\n`;
                }
                
                if (phaseResult.duration) {
                    report += `  Duration: ${phaseResult.duration}ms\n`;
                }
            }
            
            report += '\n';
        }
        
        // Error summary
        if (consolidationResults.errors) {
            report += 'ERROR SUMMARY\n';
            report += '-'.repeat(15) + '\n';
            report += `Total Errors: ${consolidationResults.errors.length}\n`;
            
            const errorsByPhase = this.groupErrorsByPhase(consolidationResults.errors);
            
            for (const [phase, errors] of Object.entries(errorsByPhase)) {
                report += `${phase}: ${errors.length} errors\n`;
            }
            
            report += '\n';
        }
        
        // Overall status
        const overallStatus = consolidationResults.success ? '✅ SUCCESS' : '❌ FAILED';
        report += `OVERALL STATUS: ${overallStatus}\n`;
        
        if (consolidationResults.duration) {
            report += `Total Duration: ${consolidationResults.duration}ms\n`;
        }
        
        return report;
    }

    generatePerformanceReport(performanceResults) {
        let report = '⚡ PERFORMANCE REPORT\n';
        report += '=' .repeat(50) + '\n\n';
        
        for (const [testName, perfResult] of Object.entries(performanceResults)) {
            report += `${testName.toUpperCase()}\n`;
            report += '-'.repeat(30) + '\n';
            report += `Average Time: ${perfResult.average_time_ms}ms\n`;
            report += `Min Time: ${perfResult.min_time_ms}ms\n`;
            report += `Max Time: ${perfResult.max_time_ms}ms\n`;
            report += `Success Rate: ${((perfResult.successful_iterations / perfResult.iterations) * 100).toFixed(1)}%\n`;
            report += `Iterations: ${perfResult.iterations}\n`;
            report += `Successful: ${perfResult.successful_iterations}\n`;
            report += '\n';
        }
        
        return report;
    }

    generateSummaryReport(allResults) {
        let report = '📊 EXECUTIVE SUMMARY REPORT\n';
        report += '=' .repeat(50) + '\n\n';
        
        // Test summary
        if (allResults.tests) {
            const totalTests = Object.values(allResults.tests).reduce((sum, suite) => sum + (suite.total?.total || 0), 0);
            const totalPassed = Object.values(allResults.tests).reduce((sum, suite) => sum + (suite.total?.passed || 0), 0);
            const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0';
            
            report += 'TEST EXECUTION\n';
            report += '-'.repeat(20) + '\n';
            report += `Total Tests: ${totalTests}\n`;
            report += `Passed: ${totalPassed}\n`;
            report += `Failed: ${totalTests - totalPassed}\n`;
            report += `Success Rate: ${successRate}%\n\n';
        }
        
        // Error summary
        if (allResults.errors) {
            report += 'ERROR SUMMARY\n';
            report += '-'.repeat(15) + '\n';
            report += `Total Errors: ${allResults.errors.length}\n`;
            
            const errorsByCategory = this.groupErrorsByCategory(allResults.errors);
            
            for (const [category, errors] of Object.entries(errorsByCategory)) {
                report += `${category}: ${errors.length}\n`;
            }
            
            report += '\n';
        }
        
        // Performance summary
        if (allResults.performance) {
            report += 'PERFORMANCE SUMMARY\n';
            report += '-'.repeat(20) + '\n';
            
            const avgTimes = Object.values(allResults.performance).map(p => p.average_time_ms);
            const overallAvg = avgTimes.reduce((sum, time) => sum + time, 0) / avgTimes.length;
            
            report += `Average Response Time: ${Math.round(overallAvg)}ms\n`;
            report += `Total Performance Tests: ${Object.keys(allResults.performance).length}\n\n';
        }
        
        // Overall status
        const overallSuccess = this.calculateOverallSuccess(allResults);
        const status = overallSuccess ? '✅ SUCCESS' : '❌ FAILED';
        
        report += `OVERALL STATUS: ${status}\n`;
        
        return report;
    }

    groupErrorsByPhase(errors) {
        const grouped = {};
        
        for (const error of errors) {
            const phase = error.phase || 'unknown';
            if (!grouped[phase]) {
                grouped[phase] = [];
            }
            grouped[phase].push(error);
        }
        
        return grouped;
    }

    calculateOverallSuccess(results) {
        // Check if all major components succeeded
        let successCount = 0;
        let totalCount = 0;
        
        // Test success
        if (results.tests) {
            const testSuccess = Object.values(results.tests).every(suite => 
                suite.total && suite.total.passed === suite.total.total
            );
            if (testSuccess) successCount++;
            totalCount++;
        }
        
        // Consolidation success
        if (results.consolidation) {
            if (results.consolidation.success) successCount++;
            totalCount++;
        }
        
        // Error threshold (less than 5 errors is acceptable)
        if (results.errors) {
            if (results.errors.length < 5) successCount++;
            totalCount++;
        }
        
        return totalCount > 0 && (successCount / totalCount) >= 0.8;
    }

    saveReportToFile(report, filename) {
        const fs = require('fs').promises;
        const path = require('path');
        
        const reportDir = path.join(__dirname, '../../supabase/errors/reports');
        
        // Create directory if it doesn't exist
        fs.mkdir(reportDir, { recursive: true }).catch(() => {});
        
        const filePath = path.join(reportDir, filename);
        
        return fs.writeFile(filePath, report, 'utf8')
            .then(() => {
                console.log(`📄 Report saved to: ${filePath}`);
                return filePath;
            })
            .catch(error => {
                console.error('Failed to save report:', error);
                throw error;
            });
    }

    generateJSONReport(results) {
        return JSON.stringify({
            generated_at: new Date().toISOString(),
            results: results,
            summary: this.generateSummaryObject(results)
        }, null, 2);
    }

    generateSummaryObject(results) {
        const summary = {
            generated_at: new Date().toISOString(),
            overall_success: this.calculateOverallSuccess(results)
        };
        
        // Add test summary
        if (results.tests) {
            const totalTests = Object.values(results.tests).reduce((sum, suite) => sum + (suite.total?.total || 0), 0);
            const totalPassed = Object.values(results.tests).reduce((sum, suite) => sum + (suite.total?.passed || 0), 0);
            
            summary.tests = {
                total: totalTests,
                passed: totalPassed,
                failed: totalTests - totalPassed,
                success_rate: totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0'
            };
        }
        
        // Add error summary
        if (results.errors) {
            summary.errors = {
                total: results.errors.length,
                by_category: this.groupErrorsByCategory(results.errors)
            };
        }
        
        // Add performance summary
        if (results.performance) {
            const avgTimes = Object.values(results.performance).map(p => p.average_time_ms);
            const overallAvg = avgTimes.reduce((sum, time) => sum + time, 0) / avgTimes.length;
            
            summary.performance = {
                average_response_time: Math.round(overallAvg),
                total_tests: Object.keys(results.performance).length
            };
        }
        
        return summary;
    }
}

module.exports = ErrorReporter;

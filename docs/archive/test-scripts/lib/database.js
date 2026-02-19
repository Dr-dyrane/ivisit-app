/**
 * Shared Database Component
 * Centralizes database connection and common operations
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class DatabaseComponent {
    constructor() {
        this.supabase = createClient(
            process.env.EXPO_PUBLIC_SUPABASE_URL,
            process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
        );
    }

    async connect() {
        // Centralized connection logic
        console.log('🔌 Connecting to database...');
        
        try {
            // Test connection
            const { data, error } = await this.supabase
                .from('profiles')
                .select('id')
                .limit(1);
            
            if (error) {
                throw new Error(`Database connection failed: ${error.message}`);
            }
            
            console.log('✅ Database connected successfully');
            return this.supabase;
            
        } catch (error) {
            console.error('❌ Database connection error:', error.message);
            throw error;
        }
    }

    async testConnection() {
        // Shared connection testing
        console.log('🧪 Testing database connection...');
        
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('id, role, full_name')
                .limit(1);
            
            if (error) {
                throw new Error(`Connection test failed: ${error.message}`);
            }
            
            console.log('✅ Database connection test passed');
            return { data, error: null };
            
        } catch (error) {
            console.error('❌ Database connection test failed:', error.message);
            return { data: null, error };
        }
    }

    async cleanup() {
        // Shared cleanup logic
        console.log('🧹 Cleaning up database connection...');
        
        // In Supabase, there's no explicit cleanup needed
        // But we can log the cleanup for consistency
        console.log('✅ Database cleanup completed');
    }

    async executeRPC(functionName, params = {}) {
        // Centralized RPC execution
        console.log(`🔄 Executing RPC: ${functionName}`);
        
        try {
            const { data, error } = await this.supabase.rpc(functionName, params);
            
            if (error) {
                throw new Error(`RPC execution failed: ${error.message}`);
            }
            
            console.log(`✅ RPC ${functionName} executed successfully`);
            return { data, error: null };
            
        } catch (error) {
            console.error(`❌ RPC ${functionName} failed:`, error.message);
            return { data: null, error };
        }
    }

    async selectFromTable(tableName, columns = '*', filters = {}) {
        // Centralized table selection
        console.log(`📋 Selecting from ${tableName}...`);
        
        try {
            let query = this.supabase.from(tableName).select(columns);
            
            // Apply filters
            for (const [column, value] of Object.entries(filters)) {
                query = query.eq(column, value);
            }
            
            const { data, error } = await query;
            
            if (error) {
                throw new Error(`Table selection failed: ${error.message}`);
            }
            
            console.log(`✅ Selected from ${tableName} successfully`);
            return { data, error: null };
            
        } catch (error) {
            console.error(`❌ Selection from ${tableName} failed:`, error.message);
            return { data: null, error };
        }
    }

    async insertIntoTable(tableName, data) {
        // Centralized table insertion
        console.log(`➕ Inserting into ${tableName}...`);
        
        try {
            const { data: result, error } = await this.supabase
                .from(tableName)
                .insert(data)
                .select();
            
            if (error) {
                throw new Error(`Table insertion failed: ${error.message}`);
            }
            
            console.log(`✅ Inserted into ${tableName} successfully`);
            return { data: result, error: null };
            
        } catch (error) {
            console.error(`❌ Insertion into ${tableName} failed:`, error.message);
            return { data: null, error };
        }
    }

    async updateTable(tableName, data, filters = {}) {
        // Centralized table update
        console.log(`📝 Updating ${tableName}...`);
        
        try {
            let query = this.supabase.from(tableName).update(data);
            
            // Apply filters
            for (const [column, value] of Object.entries(filters)) {
                query = query.eq(column, value);
            }
            
            const { data: result, error } = await query.select();
            
            if (error) {
                throw new Error(`Table update failed: ${error.message}`);
            }
            
            console.log(`✅ Updated ${tableName} successfully`);
            return { data: result, error: null };
            
        } catch (error) {
            console.error(`❌ Update of ${tableName} failed:`, error.message);
            return { data: null, error };
        }
    }
}

module.exports = DatabaseComponent;

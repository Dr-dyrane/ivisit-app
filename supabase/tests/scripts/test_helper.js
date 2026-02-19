#!/usr/bin/env node

/**
 * Test Helper for iVisit Supabase Testing System
 * 
 * Provides full access Supabase client for UI testing and validation
 * Uses service role key for complete database access
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class TestHelper {
  constructor() {
    // Load environment variables
    this.supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

    if (!this.supabaseUrl || !this.serviceRoleKey) {
      throw new Error('Missing required environment variables:\n- EXPO_PUBLIC_SUPABASE_URL\n- SUPABASE_SERVICE_ROLE_KEY');
    }

    // Create Supabase client with service role for full access
    this.supabase = createClient(
      this.supabaseUrl,
      this.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('🔑 Test Helper initialized with full database access');
  }

  /**
   * Execute SQL with full permissions
   */
  async executeSQL(sql, params = []) {
    try {
      const { data, error } = await this.supabase.rpc('exec_sql', {
        sql: sql,
        params: params
      });

      if (error) {
        console.error('❌ SQL execution failed:', error);
        throw error;
      }

      console.log('✅ SQL executed successfully');
      return data;
    } catch (error) {
      console.error('❌ SQL execution error:', error.message);
      throw error;
    }
  }

  /**
   * Create test data with full permissions
   */
  async createTestData(tableName, data) {
    try {
      const { data: result, error } = await this.supabase
        .from(tableName)
        .insert(data)
        .select();

      if (error) {
        console.error(`❌ Failed to create test data in ${tableName}:`, error);
        throw error;
      }

      console.log(`✅ Created test data in ${tableName}`);
      return result;
    } catch (error) {
      console.error(`❌ Test data creation error in ${tableName}:`, error.message);
      throw error;
    }
  }

  /**
   * Clean up test data
   */
  async cleanupTestData(tableName, condition = {}) {
    try {
      let query = this.supabase.from(tableName);

      // Apply conditions if provided
      if (condition.id) {
        query = query.eq('id', condition.id);
      }
      if (condition.display_id) {
        query = query.eq('display_id', condition.display_id);
      }
      if (condition.email) {
        query = query.eq('email', condition.email);
      }

      const { error } = await query.delete();

      if (error) {
        console.error(`❌ Failed to cleanup ${tableName}:`, error);
        throw error;
      }

      console.log(`✅ Cleaned up test data from ${tableName}`);
    } catch (error) {
      console.error(`❌ Cleanup error in ${tableName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get table data with full permissions
   */
  async getTableData(tableName, columns = '*', limit = 10) {
    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select(columns)
        .limit(limit);

      if (error) {
        console.error(`❌ Failed to get data from ${tableName}:`, error);
        throw error;
      }

      console.log(`✅ Retrieved ${data.length} records from ${tableName}`);
      return data;
    } catch (error) {
      console.error(`❌ Data retrieval error in ${tableName}:`, error.message);
      throw error;
    }
  }

  /**
   * Call RPC function with full permissions
   */
  async callRPC(functionName, params = {}) {
    try {
      const { data, error } = await this.supabase.rpc(functionName, params);

      if (error) {
        console.error(`❌ RPC call failed for ${functionName}:`, error);
        throw error;
      }

      console.log(`✅ RPC call successful for ${functionName}`);
      return data;
    } catch (error) {
      console.error(`❌ RPC call error in ${functionName}:`, error.message);
      throw error;
    }
  }

  /**
   * Test user creation for UI testing
   */
  async createTestUser(userData) {
    const defaultUserData = {
      email: `test-${Date.now()}@example.com`,
      first_name: 'Test',
      last_name: 'User',
      role: 'patient',
      ...userData
    };

    try {
      // Create user in profiles table
      const result = await this.createTestData('profiles', defaultUserData);

      // Create associated wallet
      await this.createTestData('patient_wallets', {
        user_id: result[0].id,
        balance: 1000.00,
        currency: 'USD'
      });

      console.log(`✅ Created test user: ${defaultUserData.email}`);
      return result[0];
    } catch (error) {
      console.error('❌ Test user creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Test emergency creation for UI testing
   */
  async createTestEmergency(emergencyData) {
    const defaultEmergencyData = {
      user_id: null, // Will be set from test user
      hospital_id: '00000000-0000-0000-0000-000000000000',
      service_type: 'ambulance',
      hospital_name: 'Test Hospital',
      specialty: 'Emergency Medicine',
      ambulance_type: 'BLS',
      patient_location: { lat: 40.7128, lng: -74.0060 },
      patient_snapshot: {},
      status: 'pending_approval',
      ...emergencyData
    };

    try {
      const result = await this.createTestData('emergency_requests', defaultEmergencyData);
      console.log(`✅ Created test emergency: ${result[0].display_id}`);
      return result[0];
    } catch (error) {
      console.error('❌ Test emergency creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Validate table structure
   */
  async validateTableStructure(tableName) {
    try {
      const { data, error } = await this.supabase
        .rpc('get_table_structure', { table_name: tableName });

      if (error) {
        console.error(`❌ Failed to validate structure for ${tableName}:`, error);
        throw error;
      }

      console.log(`✅ Validated structure for ${tableName}`);
      return data;
    } catch (error) {
      console.error(`❌ Structure validation error in ${tableName}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if function exists
   */
  async functionExists(functionName) {
    try {
      const { data, error } = await this.supabase
        .rpc('function_exists', { function_name: functionName });

      if (error) {
        console.error(`❌ Failed to check function existence for ${functionName}:`, error);
        return false;
      }

      const exists = data && data.length > 0;
      console.log(`${exists ? '✅' : '❌'} Function ${functionName} ${exists ? 'exists' : 'does not exist'}`);
      return exists;
    } catch (error) {
      console.error(`❌ Function existence check error for ${functionName}:`, error.message);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    const tables = [
      'profiles', 'organizations', 'hospitals', 'doctors',
      'ambulances', 'emergency_requests', 'visits',
      'patient_wallets', 'organization_wallets', 'payments',
      'notifications', 'id_mappings'
    ];

    const stats = {};

    for (const table of tables) {
      try {
        const { count, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          stats[table] = { error: error.message };
        } else {
          stats[table] = { count: count || 0 };
        }
      } catch (error) {
        stats[table] = { error: error.message };
      }
    }

    return stats;
  }

  /**
   * Run comprehensive database validation
   */
  async validateDatabase() {
    console.log('🔍 Running comprehensive database validation...');

    const results = {
      tables: {},
      functions: {},
      stats: {},
      success: true
    };

    // Validate tables
    const tables = [
      'profiles', 'organizations', 'hospitals', 'doctors',
      'ambulances', 'emergency_requests', 'visits',
      'patient_wallets', 'organization_wallets', 'payments',
      'notifications', 'id_mappings'
    ];

    for (const table of tables) {
      try {
        await this.validateTableStructure(table);
        results.tables[table] = { status: 'valid' };
      } catch (error) {
        results.tables[table] = { status: 'invalid', error: error.message };
        results.success = false;
      }
    }

    // Validate functions
    const functions = [
      'nearby_hospitals', 'nearby_ambulances', 'create_emergency_v4',
      'get_entity_id', 'is_admin', 'exec_sql'
    ];

    for (const func of functions) {
      const exists = await this.functionExists(func);
      results.functions[func] = { exists };
      if (!exists) {
        results.success = false;
      }
    }

    // Get statistics
    results.stats = await this.getDatabaseStats();

    return results;
  }

  /**
   * Clean up all test data
   */
  async cleanupAllTestData() {
    console.log('🧹 Cleaning up all test data...');

    const testPatterns = {
      email: 'test-',
      display_id: 'PAT-',
      display_id_prefix: 'PAT-'
    };

    try {
      // Clean up profiles with test emails
      const { error: profileError } = await this.supabase
        .from('profiles')
        .like('email', 'test-%')
        .delete();

      if (profileError) {
        console.error('❌ Failed to cleanup test profiles:', profileError);
      } else {
        console.log('✅ Cleaned up test profiles');
      }

      // Clean up related data
      const relatedTables = ['emergency_requests', 'patient_wallets', 'payments', 'notifications'];

      for (const table of relatedTables) {
        try {
          const { error } = await this.supabase
            .from(table)
            .like('display_id', 'PAT-%')
            .delete();

          if (error) {
            console.error(`❌ Failed to cleanup ${table}:`, error);
          } else {
            console.log(`✅ Cleaned up ${table}`);
          }
        } catch (error) {
          console.error(`❌ Cleanup error in ${table}:`, error.message);
        }
      }

    } catch (error) {
      console.error('❌ Cleanup error:', error.message);
      throw error;
    }
  }
}

module.exports = TestHelper;

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class DatabaseComponent {
    constructor() {
        this.supabase = createClient(
            process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
            process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
        );
    }

    async executeRPC(name, params = {}) {
        const { data, error } = await this.supabase.rpc(name, params);
        return { data, error };
    }

    async query(table) {
        return this.supabase.from(table).select('*');
    }
}

module.exports = DatabaseComponent;

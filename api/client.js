import 'react-native-url-polyfill/auto';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/**
 * API Client Configuration
 */

// ============================================
// CONFIGURATION
// ============================================

const cleanEnvValue = (value) => {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (trimmed.startsWith("`") && trimmed.endsWith("`") && trimmed.length > 1) {
		return trimmed.slice(1, -1).trim() || null;
	}
	return trimmed;
};

const supabaseUrl = cleanEnvValue(process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseAnonKey =
	cleanEnvValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) ??
	cleanEnvValue(process.env.EXPO_PUBLIC_SUPABASE_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase URL or Key is missing. Check your .env file.");
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

export const API_CONFIG = {
	USE_REMOTE_BACKEND: true,
	BASE_URL: supabaseUrl,
	API_VERSION: "v1",
	TIMEOUT: 30000,
};

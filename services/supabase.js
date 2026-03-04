import 'react-native-url-polyfill/auto';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Client Configuration
 * 
 * File Path: services/supabase.js
 */

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
const REFRESH_TOKEN_ERROR_PATTERNS = [
	"invalid refresh token",
	"refresh token not found",
	"refresh_token_not_found",
];
let lastRefreshGuardLogMs = 0;

// Force debug logging if values are missing
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Supabase Config Error] Missing URL or Key.", {
        url: !!supabaseUrl,
        key: !!supabaseAnonKey,
        env: process.env.NODE_ENV
    });
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

const isRefreshTokenError = (error) => {
	const message = String(error?.message || error || "").toLowerCase();
	if (!message) return false;
	return REFRESH_TOKEN_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};

const clearSupabasePersistedSession = async () => {
	try {
		const keys = await AsyncStorage.getAllKeys();
		const supabaseAuthKeys = keys.filter(
			(key) => key.startsWith("sb-") && key.endsWith("-auth-token")
		);
		if (supabaseAuthKeys.length > 0) {
			await AsyncStorage.multiRemove(supabaseAuthKeys);
		}
	} catch (error) {
		console.warn("[Supabase Auth Guard] Failed to clear persisted auth token keys:", error);
	}
};

const guardRefreshTokenFailure = async (error) => {
	if (!isRefreshTokenError(error)) return false;
	const now = Date.now();
	if (now - lastRefreshGuardLogMs > 5000) {
		lastRefreshGuardLogMs = now;
		console.warn("[Supabase Auth Guard] Invalid refresh token detected. Clearing local Supabase session cache.");
	}
	await clearSupabasePersistedSession();
	return true;
};

const wrapAuthMethod = (methodName, fallbackData) => {
	const originalMethod = supabase.auth?.[methodName];
	if (typeof originalMethod !== "function") return;

	supabase.auth[methodName] = async (...args) => {
		try {
			const response = await originalMethod.bind(supabase.auth)(...args);
			if (response?.error && (await guardRefreshTokenFailure(response.error))) {
				return { data: fallbackData, error: null };
			}
			return response;
		} catch (error) {
			if (await guardRefreshTokenFailure(error)) {
				return { data: fallbackData, error: null };
			}
			throw error;
		}
	};
};

wrapAuthMethod("getSession", { session: null });
wrapAuthMethod("getUser", { user: null });
wrapAuthMethod("refreshSession", { session: null, user: null });

export const API_CONFIG = {
	USE_REMOTE_BACKEND: true,
	BASE_URL: supabaseUrl,
	API_VERSION: "v1",
	TIMEOUT: 30000,
};

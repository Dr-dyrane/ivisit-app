import { createClient } from "@supabase/supabase-js";

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
const supabaseKey =
	cleanEnvValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) ??
	cleanEnvValue(process.env.EXPO_PUBLIC_SUPABASE_KEY) ??
	cleanEnvValue(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

if (!supabaseUrl || !supabaseKey) {
	throw new Error(
		"Missing env: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or EXPO_PUBLIC_SUPABASE_KEY)"
	);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase.auth.getSession();
if (error) throw error;

console.log("Supabase OK. Session present:", Boolean(data?.session));


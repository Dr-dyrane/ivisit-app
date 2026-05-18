import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getEnv } from "../env/env.ts";

export const createServiceClient = () => {
  const supabaseUrl = getEnv("SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  );

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service configuration");
  }

  return createClient(supabaseUrl, serviceRoleKey);
};

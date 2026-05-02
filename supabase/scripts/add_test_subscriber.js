#!/usr/bin/env node
/**
 * Add a single test subscriber directly to the database.
 * Usage: node supabase/scripts/add_test_subscriber.js
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TEST_EMAIL = "halodyrane@gmail.com";

async function addTestSubscriber() {
  console.log(`➕ Adding test subscriber: ${TEST_EMAIL}`);

  const { data, error } = await supabase
    .from("subscribers")
    .upsert(
      {
        email: TEST_EMAIL,
        type: "free",
        status: "active",
        new_user: true,
        welcome_email_sent: false,
        metadata: { source: "manual_test", added_at: new Date().toISOString() },
      },
      { onConflict: "email" }
    )
    .select();

  if (error) {
    console.error("❌ Failed to add subscriber:", error.message);
    process.exit(1);
  }

  console.log("✅ Subscriber added/updated successfully:");
  console.log(JSON.stringify(data, null, 2));
}

addTestSubscriber();

#!/usr/bin/env node
/**
 * Batch insert test subscribers into the database.
 * Usage: node supabase/scripts/add_subscriber_batch.js
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

const EMAILS = [
  "umehchioma01@gmail.com",
  "somtochukwuuwasomba@gmail.com", // corrected typo from gmil -> gmail
  "umehnonsoo@gmail.com",
  "Ericaprecious18@gmail.com",
  "taiwomuraina19@gmail.com",
];

async function addSubscriberBatch() {
  const results = [];

  for (const email of EMAILS) {
    const { data, error } = await supabase
      .from("subscribers")
      .upsert(
        {
          email: email.toLowerCase().trim(),
          type: "free",
          status: "active",
          new_user: true,
          welcome_email_sent: false,
          metadata: { source: "manual_batch", added_at: new Date().toISOString() },
        },
        { onConflict: "email" }
      )
      .select("email, status, created_at");

    if (error) {
      console.error(`❌ Failed for ${email}:`, error.message);
      results.push({ email, status: "error", error: error.message });
    } else {
      console.log(`✅ Added/updated: ${email}`);
      results.push({ email, status: "success", data });
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total: ${EMAILS.length}`);
  console.log(`Success: ${results.filter(r => r.status === "success").length}`);
  console.log(`Failed: ${results.filter(r => r.status === "error").length}`);
}

addSubscriberBatch();

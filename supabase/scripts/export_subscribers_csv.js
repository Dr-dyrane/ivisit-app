#!/usr/bin/env node
/**
 * Export subscriber emails to comma-separated list.
 * Usage: node supabase/scripts/export_subscribers_csv.js [--output=path/to/file.csv] [--status=active]
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
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

// Parse CLI args
const args = process.argv.slice(2);
const outputArg = args.find((a) => a.startsWith("--output="));
const statusArg = args.find((a) => a.startsWith("--status="));

const OUTPUT_PATH = outputArg
  ? outputArg.replace("--output=", "")
  : path.join(__dirname, "../../exports/subscribers_emails.csv");
const STATUS_FILTER = statusArg ? statusArg.replace("--status=", "") : "active";

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function exportSubscribers() {
  console.log(`⏳ Fetching subscribers with status: ${STATUS_FILTER}...`);

  let query = supabase
    .from("subscribers")
    .select("email")
    .order("created_at", { ascending: false });

  if (STATUS_FILTER !== "all") {
    query = query.eq("status", STATUS_FILTER);
  }

  const { data: subscribers, error } = await query;

  if (error) {
    console.error("❌ Failed to fetch subscribers:", error.message);
    process.exit(1);
  }

  if (!subscribers || subscribers.length === 0) {
    console.log("⚠️ No subscribers found matching criteria.");
    process.exit(0);
  }

  console.log(`✅ Found ${subscribers.length} subscribers`);

  // Extract and normalize emails
  const emails = subscribers
    .map((sub) => sub.email?.toLowerCase().trim())
    .filter(Boolean);

  // Comma-separated format
  const csvContent = emails.join(", ");

  // Write file
  fs.writeFileSync(OUTPUT_PATH, csvContent, "utf8");

  console.log(`\n✅ Emails exported successfully:`);
  console.log(`   File: ${OUTPUT_PATH}`);
  console.log(`   Count: ${emails.length}`);
  console.log(`\n📧 Preview:`);
  console.log(`   ${csvContent.slice(0, 120)}${csvContent.length > 120 ? "..." : ""}`);
}

exportSubscribers();

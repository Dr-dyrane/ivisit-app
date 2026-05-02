#!/usr/bin/env node
/**
 * Send a test custom email via the sendCustomEmail edge function.
 */

const https = require("https");

const SUPABASE_URL = "dlwtcmhdzoklveihuhjf.supabase.co";
const ANON_KEY = "sb_publishable_KZBb509YWMrTkPbtuE-0yg_vWIfnxl8";

const payload = {
  email: "halodyrane@gmail.com",
  subject: "iVisit 1.0.5 is here — Testing invite inside",
  content:
    "iVisit 1.0.5 is now live with refined tracking, hardened CTA states, and a calmer emergency flow. We are opening a small testing window for close collaborators this week. Open the app, run through an ambulance or bed reservation flow, and reply with anything that feels off. If the staging update does not appear, force-close and reopen.",
};

const body = JSON.stringify(payload);

const options = {
  hostname: SUPABASE_URL,
  port: 443,
  path: "/functions/v1/sendCustomEmail",
  method: "POST",
  headers: {
    Authorization: `Bearer ${ANON_KEY}`,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  },
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${data}`);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log("✅ Email sent successfully");
    } else {
      console.error("❌ Failed to send email");
      process.exit(1);
    }
  });
});

req.on("error", (err) => {
  console.error("❌ Request error:", err.message);
  process.exit(1);
});

req.write(body);
req.end();

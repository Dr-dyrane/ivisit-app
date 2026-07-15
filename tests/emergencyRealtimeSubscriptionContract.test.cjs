const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

const serverSync = read("hooks/emergency/useEmergencyServerSync.js");
const realtime = read("hooks/emergency/useEmergencyRealtime.js");
const emergencyContext = read("contexts/EmergencyContext.jsx");

assert.match(
  serverSync,
  /const \{ refetch \} = useActiveTripQuery\(\{ parseEtaToSeconds, userId \}\);/,
  "server sync must retain a stable refetch function rather than the mutable query result object",
);
assert.match(serverSync, /export function useEmergencyServerSync\(\{\s*userId,/);
assert.match(serverSync, /await refetch\(\);/);
assert.match(serverSync, /\[refetch\]/);
assert.doesNotMatch(serverSync, /\[query\]/);

const mainSubscriptionStart = realtime.indexOf("Main emergency_requests subscription");
const perTripSubscriptionStart = realtime.indexOf("Per-trip ambulance subscriptions");
assert.ok(mainSubscriptionStart >= 0 && perTripSubscriptionStart > mainSubscriptionStart);
const mainSubscription = realtime.slice(mainSubscriptionStart, perTripSubscriptionStart);

assert.match(mainSubscription, /if \(!userId\) return undefined;/);
assert.match(mainSubscription, /filter: `user_id=eq\.\$\{userId\}`/);
assert.doesNotMatch(
  mainSubscription,
  /supabase\.auth\.getUser\(\)/,
  "the main realtime subscription must use AuthContext identity instead of competing for the auth navigator lock",
);
assert.match(mainSubscription, /Failed to setup main emergency subscription/);
assert.match(mainSubscription, /Failed to remove main emergency subscription/);

assert.match(emergencyContext, /import \{ useAuth \} from "\.\/AuthContext";/);
assert.match(emergencyContext, /const userId = user\?\.id \?\? null;/);
assert.match(emergencyContext, /useEmergencyRealtime\(\{\s*userId,/);

console.log("PASS emergency realtime subscription contract");

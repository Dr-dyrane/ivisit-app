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

// --- E15: async setup must not leak channels on fast unmount ---

const bedSubscriptionStart = realtime.indexOf("Bed subscription");
const locationSyncStart = realtime.indexOf("Live patient location sync");
assert.ok(bedSubscriptionStart > perTripSubscriptionStart);
assert.ok(locationSyncStart > bedSubscriptionStart);
const perTripSubscription = realtime.slice(perTripSubscriptionStart, bedSubscriptionStart);
const bedSubscription = realtime.slice(bedSubscriptionStart, locationSyncStart);

for (const [label, block] of [
  ["per-trip", perTripSubscription],
  ["bed", bedSubscription],
]) {
  assert.match(
    block,
    /let isCancelled = false;/,
    `${label} subscription setup must track cancellation across its awaits`,
  );
  assert.match(
    block,
    /if \(isCancelled\) \{/,
    `${label} subscription must unsubscribe a channel that resolved after unmount`,
  );
  assert.match(
    block,
    /isCancelled = true;/,
    `${label} subscription cleanup must set the cancellation flag`,
  );
}

// --- E16: bed availability must reach a real consumer ---

// updateHospitals derives a value and drops it, so a bed patch routed through
// it is dead. The query cache is the only convergence layer.
assert.doesNotMatch(
  bedSubscription,
  /updateHospitals\(/,
  "the bed channel must not patch through the no-op updateHospitals",
);
assert.match(bedSubscription, /queryClient\.setQueriesData\(/);
assert.match(bedSubscription, /queryKey: \["hospitals"\]/);
assert.match(bedSubscription, /applyBedAvailabilityToHospitalsCache\(entry, payload\.new\)/);
assert.doesNotMatch(
  bedSubscription,
  /\bhospitals,/,
  "the bed effect must not depend on the hospitals list, which churns the channel",
);
assert.match(
  bedSubscription,
  /\}, \[activeBedBooking\?\.hospitalId, handleRealtimeStatus, queryClient\]\);/,
  "the bed effect resubscribes only when the booked hospital changes",
);
assert.doesNotMatch(
  realtime,
  /^\tupdateHospitals,$/m,
  "useEmergencyRealtime no longer needs the hospitals override path",
);
assert.doesNotMatch(emergencyContext, /\t\tupdateHospitals,\n\t\thospitals,\n/);

const {
  applyBedAvailabilityToHospitalsCache,
} = require("../utils/emergencyRealtimeProjection");

// useEmergencyHospitalsQuery caches an object; useHospitalsQuery caches a bare
// array. Both live under the ["hospitals", ...] prefix the patch sweeps.
const objectEntry = {
  allHospitals: [
    { id: "h1", availableBeds: 4 },
    { id: "h2", availableBeds: 9 },
  ],
  displayHospitals: [{ id: "h1", availableBeds: 4 }],
  categories: { immediate: [{ id: "h1", availableBeds: 4 }] },
};
const patchedObject = applyBedAvailabilityToHospitalsCache(objectEntry, {
  id: "h1",
  available_beds: 2,
});
assert.deepStrictEqual(patchedObject.allHospitals, [
  { id: "h1", availableBeds: 2 },
  { id: "h2", availableBeds: 9 },
]);
assert.deepStrictEqual(patchedObject.displayHospitals, [
  { id: "h1", availableBeds: 2 },
]);
assert.deepStrictEqual(patchedObject.categories.immediate, [
  { id: "h1", availableBeds: 2 },
]);

const arrayEntry = [
  { id: "h1", availableBeds: 4 },
  { id: "h2", availableBeds: 9 },
];
assert.deepStrictEqual(
  applyBedAvailabilityToHospitalsCache(arrayEntry, { id: "h2", available_beds: 0 }),
  [
    { id: "h1", availableBeds: 4 },
    { id: "h2", availableBeds: 0 },
  ],
  "a bare-array hospitals cache must survive the same patch",
);

assert.strictEqual(
  applyBedAvailabilityToHospitalsCache(objectEntry, { id: "h1", available_beds: 4 }),
  objectEntry,
  "an unchanged bed count must not churn the cache identity",
);
assert.strictEqual(
  applyBedAvailabilityToHospitalsCache(objectEntry, { id: "h9", available_beds: 1 }),
  objectEntry,
  "a record for an uncached hospital must not touch the cache",
);
assert.strictEqual(
  applyBedAvailabilityToHospitalsCache(objectEntry, { id: "h1" }),
  objectEntry,
  "a payload without available_beds must never fabricate a bed count",
);
assert.strictEqual(
  applyBedAvailabilityToHospitalsCache(objectEntry, { id: "h1", available_beds: null }),
  objectEntry,
);
assert.strictEqual(
  applyBedAvailabilityToHospitalsCache(undefined, { id: "h1", available_beds: 3 }),
  undefined,
  "an unhydrated cache entry must be left alone",
);

console.log("PASS emergency realtime subscription contract");

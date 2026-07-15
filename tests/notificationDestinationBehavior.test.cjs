const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const babel = require("@babel/core");

const root = path.resolve(__dirname, "..");

function loadNotificationDestination() {
  const source = fs.readFileSync(
    path.join(root, "hooks/notifications/notificationDestination.js"),
    "utf8",
  );
  const transformed = babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")],
  });
  const loadedModule = { exports: {} };
  const calls = [];
  const navigationHelpers = {};

  for (const helperName of [
    "navigateToHelpSupport",
    "navigateToInsurance",
    "navigateToNotificationDetails",
    "navigateToPayment",
    "navigateToProfile",
    "navigateToSOS",
    "navigateToVisitDetails",
    "navigateToVisits",
  ]) {
    navigationHelpers[helperName] = (args) => {
      calls.push({ helperName, args });
    };
  }

  const localRequire = (request) => {
    if (request === "../../utils/navigationHelpers") {
      return navigationHelpers;
    }
    return require(request);
  };
  const evaluate = new Function(
    "module",
    "exports",
    "require",
    transformed.code,
  );
  evaluate(loadedModule, loadedModule.exports, localRequire);

  return { ...loadedModule.exports, calls };
}

const router = { id: "router" };
const setEmergencyMode = () => {};
const method = "replace";

function proveRoute({
  actionType,
  actionData,
  label,
  destination,
  helperName,
  expectedArgs,
}) {
  const loaded = loadNotificationDestination();
  const notification = { id: `notification-${actionType}`, actionType, actionData };

  assert.equal(
    loaded.getNotificationPrimaryActionLabel(notification),
    label,
    `${actionType} label`,
  );
  assert.equal(
    loaded.routeNotificationDestination({
      notification,
      router,
      setEmergencyMode,
      method,
    }),
    destination,
    `${actionType} destination`,
  );
  assert.deepEqual(loaded.calls, [
    {
      helperName,
      args: expectedArgs,
    },
  ]);
}

const requestActionCases = [
  ["track", "Open request"],
  ["view_request", "Open request"],
  ["retry_payment", "Open request"],
  ["track_emergency", "Track request"],
  ["acknowledge_responder_arrival", "Confirm arrival"],
  ["view_emergency_request", "Open request"],
  ["view_emergency", "Open request"],
];

for (const [actionType, label] of requestActionCases) {
  proveRoute({
    actionType,
    actionData: { requestId: "request-1" },
    label,
    destination: "request",
    helperName: "navigateToSOS",
    expectedArgs: { router, setEmergencyMode, method },
  });
}

proveRoute({
  actionType: "view_payment",
  actionData: { paymentId: "payment-1", requestId: "request-1" },
  label: "Open payment",
  destination: "payment",
  helperName: "navigateToPayment",
  expectedArgs: { router, method },
});

for (const actionType of [
  "view_appointment",
  "view_visit",
  "view_summary",
  "view_scheduled_visit",
  "open_async_consult",
]) {
  proveRoute({
    actionType,
    actionData: { visitId: " visit-1 " },
    label: actionType === "open_async_consult" ? "Open consult" : "Open visit",
    destination: "visit_detail",
    helperName: "navigateToVisitDetails",
    expectedArgs: { router, visitId: "visit-1", method },
  });

  proveRoute({
    actionType,
    actionData: { requestId: "request-1" },
    label: "Open visits",
    destination: "visits",
    helperName: "navigateToVisits",
    expectedArgs: {
      router,
      filter: actionType === "view_appointment" ? "upcoming" : undefined,
      method,
    },
  });
}

proveRoute({
  actionType: "view_emergency_visit",
  actionData: { requestId: "request-1" },
  label: "Open visit",
  destination: "visit_detail",
  helperName: "navigateToVisitDetails",
  expectedArgs: { router, visitId: "request-1", method },
});

proveRoute({
  actionType: "upgrade",
  label: "Open account",
  destination: "profile",
  helperName: "navigateToProfile",
  expectedArgs: { router, method },
});

proveRoute({
  actionType: "view_ticket",
  actionData: { ticketId: "ticket-1" },
  label: "Open support",
  destination: "support",
  helperName: "navigateToHelpSupport",
  expectedArgs: { router, ticketId: "ticket-1", method },
});

proveRoute({
  actionType: "view_insurance",
  label: "Open coverage",
  destination: "insurance",
  helperName: "navigateToInsurance",
  expectedArgs: { router, method },
});

const fallback = loadNotificationDestination();
const unknownNotification = {
  id: "notification-unknown",
  actionType: "unknown_action",
};
assert.equal(
  fallback.getNotificationPrimaryActionLabel(unknownNotification),
  null,
);
assert.equal(
  fallback.routeNotificationDestination({
    notification: unknownNotification,
    router,
    method,
  }),
  "notification_detail",
);
assert.deepEqual(fallback.calls, [
  {
    helperName: "navigateToNotificationDetails",
    args: {
      router,
      notificationId: "notification-unknown",
      method,
    },
  },
]);

const noFallback = loadNotificationDestination();
assert.equal(
  noFallback.routeNotificationDestination({
    notification: unknownNotification,
    router,
    method,
    fallbackToDetails: false,
  }),
  null,
);
assert.deepEqual(noFallback.calls, []);

const appointmentKey = loadNotificationDestination();
assert.equal(
  appointmentKey.getNotificationVisitKey({
    actionData: { appointmentId: " appointment-1 " },
  }),
  "appointment-1",
);
assert.equal(
  appointmentKey.getNotificationPrimaryActionLabel({
    actionType: "unknown_action",
    actionData: { visitId: "visit-2" },
  }),
  "Open visit",
);

console.log("PASS notification destination routing and labels");

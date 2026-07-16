const assert = require("assert");
const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function loadModule(relativePath, stubs) {
  const transformed = babel.transformSync(read(relativePath), {
    babelrc: false,
    configFile: false,
    plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")],
  });
  const loaded = { exports: {} };
  new Function(
    "module",
    "exports",
    "require",
    transformed.code,
  )(loaded, loaded.exports, (request) => {
    if (request in stubs) return stubs[request];
    throw new Error(`Unstubbed require: ${request}`);
  });
  return loaded.exports;
}

function extract(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notStrictEqual(start, -1, `Missing marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notStrictEqual(end, -1, `Missing marker: ${endMarker}`);
  return source.slice(start, end);
}

const securitySql = read("supabase/migrations/20260219000700_security.sql");
const operationsSql = read("supabase/migrations/20260219000500_ops_content.sql");
assert.match(
  securitySql,
  /REVOKE INSERT, UPDATE, DELETE ON public\.notifications FROM anon, authenticated;/,
);
assert.match(
  securitySql,
  /GRANT UPDATE \(read, dismissed_at, updated_at\) ON public\.notifications TO authenticated;/,
);

assert.match(operationsSql, /ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ/);
assert.match(
  operationsSql,
  /notifications_recipient_active_created_idx[\s\S]*WHERE dismissed_at IS NULL/,
);
assert.match(
  securitySql,
  /USING \(auth\.uid\(\) = user_id\)[\s\S]*WITH CHECK \(auth\.uid\(\) = user_id\)/,
);
assert.match(
  securitySql,
  /GRANT UPDATE \(read, dismissed_at, updated_at\) ON public\.notifications TO authenticated/,
);

const notificationService = read("services/notificationsService.js");
const createMethod = extract(
  notificationService,
  "async create(_notification)",
  "async markAsRead",
);
assert.doesNotMatch(createMethod, /\.insert\s*\(/);
assert.match(createMethod, /return null;/);

const dismissalMethods = extract(
  notificationService,
  "async dismiss(id)",
  "subscribe(userId",
);
assert.doesNotMatch(dismissalMethods, /\.delete\s*\(/);
assert.match(dismissalMethods, /dismissed_at/);
assert.match(notificationService, /\.is\("dismissed_at", null\)/);

for (const relativePath of [
  "services/notificationDispatcher.js",
  "services/seederService.js",
]) {
  const source = read(relativePath);
  assert.doesNotMatch(
    source,
    /\.from\(["']notifications["']\)[\s\S]{0,160}?\.insert\s*\(/,
    `${relativePath} must not insert notification rows from the client`,
  );
}

const notificationScreen = read(
  "components/notifications/NotificationsScreenOrchestrator.jsx",
);
const selectionBar = read(
  "components/notifications/NotificationsSelectionBar.jsx",
);
const notificationList = read("components/notifications/NotificationsList.jsx");
assert.doesNotMatch(notificationScreen, /onDeleteSelected|trash-outline/);
assert.doesNotMatch(selectionBar, /onDeleteSelected|trash-outline/);
assert.match(notificationScreen, /onClearSelected/);
assert.match(selectionBar, /onClearSelected/);
assert.match(notificationList, /onClearSection/);

const consoleServicePath = path.resolve(
  ROOT,
  "..",
  "ivisit-console",
  "frontend",
  "src",
  "services",
  "notificationService.js",
);
if (fs.existsSync(consoleServicePath)) {
  const consoleService = fs.readFileSync(consoleServicePath, "utf8");
  const consoleCreate = extract(
    consoleService,
    "export const createNotification",
    "export const subscribeToNotifications",
  );
  assert.doesNotMatch(consoleCreate, /\.insert\s*\(/);
  assert.match(consoleCreate, /database hooks own canonical notification creation/i);
  assert.match(consoleService, /export const dismissNotifications/);
  assert.match(consoleService, /dismissed_at/);
  assert.match(consoleService, /\.is\('dismissed_at', null\)/);
  assert.doesNotMatch(consoleService, /\.from\('notifications'\)[\s\S]{0,180}?\.delete\s*\(/);
}

// --- E14: notification arrival feedback ---

// soundService/hapticService expose only a default object plus loose named
// functions. A named `import { soundService }` binds undefined and every call
// through it throws, which is how sound init silently died.
const soundModule = loadModule("services/soundService.js", {
  "expo-av": { Audio: { setAudioModeAsync: async () => {} } },
  "../constants/notifications": { NOTIFICATION_PRIORITY: {} },
});
assert.strictEqual(
  soundModule.soundService,
  undefined,
  "soundService.js exposes no named soundService export",
);
assert.strictEqual(
  typeof soundModule.default,
  "object",
  "soundService.js exposes a default export",
);
assert.match(
  read("contexts/PreferencesContext.jsx"),
  /import soundService from "\.\.\/services\/soundService";/,
  "PreferencesContext must default-import soundService or init/loadSounds throw",
);

function runRealtimeArrival({ preferences, event }) {
  const played = [];
  const hapticed = [];
  const invalidated = [];
  let subscribedUserId = null;
  let notify = null;

  const hook = loadModule("hooks/notifications/useNotificationsRealtime.js", {
    react: {
      useEffect: (fn) => {
        fn();
      },
      useRef: (initial) => ({ current: initial }),
    },
    "@tanstack/react-query": {
      useQueryClient: () => ({
        invalidateQueries: (args) => invalidated.push(args),
      }),
    },
    "../../contexts/PreferencesContext": {
      usePreferences: () => ({ preferences }),
    },
    "../../services/notificationsService": {
      notificationsService: {
        subscribe: (userId, onEvent) => {
          subscribedUserId = userId;
          notify = onEvent;
          return { unsubscribe: () => {} };
        },
      },
    },
    "../../services/hapticService": {
      __esModule: true,
      default: { triggerForPriority: (priority) => hapticed.push(priority) },
    },
    "../../services/soundService": {
      __esModule: true,
      default: { playForPriority: (priority) => played.push(priority) },
    },
    "./notifications.queryKeys": {
      notificationsQueryKeys: { list: (id) => ["notifications", id] },
    },
  });

  hook.useNotificationsRealtime({ userId: "user-1", enabled: true });
  assert.strictEqual(subscribedUserId, "user-1");
  assert.strictEqual(typeof notify, "function");
  notify(event);

  return { played, hapticed, invalidated };
}

const urgentArrival = runRealtimeArrival({
  preferences: { notificationsEnabled: true, notificationSoundsEnabled: true },
  event: { eventType: "INSERT", new: { id: "n1", priority: "urgent" } },
});
assert.deepStrictEqual(
  urgentArrival.played,
  ["urgent"],
  "an inserted notification must play its priority sound",
);
assert.deepStrictEqual(
  urgentArrival.hapticed,
  ["urgent"],
  "an inserted notification must trigger its priority haptic",
);
assert.deepStrictEqual(urgentArrival.invalidated, [
  { queryKey: ["notifications", "user-1"] },
]);

const updateEvent = runRealtimeArrival({
  preferences: { notificationsEnabled: true, notificationSoundsEnabled: true },
  event: { eventType: "UPDATE", new: { id: "n1", priority: "urgent" } },
});
assert.deepStrictEqual(
  updateEvent.played,
  [],
  "marking a notification read must stay silent",
);
assert.deepStrictEqual(updateEvent.hapticed, []);
assert.deepStrictEqual(
  updateEvent.invalidated,
  [{ queryKey: ["notifications", "user-1"] }],
  "non-arrival events still converge the query layer",
);

const notificationsOff = runRealtimeArrival({
  preferences: { notificationsEnabled: false, notificationSoundsEnabled: true },
  event: { eventType: "INSERT", new: { id: "n1", priority: "urgent" } },
});
assert.deepStrictEqual(
  notificationsOff.played,
  [],
  "the master notifications toggle must silence arrival sound",
);
assert.deepStrictEqual(
  notificationsOff.hapticed,
  [],
  "the master notifications toggle must silence arrival haptics",
);

const missingPriority = runRealtimeArrival({
  preferences: { notificationsEnabled: true },
  event: { eventType: "INSERT", new: { id: "n1" } },
});
assert.deepStrictEqual(missingPriority.played, []);
assert.deepStrictEqual(missingPriority.hapticed, []);

assert.strictEqual(
  fs.existsSync(path.join(ROOT, "hooks/notifications/useNotificationsData.js")),
  false,
  "the unreferenced useNotificationsData hook must stay deleted",
);

// The cash-approval affordance gates on useAuth().user.role. AuthContext builds
// its exposed user from an explicit allow-list, so a `role` missing from that
// list silently disables the affordance for every org_admin -- the gate reads
// undefined and the screen renders the read-only message instead of the buttons.
// This pins the field the gate depends on, not merely the gate itself.
const authContextSource = read("contexts/AuthContext.jsx");
const exposedUserObject = extract(
  authContextSource,
  "const authContextValue = useMemo(",
  "login,",
);
assert.match(
  exposedUserObject,
  /role:\s*user\?\.role/,
  "AuthContext must expose `role` on its user object: the cash-approval gate " +
    "and resolveChatRoleFromUser both read user?.role, and the allow-list " +
    "silently drops any field not listed here",
);

console.log("notification client authority contract: PASS");

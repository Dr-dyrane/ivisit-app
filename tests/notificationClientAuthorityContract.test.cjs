const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
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

console.log("notification client authority contract: PASS");

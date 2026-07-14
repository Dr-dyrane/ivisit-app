const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const roomHook = read("hooks/asyncConsult/useAsyncConsultRoom.js");
const realtimeHook = read("hooks/communication/useCommunicationRealtime.js");
const communicationService = read("services/communicationService.js");
const consultService = read("services/asyncConsultService.js");
const modal = read("components/map/communication/AsyncConsultModal.jsx");
const composer = read("components/map/communication/AsyncConsultComposer.jsx");
const draftPanel = read("components/map/communication/AsyncConsultDraftPanel.jsx");
const messageList = read("components/map/communication/AsyncConsultMessageList.jsx");
const orchestrator = read("components/map/MapModalOrchestrator.jsx");
const uiBundle = [modal, composer, draftPanel, messageList].join("\n");

assert.match(roomHook, /useQuery\s*\(/, "room state must subscribe to its query key");
assert.match(
  roomHook,
  /communicationQueryKeys\.roomByVisit\(visitId\)/,
  "room cache must be keyed by visit",
);
assert.match(roomHook, /enabled:\s*false/, "room creation must remain explicit");
assert.match(roomHook, /\{ force = false \}/);
assert.match(modal, /ensureRoom\(\{ force: true \}\)/);
assert.doesNotMatch(
  roomHook,
  /mutation\.data/,
  "a prior mutation result must not flash under a new visit",
);

assert.match(
  communicationService,
  /subscribeToRoom\(roomId, onEvent, onStatus\)/,
  "communication service must expose scoped room realtime",
);
assert.match(communicationService, /table:\s*"emergency_chat_rooms"/);
assert.match(communicationService, /filter:\s*`id=eq\.\$\{roomId\}`/);
assert.match(realtimeHook, /subscribeToMessages\(/);
assert.match(realtimeHook, /subscribeToRoom\(/);
assert.match(realtimeHook, /messageSubscription\?\.unsubscribe\?\.\(\)/);
assert.match(realtimeHook, /roomSubscription\?\.unsubscribe\?\.\(\)/);
assert.match(
  realtimeHook,
  /communicationQueryKeys\.roomByVisit\(visitId\)/,
  "room events must update only the active visit cache",
);

for (const rpcName of [
  "ensure_async_consult_room",
  "send_async_consult_message",
  "mark_async_consult_room_read",
]) {
  assert.ok(consultService.includes(`supabase.rpc("${rpcName}"`), `${rpcName} must remain canonical`);
}
assert.match(consultService, /const metadata\s*=/);
assert.match(consultService, /p_metadata:\s*metadata/);
assert.doesNotMatch(consultService, /p_metadata:\s*input\.metadata/);

assert.match(modal, /pendingSendIntent\?\.body === body/);
assert.match(modal, /clientMessageId:\s*uuidv4\(\)/);
assert.match(modal, /clientMessageId:\s*intent\.clientMessageId/);
assert.match(modal, /markRoomRead\(latestMessageId\)/);
assert.match(modal, /activeRoom\.status !== "active"/);
assert.match(modal, /useCommunicationRealtime\(\{[\s\S]*visitId/);
assert.match(modal, /scheduledVisitReleaseGates\.consultAiDraft/);
assert.match(modal, /attachments:\s*\[\]/);
assert.match(draftPanel, />Discard</);
assert.match(draftPanel, />Insert</);
assert.match(draftPanel, />AI draft</);
assert.doesNotMatch(
  draftPanel,
  /borderWidth|borderColor/,
  "draft controls must separate with surface fills, not decorative borders",
);
assert.match(
  draftPanel,
  /styles\.panel,[\s\S]*backgroundColor: colors\.softSurface/,
  "the draft panel must retain its own quiet surface",
);
assert.match(
  draftPanel,
  /styles\.secondaryButton,[\s\S]*backgroundColor: colors\.inputSurface/,
  "the quiet draft action must remain fill-separated",
);
assert.doesNotMatch(modal, /#CBD5E1|colors\.border/);
assert.match(modal, /borderTopColor: colors\.hairline/);
assert.doesNotMatch(modal, /roomError\.message|draftError\.message/);

assert.match(orchestrator, /import AsyncConsultModal/);
assert.match(orchestrator, /<AsyncConsultModal/);
assert.match(orchestrator, /historyItem=\{asyncConsultVisit\}/);

for (const forbidden of [
  /expo-image-picker/i,
  /DocumentPicker/,
  /launchCamera/,
  /uploadAttachment/,
  /signedUrl/i,
  /asyncConsultMedia/,
]) {
  assert.doesNotMatch(uiBundle, forbidden, "consult UI must remain text-only");
}
assert.doesNotMatch(uiBundle, /unavailable in this release/i);

console.log("PASS async consult UI/service contract");

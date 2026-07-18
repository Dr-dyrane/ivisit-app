const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const babel = require("@babel/core");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function loadSourceModule(relativePath) {
  const filename = path.join(ROOT, relativePath);
  const transformed = babel.transformSync(read(relativePath), {
    filename,
    presets: [require.resolve("babel-preset-expo")],
    babelrc: false,
    configFile: false,
  });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(transformed.code, filename);
  return loaded.exports;
}

function getSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return getSourceFiles(absolute);
    return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [absolute] : [];
  });
}

const proposalService = loadSourceModule("services/helpSupportAnswerProposalService.js");
const { createHelpSupportAnswerProposal, normalizeSupportQuestion } = proposalService;
const faqRows = [
  {
    id: "faq-sos",
    question: "What happens when I press SOS?",
    answer: "We alert nearby responders and share your live location.",
    category: "Emergency",
    rank: 1,
  },
  {
    id: "faq-coverage",
    question: "How do I add coverage?",
    answer: "Open Coverage from your profile stack and add or update your policy there.",
    category: "Billing",
    rank: 2,
  },
];

const faqProposal = createHelpSupportAnswerProposal({
  question: "What happens when I press SOS?",
  faqs: faqRows,
});
assert.equal(faqProposal.kind, "faq_answer");
assert.equal(faqProposal.answer, faqRows[0].answer);
assert.deepEqual(faqProposal.source, {
  id: "faq-sos",
  label: faqProposal.source.label,
  question: faqRows[0].question,
});
assert.match(faqProposal.source.label, /^FAQ/);
assert.deepEqual(faqProposal.escalationDraft, {
  subject: "Help with iVisit",
  message: "Question: What happens when I press SOS?",
});

const noMatchProposal = createHelpSupportAnswerProposal({
  question: "Can you prescribe medication or change my dispatch?",
  faqs: faqRows,
});
assert.equal(noMatchProposal.kind, "no_match");
assert.equal(noMatchProposal.source, null);
assert.match(noMatchProposal.answer, /could not find an approved FAQ answer/i);
assert.deepEqual(noMatchProposal.escalationDraft, {
  subject: "Help with iVisit",
  message: "Question: Can you prescribe medication or change my dispatch?",
});

const weakOverlapProposal = createHelpSupportAnswerProposal({
  question: "How do I update my coverage?",
  faqs: [{
    id: "faq-profile",
    question: "How do I update my medical profile?",
    answer: "Open Medical Profile to update your health information.",
    category: "Account",
  }],
});
assert.equal(weakOverlapProposal.kind, "no_match");
assert.equal(weakOverlapProposal.source, null);

assert.deepEqual(createHelpSupportAnswerProposal({ question: " ", faqs: faqRows }), {
  kind: "idle",
  question: "",
  answer: null,
  source: null,
  escalationDraft: null,
});
assert.equal(normalizeSupportQuestion("x".repeat(700)).length, 500);

const proposalSource = read("services/helpSupportAnswerProposalService.js");
for (const forbiddenPattern of [
  /@supabase\/supabase-js/i,
  /\bsupabase\s*\./i,
  /\bfunctions\s*\.\s*invoke\s*\(/i,
  /\bfetch\s*\(/i,
  /\b(?:insert|update|upsert|delete|rpc)\s*\(/i,
  /\b(?:router|navigate|Linking)\b/i,
]) {
  assert.doesNotMatch(
    proposalSource,
    forbiddenPattern,
    `Ask iVisit proposal service must remain FAQ-only and side-effect free: ${forbiddenPattern}`,
  );
}

const modelSource = read("hooks/support/useHelpSupportScreenModel.js");
for (const publicProperty of [
  "askQuery",
  "askProposal",
  "askFeedback",
  "onAskQueryChange: changeAskQuery",
  "onAskSubmit: submitAsk",
  "onAskFeedback: setAskFeedback",
  "onEscalateAsk: escalateAsk",
]) {
  assert.match(modelSource, new RegExp(publicProperty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
const escalationOwner = modelSource.slice(
  modelSource.indexOf("const escalateAsk"),
  modelSource.indexOf("const hideComposer"),
);
assert.match(escalationOwner, /setSubject\(draft\.subject\)/);
assert.match(escalationOwner, /setMessage\(draft\.message\)/);
assert.match(escalationOwner, /setComposeVisible\(true\)/);
assert.doesNotMatch(escalationOwner, /submitTicket\s*\(/);

const askViewSource = read("components/helpSupport/HelpSupportAskIVisit.jsx");
assert.match(askViewSource, /maxLength=\{500\}/);
assert.match(askViewSource, /accessibilityLabel=\{copy\.inputLabel\}/);
assert.match(askViewSource, /copy\.sourceLabel/);
assert.match(askViewSource, /onPress=\{onEscalate\}/);
assert.doesNotMatch(askViewSource, /submitTicket|createTicket|Send request|publish/i);

const mainContentSource = read("components/helpSupport/HelpSupportMainContent.jsx");
assert.match(mainContentSource, /import HelpSupportAskIVisit from ".\/HelpSupportAskIVisit"/);
assert.match(mainContentSource, /<HelpSupportAskIVisit[\s\S]*query=\{model\.askQuery\}[\s\S]*proposal=\{model\.askProposal\}[\s\S]*onEscalate=\{model\.onEscalateAsk\}/);
assert.ok(
  mainContentSource.indexOf("<HelpSupportAskIVisit") < mainContentSource.indexOf("<HelpSupportTicketList"),
  "Ask iVisit must lead the Help & Support composition before ticket history",
);
assert.match(mainContentSource, /<HelpSupportTicketList[\s\S]*composerActionPrimary=\{false\}/);
assert.match(askViewSource, /backgroundColor: hasQuery \? COLORS\.brandPrimary : theme\.card/);
const contextPaneSource = read("components/helpSupport/HelpSupportContextPane.jsx");
assert.doesNotMatch(contextPaneSource, /backgroundColor:\s*COLORS\.brandPrimary/);
const actionIslandSource = read("components/helpSupport/HelpSupportActionIsland.jsx");
assert.doesNotMatch(actionIslandSource, /<IslandButton[\s\S]*primary=/);
const wideSource = read("components/helpSupport/HelpSupportWideLayout.jsx");
assert.match(wideSource, /<HelpSupportMainContent[\s\S]*model=\{model\}/);
const orchestratorSource = read("components/helpSupport/HelpSupportScreenOrchestrator.jsx");
assert.match(orchestratorSource, /getStackViewportVariant/);
assert.match(orchestratorSource, /HelpSupportMainContent/);
assert.match(orchestratorSource, /HelpSupportWideLayout/);

const excludedRoots = [
  path.join(ROOT, "screens", "MapScreen.jsx"),
  path.join(ROOT, "components", "map"),
  path.join(ROOT, "hooks", "map"),
  path.join(ROOT, "services", "emergencyChatService.js"),
];
const excludedSources = excludedRoots.flatMap((entry) => {
  if (fs.statSync(entry).isDirectory()) return getSourceFiles(entry);
  return [entry];
});
for (const filename of excludedSources) {
  const source = fs.readFileSync(filename, "utf8");
  assert.doesNotMatch(source, /HelpSupportAskIVisit|helpSupportAnswerProposalService|Ask iVisit/);
}

console.log("PASS Help & Support Ask iVisit contract");

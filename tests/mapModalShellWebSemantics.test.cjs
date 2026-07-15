const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const babel = require("@babel/core");

const root = path.resolve(__dirname, "..");
const helperPath = path.join(
  root,
  "components/map/surfaces/mapModalShell.web.js",
);
const transformed = babel.transformFileSync(helperPath, {
  babelrc: false,
  configFile: false,
  plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")],
});
const loadedModule = { exports: {} };
const evaluate = new Function("module", "exports", "require", transformed.code);
evaluate(loadedModule, loadedModule.exports, require);

const {
  containMapModalWebFocus,
  focusMapModalWebDialog,
  getMapModalWebDialogProps,
  getMapModalWebFocusableElements,
  handleMapModalWebDialogKeyDown,
  isTopmostMapModalWebDialog,
  restoreMapModalWebDialogFocus,
} = loadedModule.exports;

function createElement(name, attributes = {}) {
  return {
    name,
    disabled: Boolean(attributes.disabled),
    hidden: Boolean(attributes.hidden),
    isConnected: attributes.isConnected ?? true,
    tabIndex: attributes.tabIndex ?? 0,
    focusCalls: [],
    getAttribute(attribute) {
      return attributes[attribute] ?? null;
    },
    closest() {
      return attributes.hiddenByAncestor ? {} : null;
    },
    focus(options) {
      this.focusCalls.push(options);
    },
  };
}

function createDialog(focusableElements = []) {
  const dialog = createElement("dialog", { tabIndex: -1 });
  dialog.querySelectorAll = () => focusableElements;
  dialog.contains = (element) =>
    element === dialog || focusableElements.includes(element);
  return dialog;
}

function createKeyEvent(key, { shiftKey = false } = {}) {
  return {
    key,
    shiftKey,
    defaultPrevented: false,
    propagationStopped: false,
    immediatePropagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.propagationStopped = true;
    },
    stopImmediatePropagation() {
      this.immediatePropagationStopped = true;
    },
  };
}

assert.deepEqual(getMapModalWebDialogProps(" Async consult "), {
  role: "dialog",
  "aria-modal": true,
  "aria-label": "Async consult",
  tabIndex: -1,
  dataSet: { mapModalDialog: "true" },
});
assert.equal(getMapModalWebDialogProps(null)["aria-label"], "Dialog");

const first = createElement("first");
const middle = createElement("middle");
const last = createElement("last");
const disabled = createElement("disabled", { disabled: true });
const hidden = createElement("hidden", { hiddenByAncestor: true });
const dialog = createDialog([first, disabled, middle, hidden, last]);
assert.deepEqual(getMapModalWebFocusableElements(dialog), [first, middle, last]);

assert.equal(focusMapModalWebDialog(dialog, null), first);
assert.equal(first.focusCalls.length, 1);
assert.equal(focusMapModalWebDialog(dialog, middle), middle);
assert.equal(middle.focusCalls.length, 0, "existing focus inside the dialog must remain stable");

const forwardTab = createKeyEvent("Tab");
assert.equal(containMapModalWebFocus(forwardTab, dialog, last), true);
assert.equal(forwardTab.defaultPrevented, true);
assert.equal(first.focusCalls.length, 2, "Tab from the last control must wrap to the first");

const backwardTab = createKeyEvent("Tab", { shiftKey: true });
assert.equal(containMapModalWebFocus(backwardTab, dialog, first), true);
assert.equal(backwardTab.defaultPrevented, true);
assert.equal(last.focusCalls.length, 1, "Shift+Tab from the first control must wrap to the last");

const interiorTab = createKeyEvent("Tab");
assert.equal(containMapModalWebFocus(interiorTab, dialog, middle), false);
assert.equal(interiorTab.defaultPrevented, false);

const emptyDialog = createDialog([]);
const emptyTab = createKeyEvent("Tab");
assert.equal(containMapModalWebFocus(emptyTab, emptyDialog, emptyDialog), true);
assert.equal(emptyDialog.focusCalls.length, 1);

let escapeCalls = 0;
const escapeEvent = createKeyEvent("Escape");
assert.equal(
  handleMapModalWebDialogKeyDown({
    event: escapeEvent,
    dialogNode: dialog,
    activeElement: first,
    onEscape: () => {
      escapeCalls += 1;
    },
  }),
  true,
);
assert.equal(escapeCalls, 1);
assert.equal(escapeEvent.defaultPrevented, true);
assert.equal(escapeEvent.propagationStopped, true);
assert.equal(escapeEvent.immediatePropagationStopped, true);

const secondDialog = createDialog([]);
const ownerDocument = {
  querySelectorAll: () => [dialog, secondDialog],
};
assert.equal(isTopmostMapModalWebDialog(dialog, ownerDocument), false);
assert.equal(isTopmostMapModalWebDialog(secondDialog, ownerDocument), true);

const opener = createElement("opener");
assert.equal(restoreMapModalWebDialogFocus(opener, { querySelectorAll: () => [] }), true);
assert.equal(opener.focusCalls.length, 1);
assert.equal(
  restoreMapModalWebDialogFocus(opener, ownerDocument),
  false,
  "focus return must not steal focus from a newer modal",
);

const shell = fs.readFileSync(
  path.join(root, "components/map/surfaces/MapModalShell.jsx"),
  "utf8",
);
assert.match(shell, /isWeb && visible \? getMapModalWebDialogProps\(title\) : \{\}/);
assert.match(shell, /ownerDocument\.addEventListener\("keydown", handleKeyDown, true\)/);
assert.match(shell, /focusMapModalWebDialog\(dialogNode, ownerDocument\.activeElement\)/);
assert.match(shell, /restoreMapModalWebDialogFocus\(returnTarget, ownerDocument\)/);
assert.match(shell, /ref=\{isWeb \? webDialogRef : null\}/);

console.log("PASS MapModalShell web dialog semantics");

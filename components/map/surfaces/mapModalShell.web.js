const MAP_MODAL_DIALOG_SELECTOR = '[data-map-modal-dialog="true"]';

const MAP_MODAL_FOCUSABLE_SELECTOR = [
	'a[href]',
	'area[href]',
	'button:not([disabled])',
	'input:not([disabled]):not([type="hidden"])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[contenteditable="true"]',
	'[tabindex]:not([tabindex="-1"])',
].join(",");

function isUnavailableFocusTarget(element) {
	if (!element || element.disabled || element.hidden) return true;
	if (element.getAttribute?.("aria-disabled") === "true") return true;
	if (element.closest?.('[hidden], [aria-hidden="true"]')) return true;

	const tabIndex = Number(element.tabIndex);
	return Number.isFinite(tabIndex) && tabIndex < 0;
}

function focusElement(element) {
	if (!element || element.isConnected === false || typeof element.focus !== "function") {
		return false;
	}

	try {
		element.focus({ preventScroll: true });
	} catch {
		try {
			element.focus();
		} catch {
			return false;
		}
	}
	return true;
}

function preventTabEscape(event) {
	event?.preventDefault?.();
}

export function getMapModalWebDialogProps(title) {
	const accessibleTitle = typeof title === "string" && title.trim() ? title.trim() : "Dialog";
	return {
		role: "dialog",
		"aria-modal": true,
		"aria-label": accessibleTitle,
		tabIndex: -1,
		dataSet: { mapModalDialog: "true" },
	};
}

export function getMapModalWebFocusableElements(dialogNode) {
	if (!dialogNode || typeof dialogNode.querySelectorAll !== "function") return [];
	return Array.from(dialogNode.querySelectorAll(MAP_MODAL_FOCUSABLE_SELECTOR)).filter(
		(element) => !isUnavailableFocusTarget(element),
	);
}

export function focusMapModalWebDialog(dialogNode, activeElement = null) {
	if (!dialogNode) return null;
	if (
		activeElement &&
		activeElement !== dialogNode &&
		typeof dialogNode.contains === "function" &&
		dialogNode.contains(activeElement)
	) {
		return activeElement;
	}

	const [firstFocusable] = getMapModalWebFocusableElements(dialogNode);
	const target = firstFocusable || dialogNode;
	return focusElement(target) ? target : null;
}

export function containMapModalWebFocus(event, dialogNode, activeElement = null) {
	const key = event?.key || event?.nativeEvent?.key;
	if (key !== "Tab") return false;

	const focusableElements = getMapModalWebFocusableElements(dialogNode);
	if (focusableElements.length === 0) {
		preventTabEscape(event);
		focusElement(dialogNode);
		return true;
	}

	const firstFocusable = focusableElements[0];
	const lastFocusable = focusableElements[focusableElements.length - 1];
	const activeIndex = focusableElements.indexOf(activeElement);
	const target = event.shiftKey
		? activeIndex <= 0
			? lastFocusable
			: null
		: activeIndex < 0 || activeIndex === focusableElements.length - 1
			? firstFocusable
			: null;

	if (!target) return false;
	preventTabEscape(event);
	focusElement(target);
	return true;
}

export function handleMapModalWebDialogKeyDown({
	event,
	dialogNode,
	activeElement = null,
	onEscape,
}) {
	const key = event?.key || event?.nativeEvent?.key;
	if (key === "Escape") {
		event?.preventDefault?.();
		event?.stopPropagation?.();
		event?.stopImmediatePropagation?.();
		event?.nativeEvent?.stopImmediatePropagation?.();
		onEscape?.();
		return true;
	}

	return containMapModalWebFocus(event, dialogNode, activeElement);
}

export function isTopmostMapModalWebDialog(dialogNode, ownerDocument) {
	if (!dialogNode || typeof ownerDocument?.querySelectorAll !== "function") return true;
	const dialogs = Array.from(ownerDocument.querySelectorAll(MAP_MODAL_DIALOG_SELECTOR));
	return dialogs.length === 0 || dialogs[dialogs.length - 1] === dialogNode;
}

export function restoreMapModalWebDialogFocus(target, ownerDocument) {
	if (!target || target.isConnected === false) return false;
	const dialogs =
		typeof ownerDocument?.querySelectorAll === "function"
			? Array.from(ownerDocument.querySelectorAll(MAP_MODAL_DIALOG_SELECTOR))
			: [];
	const topmostDialog = dialogs[dialogs.length - 1] || null;
	if (topmostDialog && !topmostDialog.contains?.(target)) return false;
	return focusElement(target);
}

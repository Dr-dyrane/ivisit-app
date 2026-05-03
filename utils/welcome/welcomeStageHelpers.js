/**
 * getActionSpacing
 *
 * Resolves the top margin between the helper/chip block and the action well/buttons.
 * Accounts for whether the chip is visible, and adjusts when it is hidden to avoid
 * excess whitespace from the helperGap that the chip would normally absorb.
 */
export function getActionSpacing(metrics, spacingKey) {
	const stageSpacing = metrics?.stageSpacing || {};
	const requested = Number(stageSpacing?.[spacingKey]);
	const fallback = Number(
		stageSpacing?.chipToActionWell ?? stageSpacing?.chipToActions ?? 20,
	);
	const helperGap = Number(stageSpacing?.helperToChip ?? 0);

	if (!Number.isFinite(requested)) {
		return Math.max(20, fallback);
	}

	if (metrics?.showChip) {
		return requested;
	}

	return Math.max(requested - helperGap + 8, 20);
}

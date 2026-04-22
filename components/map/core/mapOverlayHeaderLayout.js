function toFinitePositiveNumber(value, fallback = 0) {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function resolveMapOverlayHeaderFrame({
	screenWidth = 0,
	surfaceConfig = {},
	usesSidebarLayout = false,
	sidebarWidth = 0,
} = {}) {
	const resolvedScreenWidth = Number(screenWidth);
	const headerSideInset = toFinitePositiveNumber(
		surfaceConfig.overlayHeaderSideInset,
		16,
	);
	const topInset = Math.max(
		8,
		toFinitePositiveNumber(surfaceConfig.overlayHeaderTopInset, 8),
	);

	if (!Number.isFinite(resolvedScreenWidth) || resolvedScreenWidth <= 0) {
		return {
			topInset,
			leftInset: headerSideInset,
			rightInset: headerSideInset,
			headerWidth: null,
		};
	}

	if (usesSidebarLayout) {
		const sheetLeft = toFinitePositiveNumber(
			surfaceConfig.overlaySheetSideInset ?? surfaceConfig.sidebarOuterInset,
			0,
		);
		const leftInset =
			sheetLeft + toFinitePositiveNumber(sidebarWidth, 0) + headerSideInset;
		const rightInset = headerSideInset;

		return {
			topInset,
			leftInset,
			rightInset,
			headerWidth: Math.max(260, resolvedScreenWidth - leftInset - rightInset),
		};
	}

	const overlayHeaderMaxWidth = toFinitePositiveNumber(
		surfaceConfig.overlayHeaderMaxWidth,
		0,
	);

	if (overlayHeaderMaxWidth > 0) {
		const headerWidth = Math.min(
			overlayHeaderMaxWidth,
			Math.max(280, resolvedScreenWidth - headerSideInset * 2),
		);
		const centeredInset = Math.max(
			headerSideInset,
			(resolvedScreenWidth - headerWidth) / 2,
		);

		return {
			topInset,
			leftInset: centeredInset,
			rightInset: centeredInset,
			headerWidth,
		};
	}

	return {
		topInset,
		leftInset: headerSideInset,
		rightInset: headerSideInset,
		headerWidth: Math.max(0, resolvedScreenWidth - headerSideInset * 2),
	};
}

export function buildMapOverlayHeaderLayoutInsets(options = {}) {
	const frame = resolveMapOverlayHeaderFrame(options);

	return {
		topInset: frame.topInset,
		leftInset: frame.leftInset,
		rightInset: frame.rightInset,
	};
}

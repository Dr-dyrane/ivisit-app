// PULLBACK NOTE: Introduce shared responsive metrics keyed to 14-variant matrix
// OLD: Per-screen magic numbers for type / spacing / sizing
// NEW: Single metrics factory resolves by variant group (compact / tablet / desktop)
// REASON: Stack screens need one source of truth for responsive tokens; avoids per-screen drift

const COMPACT_METRICS = {
	typography: {
		title: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
		heading: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
		body: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
		caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
	},
	spacing: {
		xs: 4,
		sm: 8,
		md: 12,
		lg: 16,
		xl: 20,
		xxl: 24,
	},
	sizing: {
		iconSize: 20,
		orbSize: 40,
		buttonHeight: 44,
		inputHeight: 44,
		chipHeight: 32,
	},
	radii: {
		sm: 12,
		md: 14,
		lg: 20,
		xl: 24,
	},
};

const TABLET_METRICS = {
	typography: {
		title: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
		heading: { fontSize: 17, lineHeight: 23, fontWeight: '600' },
		body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
		caption: { fontSize: 13, lineHeight: 17, fontWeight: '400' },
	},
	spacing: {
		xs: 6,
		sm: 10,
		md: 16,
		lg: 20,
		xl: 24,
		xxl: 32,
	},
	sizing: {
		iconSize: 22,
		orbSize: 44,
		buttonHeight: 48,
		inputHeight: 48,
		chipHeight: 34,
	},
	radii: {
		sm: 12,
		md: 14,
		lg: 22,
		xl: 28,
	},
};

const DESKTOP_METRICS = {
	typography: {
		title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
		heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
		body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
		caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
	},
	spacing: {
		xs: 8,
		sm: 12,
		md: 20,
		lg: 24,
		xl: 32,
		xxl: 40,
	},
	sizing: {
		iconSize: 22,
		orbSize: 48,
		buttonHeight: 48,
		inputHeight: 48,
		chipHeight: 36,
	},
	radii: {
		sm: 12,
		md: 14,
		lg: 24,
		xl: 32,
	},
};

export function getStackResponsiveMetrics(variantGroup) {
	switch (variantGroup) {
		case "desktop":
			return DESKTOP_METRICS;
		case "tablet":
			return TABLET_METRICS;
		case "compact":
		default:
			return COMPACT_METRICS;
	}
}

export const BREAKPOINTS = {
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280,
	"2xl": 1536,
	"3xl": 1920,
	ultraWide: 2560,
};

export const DEVICE_BREAKPOINTS = {
	compactPhone: 360,
	largePhone: 390,
	androidFold: 600,
	androidTablet: 840,
	nativeDesktop: 1180,
	largeMonitor: 1600,
};

export const WELCOME_WEB_BREAKPOINTS = {
	mobileMax: BREAKPOINTS.sm - 1,
	smWideMin: BREAKPOINTS.sm,
	mdMin: BREAKPOINTS.md,
	lgMin: BREAKPOINTS.lg,
	xlMin: BREAKPOINTS.xl,
	twoXlMin: BREAKPOINTS["2xl"],
	threeXlMin: BREAKPOINTS["3xl"],
	ultraWideMin: BREAKPOINTS.ultraWide,
};

export const VIEWPORT_BREAKPOINTS = {
	tabletMin: BREAKPOINTS.md,
	nativeDesktopMin: DEVICE_BREAKPOINTS.nativeDesktop,
	largeMonitorMin: DEVICE_BREAKPOINTS.largeMonitor,
};

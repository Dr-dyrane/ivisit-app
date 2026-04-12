import { useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

const DEFAULT_METRICS = Object.freeze({
	visibleWidth: 0,
	visibleHeight: 0,
	layoutWidth: 0,
	layoutHeight: 0,
	topInset: 0,
	rightInset: 0,
	bottomInset: 0,
	leftInset: 0,
	isIosDevice: false,
	isAndroidDevice: false,
	isStandalonePWA: false,
	isIosBrowser: false,
	isAndroidBrowser: false,
	isBrowserChromeConstrained: false,
});

function isIosUserAgent(userAgent = "") {
	return /iphone|ipad|ipod/i.test(userAgent);
}

function isAndroidUserAgent(userAgent = "") {
	return /android/i.test(userAgent);
}

function detectStandalone() {
	if (typeof window === "undefined") {
		return false;
	}

	return (
		window.matchMedia?.("(display-mode: standalone)")?.matches ||
		window.navigator?.standalone === true
	);
}

function readViewportMetrics() {
	if (Platform.OS !== "web" || typeof window === "undefined") {
		return DEFAULT_METRICS;
	}

	const documentElement =
		typeof document !== "undefined" ? document.documentElement : null;
	const visualViewport = window.visualViewport;
	const layoutWidth = Math.max(
		Number(window.innerWidth) || 0,
		Number(documentElement?.clientWidth) || 0,
	);
	const layoutHeight = Math.max(
		Number(window.innerHeight) || 0,
		Number(documentElement?.clientHeight) || 0,
	);
	const visibleWidth = Math.round(
		Number(visualViewport?.width) || layoutWidth,
	);
	const visibleHeight = Math.round(
		Number(visualViewport?.height) || layoutHeight,
	);
	const offsetTop = Math.max(0, Math.round(Number(visualViewport?.offsetTop) || 0));
	const offsetLeft = Math.max(
		0,
		Math.round(Number(visualViewport?.offsetLeft) || 0),
	);
	const rightInset = Math.max(0, layoutWidth - (visibleWidth + offsetLeft));
	const bottomInset = Math.max(0, layoutHeight - (visibleHeight + offsetTop));
	const isIosDevice = isIosUserAgent(window.navigator?.userAgent || "");
	const isAndroidDevice = isAndroidUserAgent(window.navigator?.userAgent || "");
	const isStandalonePWA = detectStandalone();
	const isIosBrowser = isIosDevice && !isStandalonePWA;
	const isAndroidBrowser = isAndroidDevice && !isStandalonePWA;

	return {
		visibleWidth,
		visibleHeight,
		layoutWidth,
		layoutHeight,
		topInset: offsetTop,
		rightInset,
		bottomInset,
		leftInset: offsetLeft,
		isIosDevice,
		isAndroidDevice,
		isStandalonePWA,
		isIosBrowser,
		isAndroidBrowser,
		isBrowserChromeConstrained:
			isIosBrowser && (bottomInset > 0 || offsetTop > 0),
	};
}

export default function useWebViewportMetrics() {
	const [metrics, setMetrics] = useState(() => readViewportMetrics());

	useEffect(() => {
		if (Platform.OS !== "web" || typeof window === "undefined") {
			return undefined;
		}

		let frame = null;
		const syncMetrics = () => {
			if (frame != null && typeof window.cancelAnimationFrame === "function") {
				window.cancelAnimationFrame(frame);
			}

			if (typeof window.requestAnimationFrame === "function") {
				frame = window.requestAnimationFrame(() => {
					frame = null;
					setMetrics(readViewportMetrics());
				});
				return;
			}

			setMetrics(readViewportMetrics());
		};

		syncMetrics();

		window.addEventListener("resize", syncMetrics);
		window.addEventListener("orientationchange", syncMetrics);
		window.visualViewport?.addEventListener("resize", syncMetrics);
		window.visualViewport?.addEventListener("scroll", syncMetrics);

		return () => {
			if (frame != null && typeof window.cancelAnimationFrame === "function") {
				window.cancelAnimationFrame(frame);
			}
			window.removeEventListener("resize", syncMetrics);
			window.removeEventListener("orientationchange", syncMetrics);
			window.visualViewport?.removeEventListener("resize", syncMetrics);
			window.visualViewport?.removeEventListener("scroll", syncMetrics);
		};
	}, []);

	return useMemo(
		() => ({
			...DEFAULT_METRICS,
			...metrics,
		}),
		[metrics],
	);
}

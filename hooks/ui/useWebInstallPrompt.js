import { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

function isBeforeInstallPromptSupported() {
	return Platform.OS === "web" && typeof window !== "undefined";
}

export default function useWebInstallPrompt() {
	const deferredPromptRef = useRef(null);
	const [canPromptInstall, setCanPromptInstall] = useState(false);
	const [isPromptingInstall, setIsPromptingInstall] = useState(false);
	const [didInstall, setDidInstall] = useState(false);

	useEffect(() => {
		if (!isBeforeInstallPromptSupported()) {
			return undefined;
		}

		const handleBeforeInstallPrompt = (event) => {
			event.preventDefault?.();
			deferredPromptRef.current = event;
			setCanPromptInstall(true);
			setDidInstall(false);
		};

		const handleAppInstalled = () => {
			deferredPromptRef.current = null;
			setCanPromptInstall(false);
			setDidInstall(true);
			setIsPromptingInstall(false);
		};

		window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
		window.addEventListener("appinstalled", handleAppInstalled);

		return () => {
			window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
			window.removeEventListener("appinstalled", handleAppInstalled);
		};
	}, []);

	const promptInstall = async () => {
		const deferredPrompt = deferredPromptRef.current;
		if (!deferredPrompt || isPromptingInstall) {
			return false;
		}

		setIsPromptingInstall(true);
		try {
			await deferredPrompt.prompt?.();
			const outcome = await deferredPrompt.userChoice;
			deferredPromptRef.current = null;
			setCanPromptInstall(false);
			return outcome?.outcome === "accepted";
		} catch (_error) {
			return false;
		} finally {
			setIsPromptingInstall(false);
		}
	};

	return useMemo(
		() => ({
			canPromptInstall,
			isPromptingInstall,
			didInstall,
			promptInstall,
		}),
		[canPromptInstall, didInstall, isPromptingInstall],
	);
}

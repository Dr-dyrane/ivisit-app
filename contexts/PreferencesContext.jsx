import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getPreferencesAPI, updatePreferencesAPI } from "../api/preferences";

const PreferencesContext = createContext();

export function PreferencesProvider({ children }) {
	const [preferences, setPreferences] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	const refreshPreferences = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const next = await getPreferencesAPI();
			setPreferences(next && typeof next === "object" ? next : null);
		} catch (e) {
			setError(e?.message ?? "Failed to load preferences");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		let isActive = true;
		(async () => {
			setIsLoading(true);
			try {
				const next = await getPreferencesAPI();
				if (!isActive) return;
				setPreferences(next && typeof next === "object" ? next : null);
			} catch (e) {
				if (!isActive) return;
				setError(e?.message ?? "Failed to load preferences");
			} finally {
				if (isActive) setIsLoading(false);
			}
		})();
		return () => {
			isActive = false;
		};
	}, []);

	const updatePreferences = useCallback(async (updates) => {
		const next = await updatePreferencesAPI(updates);
		setPreferences(next && typeof next === "object" ? next : null);
		return next;
	}, []);

	const value = useMemo(() => {
		return {
			preferences,
			isLoading,
			error,
			refreshPreferences,
			updatePreferences,
		};
	}, [error, isLoading, preferences, refreshPreferences, updatePreferences]);

	return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
	const context = useContext(PreferencesContext);
	if (!context) throw new Error("usePreferences must be used within a PreferencesProvider");
	return context;
}

export default PreferencesContext;


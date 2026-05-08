import { useEffect, useMemo, useState } from "react";
import { useMapRoute } from "../../../../hooks/emergency/useMapRoute";
import { hospitalsService } from "../../../../services/hospitalsService";
import { getDestinationCoordinate } from "../../surfaces/hospitals/mapHospitalDetail.helpers";
import { buildBedDecisionModel } from "./mapBedDecision.helpers";
import { useQuotedPriceMap } from "../../../../hooks/payment/useQuotedPriceMap";
import { usePreferences } from "../../../../contexts/PreferencesContext";
import { useBillingQuoteStore } from "../../../../stores/billingQuoteStore";
import { resolveMoneyCurrency } from "../../../../utils/formatMoney";

export default function useMapBedDecisionModel({
	hospital,
	origin = null,
	careIntent = "bed",
	selectedRoomServiceId = null,
}) {
	const { routeInfo, calculateRoute, clearRoute, isCalculatingRoute } = useMapRoute();
	const [roomRows, setRoomRows] = useState([]);
	const [isLoadingRooms, setIsLoadingRooms] = useState(false);
	const destination = useMemo(() => getDestinationCoordinate(hospital), [hospital]);

	// PULLBACK NOTE: Billing quote integration for country-based pricing
	// Same pattern as payment phase: use preferences (user billing context)
	// GUARDRAIL: Wait for preferences to load before enabling quotes to prevent race condition
	const { preferences, isLoading: isLoadingPrefs } = usePreferences();
	// CRITICAL FIX: Also read runtime billing overrides from Zustand store
	// Location changes set overrides in store that must be respected for deterministic pricing
	const billingCountryCodeOverride = useBillingQuoteStore((state) => state.billingCountryCodeOverride);
	const billingCurrencyCodeOverride = useBillingQuoteStore((state) => state.billingCurrencyCodeOverride);
	// Merge: store overrides take precedence over saved preferences (runtime > persisted)
	const effectiveBillingCountryCode = billingCountryCodeOverride || preferences?.billingCountryCode || null;
	const effectiveBillingCurrencyCode = billingCurrencyCodeOverride || preferences?.billingCurrencyCode || null;
	const quotedPriceMap = useQuotedPriceMap({
		items: roomRows,
		getAmount: (row) => row?.price_per_night ?? row?.base_price,
		getCurrency: (row) => resolveMoneyCurrency(row?.currency, hospital?.currency),
		billingCountryCode: effectiveBillingCountryCode,
		billingCurrencyCode: effectiveBillingCurrencyCode,
		preferences,
		enabled: roomRows.length > 0 && !isLoadingRooms && !isLoadingPrefs,
	});

	useEffect(() => {
		let cancelled = false;
		const hospitalId = hospital?.id;

		if (!hospitalId) {
			setRoomRows([]);
			setIsLoadingRooms(false);
			return () => {
				cancelled = true;
			};
		}

		setIsLoadingRooms(true);
		hospitalsService
			.getRooms(hospitalId)
			.then((rows) => {
				if (!cancelled) {
					setRoomRows(Array.isArray(rows) ? rows : []);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setRoomRows([]);
				}
			})
			.finally(() => {
				if (!cancelled) {
					setIsLoadingRooms(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [hospital?.id]);

	useEffect(() => {
		if (!origin?.latitude || !origin?.longitude || !destination) {
			clearRoute();
			return undefined;
		}

		calculateRoute(origin, destination);
		return undefined;
	}, [
		calculateRoute,
		clearRoute,
		destination,
		origin?.latitude,
		origin?.longitude,
	]);

	return useMemo(
		() =>
			buildBedDecisionModel({
				hospital,
				roomRows,
				pricingRows: [],
				routeInfo,
				origin,
				careIntent,
				selectedRoomServiceId,
				isLoadingRooms,
				isLoadingServices: false,
				isCalculatingRoute,
				// PULLBACK NOTE: Pass quoted price map for country-based currency display
				quotedPriceMap,
			}),
		[
			careIntent,
			hospital,
			isCalculatingRoute,
			isLoadingRooms,
			origin,
			quotedPriceMap,
			roomRows,
			routeInfo,
			selectedRoomServiceId,
		],
	);
}

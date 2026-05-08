import { useEffect, useMemo, useState } from "react";
import { useMapRoute } from "../../../../hooks/emergency/useMapRoute";
import { hospitalsService } from "../../../../services/hospitalsService";
import { getDestinationCoordinate } from "../../surfaces/hospitals/mapHospitalDetail.helpers";
import { buildAmbulanceDecisionModel } from "./mapAmbulanceDecision.helpers";
import { useQuotedPriceMap } from "../../../../hooks/payment/useQuotedPriceMap";
import { usePreferences } from "../../../../contexts/PreferencesContext";
import { useBillingQuoteStore } from "../../../../stores/billingQuoteStore";
import { resolveMoneyCurrency } from "../../../../utils/formatMoney";

export default function useMapAmbulanceDecisionModel({
	hospital,
	origin = null,
	selectedServiceId = null,
}) {
	const { routeInfo, calculateRoute, clearRoute, isCalculatingRoute } = useMapRoute();
	const [pricingRows, setPricingRows] = useState([]);
	const [isLoadingServices, setIsLoadingServices] = useState(false);
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
		items: pricingRows,
		getAmount: (row) => row?.base_price,
		getCurrency: (row) => resolveMoneyCurrency(row?.currency, hospital?.currency),
		billingCountryCode: effectiveBillingCountryCode,
		billingCurrencyCode: effectiveBillingCurrencyCode,
		preferences,
		enabled: pricingRows.length > 0 && !isLoadingServices && !isLoadingPrefs,
	});

	useEffect(() => {
		let cancelled = false;
		const hospitalId = hospital?.id;

		if (!hospitalId) {
			setPricingRows([]);
			setIsLoadingServices(false);
			return () => {
				cancelled = true;
			};
		}

		setIsLoadingServices(true);
		hospitalsService
			.getServicePricing(hospitalId, hospital?.organization_id || hospital?.organizationId)
			.then((rows) => {
				if (!cancelled) {
					setPricingRows(Array.isArray(rows) ? rows : []);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setPricingRows([]);
				}
			})
			.finally(() => {
				if (!cancelled) {
					setIsLoadingServices(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [hospital?.id, hospital?.organizationId, hospital?.organization_id]);

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
			buildAmbulanceDecisionModel({
				hospital,
				pricingRows,
				routeInfo,
				origin,
				selectedServiceId,
				isLoadingServices,
				isCalculatingRoute,
				// PULLBACK NOTE: Pass quoted price map for country-based currency display
				quotedPriceMap,
			}),
		[
			hospital,
			isCalculatingRoute,
			isLoadingServices,
			origin,
			pricingRows,
			quotedPriceMap,
			routeInfo,
			selectedServiceId,
		],
	);
}

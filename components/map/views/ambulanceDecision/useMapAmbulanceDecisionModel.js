import { useEffect, useMemo, useState } from "react";
import { useMapRoute } from "../../../../hooks/emergency/useMapRoute";
import { hospitalsService } from "../../../../services/hospitalsService";
import { getDestinationCoordinate } from "../../surfaces/hospitals/mapHospitalDetail.helpers";
import { buildAmbulanceDecisionModel } from "./mapAmbulanceDecision.helpers";

export default function useMapAmbulanceDecisionModel({
	hospital,
	origin = null,
	selectedServiceId = null,
}) {
	const { routeInfo, calculateRoute, clearRoute, isCalculatingRoute } = useMapRoute();
	const [pricingRows, setPricingRows] = useState([]);
	const [isLoadingServices, setIsLoadingServices] = useState(false);
	const destination = useMemo(() => getDestinationCoordinate(hospital), [hospital]);

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
			}),
		[
			hospital,
			isCalculatingRoute,
			isLoadingServices,
			origin,
			pricingRows,
			routeInfo,
			selectedServiceId,
		],
	);
}

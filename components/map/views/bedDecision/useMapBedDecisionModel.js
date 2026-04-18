import { useEffect, useMemo, useState } from "react";
import { useMapRoute } from "../../../../hooks/emergency/useMapRoute";
import { hospitalsService } from "../../../../services/hospitalsService";
import { getDestinationCoordinate } from "../../surfaces/hospitals/mapHospitalDetail.helpers";
import { buildBedDecisionModel } from "./mapBedDecision.helpers";

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
			}),
		[
			careIntent,
			hospital,
			isCalculatingRoute,
			isLoadingRooms,
			origin,
			roomRows,
			routeInfo,
			selectedRoomServiceId,
		],
	);
}

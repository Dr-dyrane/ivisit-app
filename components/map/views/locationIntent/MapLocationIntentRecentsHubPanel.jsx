// PULLBACK NOTE: [LS-11] NEW: Recents Hub panel extracted from MapLocationIntentBodyContent
// OLD: recents section lived inline in expanded DEFAULT view only
// NEW: dedicated RECENTS_HUB mode - full list, own panel, back chrome

import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useVisits } from "../../../../contexts/VisitsContext";
import { selectRecentHistoryPreview } from "../../../../hooks/visits/useVisitHistorySelectors";
import MapHistoryGroup from "../../history/MapHistoryGroup";
import styles from "./mapLocationIntent.styles";
import { LOCATION_INTENT_MODES } from "./mapLocationIntent.model";

const RECENT_ROW_METRICS = {
	iconSize: 20,
	orbSize: 40,
	gap: 12,
	titleSize: 15,
	titleLineHeight: 20,
	subtitleSize: 12,
	subtitleLineHeight: 16,
	chevronSize: 16,
};

export default function MapLocationIntentRecentsHubPanel({
	mode,
	recents,
	titleColor,
	mutedColor,
	groupSurfaceColor,
	isDarkMode,
	onSelectRecentLocation,
}) {
	const isActive = mode === LOCATION_INTENT_MODES.RECENTS_HUB;

	const { visits = [] } = useVisits();

	const recentPickupItems = useMemo(() => {
		if (!isActive || !Array.isArray(recents)) return [];
		return recents.slice(0, 12).map((recent, index) => ({
			id: recent.id || `${recent.address || recent.label || "recent"}-${index}`,
			requestType: "visit",
			title: recent.label || "Recent location",
			subtitle: recent.address || "",
			timeLabel: recent.timeLabel || "",
			statusLabel: recent.kindLabel || "Recent",
			statusTone: "default",
			...recent,
		}));
	}, [isActive, recents]);

	const recentVisitItems = useMemo(
		() => {
			if (!isActive) return [];
			return selectRecentHistoryPreview(visits, 10)
				.filter((item) => item?.facilityCoordinate && item?.facilityAddress)
				.map((item) => ({
					id: `visit-location-${item.id}`,
					requestType: item.requestType || "visit",
					title: item.facilityName || item.title || "Recent visit",
					label: item.facilityName || item.title || "Recent visit",
					subtitle: item.facilityAddress,
					address: item.facilityAddress,
					statusLabel: "Recent Visit",
					statusTone: item.statusTone || "default",
					timeLabel: item.timeLabel || "",
					source: "visit",
					coords: item.facilityCoordinate,
					latitude: item.facilityCoordinate.latitude,
					longitude: item.facilityCoordinate.longitude,
					countryCode: null,
				}));
		},
		[isActive, visits],
	);

	if (!isActive) return null;

	const hasPickups = recentPickupItems.length > 0;
	const hasVisits = recentVisitItems.length > 0;
	const isEmpty = !hasPickups && !hasVisits;

	return (
		<View style={styles.recentsHubBody}>
			{hasPickups ? (
				<View style={styles.recentsSection}>
					<View style={styles.intentSectionHeader}>
						<Text style={[styles.sectionLabel, { color: mutedColor }]}>
							Recent Pickups
						</Text>
					</View>
					<MapHistoryGroup
						items={recentPickupItems}
						onSelectItem={onSelectRecentLocation}
						metrics={RECENT_ROW_METRICS}
						containerRadius={22}
						hideRowChevron
						isDarkMode={isDarkMode}
					/>
				</View>
			) : null}

			{hasVisits ? (
				<View style={styles.recentsSection}>
					<View style={styles.intentSectionHeader}>
						<Text style={[styles.sectionLabel, { color: mutedColor }]}>
							Recent Visits
						</Text>
					</View>
					<MapHistoryGroup
						items={recentVisitItems}
						onSelectItem={onSelectRecentLocation}
						metrics={RECENT_ROW_METRICS}
						containerRadius={22}
						hideRowChevron
						isDarkMode={isDarkMode}
					/>
				</View>
			) : null}

			{isEmpty ? (
				<View style={[styles.emptyGroup, styles.recentsEmptyGroup, { backgroundColor: groupSurfaceColor }]}>
					<MaterialCommunityIcons name="clock-outline" size={18} color={mutedColor} />
					<View style={styles.emptyGroupCopy}>
						<Text style={[styles.emptyGroupTitle, { color: titleColor }]}>
							No Recent Locations
						</Text>
						<Text style={[styles.emptyGroupBody, { color: mutedColor }]}>
							Pickups and recent visits will appear here.
						</Text>
					</View>
				</View>
			) : null}
		</View>
	);
}

// PULLBACK NOTE: [LS-10] NEW: Places Hub panel - full saved places management surface
// OLD: inline orbs in DEFAULT view only (3 orbs max, no manage path from hub)
// NEW: dedicated PLACES_HUB mode - all saved places, add/manage row, own panel

// PULLBACK NOTE: [LS-UI-6] Apply gradient icon styling to Places Hub
// OLD: Flat iconBgColor for all icons
// NEW: Gradient for assigned (hasLocation), muted tint for unassigned
import React from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LOCATION_INTENT_MODES } from "./mapLocationIntent.model";
import { getPlaceOrbSubtext, renderActionIcon } from "./mapLocationIntent.helpers";
import { getSavedAddressCategoryMeta } from "../../../../services/locationAddressService";
import { MAP_LOCATION_INTENT_COPY } from "./mapLocationIntent.content";
import styles from "./mapLocationIntent.styles";

function PlacesHubRow({
	iconName,
	iconColor,
	iconBgColor,
	gradient,
	label,
	address,
	isMuted,
	titleColor,
	mutedColor,
	onPress,
}) {
	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={label}
			style={({ pressed }) => [
				styles.candidateActionRow,
				pressed ? styles.rowPressed : null,
			]}
		>
			{renderActionIcon({
				iconName,
				gradient,
				iconBg: iconBgColor,
				iconColor,
				infoSurfaceColor: iconBgColor || "#00000020",
				iconStyle: styles.candidateActionIcon,
			})}
			<View style={{ flex: 1 }}>
				<Text style={[styles.candidateActionText, { color: titleColor }]} numberOfLines={1}>
					{label}
				</Text>
				{address ? (
					<Text style={[styles.listRowSubtitle, { color: isMuted ? mutedColor + "80" : mutedColor }]} numberOfLines={1}>
						{address}
					</Text>
				) : null}
			</View>
			<MaterialCommunityIcons name="chevron-right" size={16} color={isMuted ? mutedColor + "60" : mutedColor} />
		</Pressable>
);
}

// PULLBACK NOTE: [ls-refactor-2] Reference MAP_LOCATION_INTENT_COPY.placesOrbColors for DRY
// OLD: Duplicated gradient arrays in CATEGORY_ORB
// NEW: Single source of truth from MAP_LOCATION_INTENT_COPY
const CATEGORY_ORB = {
	home:     { icon: "home-outline",      solidIcon: "home",      color: "#F97316", bg: "#F9731620", gradient: MAP_LOCATION_INTENT_COPY.placesOrbColors.home },
	work:     { icon: "briefcase-outline", solidIcon: "briefcase", color: "#8B5CF6", bg: "#8B5CF620", gradient: MAP_LOCATION_INTENT_COPY.placesOrbColors.work },
	family:   { icon: "account-group-outline", solidIcon: "account-group", color: "#EC4899", bg: "#EC489920", gradient: MAP_LOCATION_INTENT_COPY.placesOrbColors.family },
	school:   { icon: "school-outline",        solidIcon: "school",        color: "#0EA5E9", bg: "#0EA5E920", gradient: MAP_LOCATION_INTENT_COPY.placesOrbColors.school },
	pharmacy: { icon: "medical-bag",           solidIcon: "medical-bag",   color: "#10B981", bg: "#10B98120", gradient: MAP_LOCATION_INTENT_COPY.placesOrbColors.pharmacy },
	care:     { icon: "hospital-box-outline",  solidIcon: "hospital-box",  color: "#EF4444", bg: "#EF444420", gradient: MAP_LOCATION_INTENT_COPY.placesOrbColors.care },
	other:    { icon: "bookmark-outline",  solidIcon: "bookmark",  color: "#6366F1", bg: "#6366F120", gradient: ["#818CF8", "#6366F1"] },
};

// PULLBACK NOTE: [LS-UI-6] Return gradient when hasLocation is true
// OLD: Only icon based on hasLocation
// NEW: gradient for assigned (hasLocation), bg for unassigned
function resolveRowOrb(category, hasLocation = false) {
	const orb = CATEGORY_ORB[category] || CATEGORY_ORB.other;
	return {
		...orb,
		icon: hasLocation ? orb.solidIcon : orb.icon,
		gradient: hasLocation ? orb.gradient : null,
	};
}

export default function MapLocationIntentPlacesHubPanel({
	mode,
	savedPlaces,
	managedSavedPlaces,
	titleColor,
	mutedColor,
	groupSurfaceColor,
	infoSurfaceColor,
	onSelectSavedPlace,
	onAddPlace,
}) {
	if (mode !== LOCATION_INTENT_MODES.PLACES_HUB) return null;

	const pinnedPlaces = Array.isArray(savedPlaces) ? savedPlaces.slice(0, 3) : [];
	const managedPlaces = Array.isArray(managedSavedPlaces) ? managedSavedPlaces : [];

	return (
		<View style={styles.placesHubBody}>
			{/* -- Pinned: Home / Work / +Add orbs as rows -- */}
			{pinnedPlaces.length > 0 ? (
				<View style={styles.placesHubSectionBlock}>
					<View style={styles.placesHubSectionHeading}>
						<View style={[styles.placesHubSectionIconOrb, { backgroundColor: infoSurfaceColor }]}>
							<MaterialCommunityIcons name="pin" size={12} color={mutedColor} />
						</View>
						<Text style={[styles.placesHubSectionLabel, { color: mutedColor }]}>Pinned</Text>
					</View>
					<View style={[styles.candidateActionGroup, { backgroundColor: groupSurfaceColor }]}>
						{pinnedPlaces.map((place, index) => {
							const orb = resolveRowOrb(place.key === "add" ? "other" : place.key, place.hasLocation);
							const subtext = getPlaceOrbSubtext(place);
							const addressText = place.hasLocation
								? (place.location?.address || place.location?.label || subtext)
								: "Not set";
							return (
								<React.Fragment key={place.key}>
									{index > 0 ? (
										<View style={[styles.candidateActionDivider, { backgroundColor: mutedColor + "25" }]} />
									) : null}
									<PlacesHubRow
										iconName={orb.icon}
										iconColor={orb.color}
										iconBgColor={orb.bg}
										gradient={orb.gradient}
										label={place.label}
										address={place.key === "add" ? "Save a new place" : addressText}
										isMuted={!place.hasLocation && place.key !== "add"}
										titleColor={titleColor}
										mutedColor={mutedColor}
										onPress={() => onSelectSavedPlace?.(place)}
									/>
								</React.Fragment>
							);
						})}
					</View>
				</View>
			) : null}

			{/* -- All saved places -- */}
			{managedPlaces.length > 0 ? (
				<View style={styles.placesHubSectionBlock}>
					<View style={styles.placesHubSectionHeading}>
						<View style={[styles.placesHubSectionIconOrb, { backgroundColor: infoSurfaceColor }]}>
							<MaterialCommunityIcons name="bookmark-outline" size={11} color={mutedColor} />
						</View>
						<Text style={[styles.placesHubSectionLabel, { color: mutedColor }]}>Saved Places</Text>
					</View>
					<View style={[styles.candidateActionGroup, { backgroundColor: groupSurfaceColor }]}>
						{managedPlaces.map((place, index) => {
							const meta = getSavedAddressCategoryMeta(place.category || "other");
							const orb = resolveRowOrb(place.category || "other", Boolean(place.address || place.latitude));
							return (
								<React.Fragment key={place.id || `saved-${index}`}>
									{index > 0 ? (
										<View style={[styles.candidateActionDivider, { backgroundColor: mutedColor + "25" }]} />
									) : null}
									<PlacesHubRow
										iconName={orb.icon}
										iconColor={orb.color}
										iconBgColor={orb.bg}
										gradient={orb.gradient}
										label={place.title || place.label || meta.label}
										address={place.address || place.subtitle || ""}
										isMuted={false}
										titleColor={titleColor}
										mutedColor={mutedColor}
										onPress={() => onSelectSavedPlace?.({
											label: place.title || place.label,
											location: place,
											key: place.category || "other",
										})}
									/>
								</React.Fragment>
							);
						})}
					</View>
				</View>
			) : null}

			{/* -- Add a place row -- */}
			<Pressable
				onPress={onAddPlace}
				accessibilityRole="button"
				accessibilityLabel="Add a new saved place"
				style={({ pressed }) => [
					styles.manualIntroCard,
					{ backgroundColor: groupSurfaceColor },
					pressed ? styles.rowPressed : null,
				]}
			>
				<View style={[styles.manualIntroIcon, { backgroundColor: infoSurfaceColor }]}>
					<MaterialCommunityIcons name="plus-circle-outline" size={20} color={titleColor} />
				</View>
				<View style={styles.manualIntroCopy}>
					<Text style={[styles.manualTitle, { color: titleColor }]}>Add a place</Text>
					<Text style={[styles.manualBody, { color: mutedColor }]}>
						Search and save as Home, Work, or a custom place.
					</Text>
				</View>
				<MaterialCommunityIcons name="chevron-right" size={17} color={mutedColor} />
			</Pressable>

			{/* -- Empty state -- */}
			{pinnedPlaces.length === 0 && managedPlaces.length === 0 ? (
				<View style={[styles.emptyGroup, { backgroundColor: groupSurfaceColor }]}>
					<MaterialCommunityIcons name="bookmark-outline" size={22} color={mutedColor} style={{ marginBottom: 8 }} />
					<Text style={[styles.listRowSubtitle, { color: mutedColor }]}>
						No saved places yet.
					</Text>
				</View>
			) : null}
		</View>
	);
}

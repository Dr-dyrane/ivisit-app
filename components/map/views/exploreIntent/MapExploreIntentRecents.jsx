import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useVisits } from "../../../../contexts/VisitsContext";
import { selectRecentHistoryPreview } from "../../../../hooks/visits/useVisitHistorySelectors";
import MapHistoryGroup from "../../history/MapHistoryGroup";
import {
	HISTORY_DEFAULT_MAX_RECENTS,
	HISTORY_RECENTS_COPY,
} from "../../history/history.content";
import styles from "./mapExploreIntent.styles";

/**
 * MapExploreIntentRecents
 *
 * "Recents" section for explore_intent (expanded sheet state).
 * Voice mirrors MapExploreIntentCareSection's biased section header + tracking's
 * ctaGroupCard for the list body:
 *   - Section header: left-biased Pressable ("Recents" + adjacent chevron icon
 *     in a 24x24 round wrap), NOT justify-between.
 *   - List body: MapHistoryGroup renders a single liquid-glass squircle holding
 *     top-N recent rows with subtle hairline dividers (inset via container
 *     paddingHorizontal, mirroring tracking's ctaGroupCard → ctaDivider).
 *   - No render when history is empty.
 *
 * Props
 *   - onOpenAll                opens MapHistoryModal (full list)
 *   - onSelectHistoryItem(item) tapping a row opens MapVisitDetailsModal
 *   - responsiveMetrics        explore_intent responsive metrics (for section.labelStyle / triggerStyle)
 *   - mutedColor               muted color from sheet tokens (inherits explore_intent voice)
 *   - titleColor               primary title color (currently unused but reserved for variants)
 *   - maxItems                 cap on rows shown (default from content)
 */
export default function MapExploreIntentRecents({
	onOpenAll,
	onSelectHistoryItem,
	responsiveMetrics,
	mutedColor,
	titleColor,
	maxItems = HISTORY_DEFAULT_MAX_RECENTS,
}) {
	const { isDarkMode } = useTheme();
	const { visits = [] } = useVisits();

	const items = useMemo(
		() => selectRecentHistoryPreview(visits, maxItems),
		[visits, maxItems],
	);

	// Match explore_intent's row density. Tighter than MapHistoryModal since
	// this is a preview strip.
	const rowMetrics = useMemo(
		() => ({
			iconSize: 20,
			orbSize: 40,
			gap: 12,
			titleSize: 15,
			titleLineHeight: 20,
			subtitleSize: 12,
			subtitleLineHeight: 16,
			chevronSize: 16,
		}),
		[],
	);

	if (!items.length) return null;

	const sectionLabelStyle = responsiveMetrics?.section?.labelStyle || null;
	const sectionTriggerStyle = responsiveMetrics?.section?.triggerStyle || null;

	return (
		<View style={{ marginTop: 24 }}>
			<Pressable
				onPress={onOpenAll}
				style={({ pressed }) => [
					styles.intentSectionHeader,
					styles.intentSectionHeaderBiased,
					styles.intentSectionHeaderTrigger,
					sectionTriggerStyle,
					pressed ? styles.sectionTriggerPressed : null,
				]}
				accessibilityRole="button"
				accessibilityLabel={HISTORY_RECENTS_COPY.ariaSectionLabel}
			>
				<Text
					style={[
						styles.sectionLabel,
						sectionLabelStyle,
						{ color: mutedColor || titleColor },
					]}
				>
					{HISTORY_RECENTS_COPY.sectionTitle}
				</Text>
				<Ionicons
					name="chevron-forward"
					size={16}
					color={mutedColor || titleColor}
				/>
			</Pressable>

			<MapHistoryGroup
				items={items}
				onSelectItem={onSelectHistoryItem}
				metrics={rowMetrics}
				containerRadius={22}
				hideRowChevron
				isDarkMode={isDarkMode}
			/>
		</View>
	);
}

import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import buildHistoryThemeTokens from "./history.theme";
import { useTheme } from "../../../contexts/ThemeContext";
import { resolveHistoryRequestIcon } from "./history.presentation";
import { historyRowStyles } from "./history.styles";

/**
 * MapHistoryRow
 *
 * Flat grouped-list row for /map history surfaces.
 * Voice: mirrors tracking's ctaButtonGrouped pattern
 *   - transparent background (no own surface — no DM in DOM)
 *   - reduced paddingHorizontal (row pads only what the group container leaves)
 *   - leading orb tinted by requestType (ambulance/bed/visit)
 *   - trailing status chip tinted by statusTone
 *
 * The row itself does NOT paint a background. The enclosing MapHistoryGroup
 * owns the single liquid-glass squircle that hosts all rows; rows sit
 * transparently inside it with hairline dividers between siblings.
 *
 * Props
 *   - item              history entry { requestType, statusTone, title, subtitle, statusLabel, ... }
 *   - onPress(item)     row tap handler
 *   - metrics           { iconSize, orbSize, gap, titleSize, titleLineHeight,
 *                         subtitleSize, subtitleLineHeight, chevronSize }
 *   - hideChevron       suppress trailing chevron for non-navigational rows
 *   - isDarkMode        optional override; defaults to ThemeContext
 */
export default function MapHistoryRow({
	item,
	onPress,
	metrics,
	hideChevron = false,
	isDarkMode: isDarkModeProp,
}) {
	const { isDarkMode: isDarkModeCtx } = useTheme();
	const isDarkMode = isDarkModeProp ?? isDarkModeCtx;

	// Resolve theme for THIS row (so type + status palettes are merged).
	const theme = useMemo(
		() =>
			buildHistoryThemeTokens({
				isDarkMode,
				requestType: item?.requestType,
				toneKey: item?.statusTone,
				surface: "row",
			}),
		[isDarkMode, item?.requestType, item?.statusTone],
	);

	if (!item) return null;

	const iconDescriptor = resolveHistoryRequestIcon(item.requestType);
	const handlePress = () => {
		if (typeof onPress === "function") onPress(item);
	};

	return (
		<Pressable
			onPress={handlePress}
			style={({ pressed }) => [
				historyRowStyles.row,
				{
					paddingHorizontal: theme.rowPaddingX,
					paddingVertical: theme.rowPaddingY,
					gap: metrics.gap,
					backgroundColor: pressed ? theme.pressedOverlay : "transparent",
				},
			]}
			accessibilityRole="button"
			accessibilityLabel={item.title}
		>
			<View
				style={[
					historyRowStyles.iconWrap,
					{
						width: metrics.orbSize,
						height: metrics.orbSize,
						borderRadius: Math.round(metrics.orbSize / 2),
						backgroundColor: theme.tone.orb,
					},
				]}
			>
				{iconDescriptor.library === "material" ? (
					<MaterialCommunityIcons
						name={iconDescriptor.name}
						size={metrics.iconSize}
						color={theme.tone.icon}
					/>
				) : (
					<Ionicons
						name={iconDescriptor.name}
						size={metrics.iconSize}
						color={theme.tone.icon}
					/>
				)}
			</View>

			<View style={historyRowStyles.copy}>
				<Text
					numberOfLines={1}
					style={[
						historyRowStyles.title,
						{
							color: theme.titleColor,
							fontSize: metrics.titleSize,
							lineHeight: metrics.titleLineHeight,
						},
					]}
				>
					{item.title}
				</Text>
				{item.subtitle ? (
					<Text
						numberOfLines={2}
						style={[
							historyRowStyles.subtitle,
							{
								color: theme.bodyColor,
								fontSize: metrics.subtitleSize,
								lineHeight: metrics.subtitleLineHeight,
								marginTop: 2,
							},
						]}
					>
						{item.subtitle}
					</Text>
				) : null}
			</View>

			<View style={historyRowStyles.metaColumn}>
				{item.statusLabel ? (
					<View
						style={[
							historyRowStyles.statusChip,
							{ backgroundColor: theme.tone.chip },
						]}
					>
						<Text
							style={[
								historyRowStyles.statusChipText,
								{ color: theme.tone.chipText },
							]}
						>
							{item.statusLabel}
						</Text>
					</View>
				) : null}
				{hideChevron ? null : (
					<Ionicons
						name="chevron-forward"
						size={metrics.chevronSize}
						color={theme.chevronColor}
					/>
				)}
			</View>
		</Pressable>
	);
}

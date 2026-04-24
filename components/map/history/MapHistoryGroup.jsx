import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapHistoryRow from "./MapHistoryRow";
import { historyGroupStyles } from "./history.styles";
import buildHistoryThemeTokens from "./history.theme";
import { useTheme } from "../../../contexts/ThemeContext";

/**
 * MapHistoryGroup
 *
 * Grouped container for history rows.
 * Voice: mirrors tracking's ctaGroupCard pattern
 *   - single liquid-glass squircle (theme.groupSurface = rgba(255,255,255,0.9) light)
 *   - internal paddingHorizontal: theme.groupPaddingX (12) → hairlines auto-inset
 *     on the right because they live within the padded content area
 *   - transparent rows sit inside with hairline dividers between siblings
 *
 * Hairline discipline:
 *   - marginLeft = rowPaddingX + orbSize + metrics.gap (aligns with text's
 *     leading edge); NO marginRight (container's paddingHorizontal provides
 *     the right-side inset, mirroring tracking's ctaDivider behavior).
 *
 * Props
 *   - label               optional section header
 *   - items               array of history entries
 *   - onSelectItem(item)
 *   - onPressHeader       optional — when provided, renders header chevron and makes row pressable
 *   - metrics             forwarded to rows + used for hairline inset math
 *   - containerRadius     corner radius for the squircle (default: 22)
 *   - headerMetrics       { titleSize, titleLineHeight, chevronSize, paddingBottom }
 *   - hideRowChevron      suppress each row's trailing chevron
 *   - sectionTitleColor   optional override for the header text color
 *   - isDarkMode          optional override; defaults to ThemeContext
 */
export default function MapHistoryGroup({
	label,
	items = [],
	onSelectItem,
	onPressHeader,
	metrics,
	containerRadius = 22,
	headerMetrics,
	hideRowChevron = false,
	sectionTitleColor,
	isDarkMode: isDarkModeProp,
}) {
	const { isDarkMode: isDarkModeCtx } = useTheme();
	const isDarkMode = isDarkModeProp ?? isDarkModeCtx;
	const theme = useMemo(
		() => buildHistoryThemeTokens({ isDarkMode, surface: "row" }),
		[isDarkMode],
	);

	if (!Array.isArray(items) || items.length === 0) return null;

	const hasHeader = Boolean(label);
	const headerIsPressable = hasHeader && typeof onPressHeader === "function";

	// Compute hairline left inset: align with text's leading edge inside the
	// padded group. The group's paddingHorizontal already insets the right.
	const hairlineLeftInset =
		theme.rowPaddingX + metrics.orbSize + metrics.gap;

	const resolvedHeaderTitleColor = sectionTitleColor || theme.groupTitleColor;

	const headerContent = hasHeader ? (
		<View
			style={[
				historyGroupStyles.header,
				{ paddingBottom: headerMetrics?.paddingBottom || 10 },
			]}
		>
			<Text
				style={[
					historyGroupStyles.headerTitle,
					{
						color: resolvedHeaderTitleColor,
						fontSize: headerMetrics?.titleSize || 14,
						lineHeight: headerMetrics?.titleLineHeight || 18,
					},
				]}
			>
				{label}
			</Text>
			{headerIsPressable ? (
				<Ionicons
					name="chevron-forward"
					size={headerMetrics?.chevronSize || 14}
					color={theme.headerChevronColor}
				/>
			) : null}
		</View>
	) : null;

	return (
		<View style={historyGroupStyles.group}>
			{headerIsPressable ? (
				<Pressable
					onPress={onPressHeader}
					accessibilityRole="button"
					style={({ pressed }) => [pressed ? { opacity: 0.72 } : null]}
				>
					{headerContent}
				</Pressable>
			) : (
				headerContent
			)}

			<View
				style={[
					historyGroupStyles.container,
					{
						backgroundColor: theme.groupSurface,
						borderRadius: containerRadius,
						paddingHorizontal: theme.groupPaddingX,
						paddingVertical: theme.groupPaddingY,
					},
				]}
			>
				{items.map((item, index) => (
					<React.Fragment key={item.id || item.requestId || index}>
						<MapHistoryRow
							item={item}
							onPress={onSelectItem}
							metrics={metrics}
							hideChevron={hideRowChevron}
							isDarkMode={isDarkMode}
						/>
						{index < items.length - 1 ? (
							<View
								style={{
									height: StyleSheet.hairlineWidth,
									backgroundColor: theme.hairlineDivider,
									marginLeft: hairlineLeftInset,
								}}
							/>
						) : null}
					</React.Fragment>
				))}
			</View>
		</View>
	);
}

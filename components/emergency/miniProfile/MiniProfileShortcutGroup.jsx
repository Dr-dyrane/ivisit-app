import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function MiniProfileShortcutGroup({ rows, colors, layout }) {
	return (
		<View
			style={[
				styles.shortcutGroup,
				{
					backgroundColor: colors.card,
					borderRadius: layout.groups.radius,
					borderCurve: Platform.OS === "ios" ? "continuous" : undefined,
				},
			]}
		>
			{rows.map((row, rowIndex) => (
				<MiniProfileShortcutRow
					key={row.key}
					row={row}
					isLast={rowIndex === rows.length - 1}
					colors={colors}
					layout={layout}
				/>
			))}
		</View>
	);
}

function MiniProfileShortcutRow({ row, isLast, colors, layout }) {
	return (
		<Pressable
			onPress={row.onPress}
			style={({ pressed }) => [
				styles.shortcutRow,
				{
					minHeight: layout.row.minHeight,
					paddingLeft: layout.row.paddingLeft,
					paddingRight: layout.row.paddingRight,
				},
				pressed ? styles.rowPressed : null,
			]}
		>
			<View
				style={[
					styles.orb,
					{
						width: layout.row.orbSize,
						height: layout.row.orbSize,
						marginRight: layout.row.orbGap,
						backgroundColor: row.tone.bg,
					},
				]}
			>
				<Ionicons name={row.icon} size={layout.row.iconSize} color={row.tone.icon} />
			</View>
			<View
				style={[
					styles.rowContent,
					{
						minHeight: layout.row.minHeight,
						gap: layout.row.contentGap,
						borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
						borderBottomColor: colors.divider,
					},
				]}
			>
				<Text
					style={[
						styles.rowLabel,
						{
							color: colors.text,
							fontSize: layout.row.labelSize,
							lineHeight: layout.row.labelLineHeight,
							fontWeight: layout.row.labelWeight,
						},
					]}
					numberOfLines={1}
				>
					{row.label}
				</Text>
				<View style={styles.rowRight}>
					{row.badge && (
						<View
							style={[
								styles.badge,
								{
									backgroundColor: colors.badge,
									minHeight: layout.row.badgeMinHeight,
									paddingHorizontal: layout.row.badgePaddingHorizontal,
								},
							]}
						>
							<Text
								style={[
									styles.badgeText,
									{
										color: colors.badgeText,
										fontSize: layout.row.badgeSize,
										lineHeight: layout.row.badgeLineHeight,
										fontWeight: layout.row.badgeWeight,
									},
								]}
								numberOfLines={1}
							>
								{row.badge}
							</Text>
						</View>
					)}
					<Ionicons
						name="chevron-forward"
						size={layout.row.chevronSize}
						color={colors.subtle}
					/>
				</View>

			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	shortcutGroup: {
		overflow: "hidden",
	},
	shortcutRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	rowPressed: {
		opacity: 0.86,
		transform: [{ scale: 0.992 }],
	},
	orb: {
		borderRadius: 999,
		alignItems: "center",
		justifyContent: "center",
	},
	rowContent: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	rowLabel: {
		flex: 1,
		letterSpacing: -0.12,
	},
	rowRight: {
		flexDirection: "row",
		alignItems: "center",
		gap: 7,
	},
	badge: {
		maxWidth: 96,
		borderRadius: 999,
		alignItems: "center",
		justifyContent: "center",
	},
	badgeText: {},
});

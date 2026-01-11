import { useMemo, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../../../contexts/ThemeContext";
import { COLORS } from "../../../constants/colors";

export function ActiveVisitsSwitcher({
	mode,
	hasAmbulance,
	hasBed,
	onSelectMode,
}) {
	const { isDarkMode } = useTheme();

	const options = useMemo(() => {
		const items = [];
		if (hasAmbulance) items.push({ id: "emergency", label: "Ambulance" });
		if (hasBed) items.push({ id: "booking", label: "Bed" });
		return items;
	}, [hasAmbulance, hasBed]);

	const handleSelect = useCallback(
		(next) => {
			if (typeof onSelectMode !== "function") return;
			if (!next) return;
			onSelectMode(next);
		},
		[onSelectMode]
	);

	if (options.length < 2) return null;

	return (
		<View
			style={[
				styles.container,
				{
					backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "#F1F5F9",
					borderColor: isDarkMode ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
				},
			]}
		>
			{options.map((opt) => {
				const isActive = opt.id === mode;
				return (
					<Pressable
						key={opt.id}
						onPress={() => handleSelect(opt.id)}
						style={({ pressed }) => [
							styles.pill,
							{
								backgroundColor: isActive
									? COLORS.brandPrimary
									: "transparent",
								opacity: pressed ? 0.85 : 1,
							},
						]}
					>
						<Text
							style={[
								styles.pillText,
								{
									color: isActive
										? "#FFFFFF"
										: isDarkMode
											? "rgba(255,255,255,0.82)"
											: "rgba(15,23,42,0.78)",
								},
							]}
						>
							{opt.label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignSelf: "center",
		flexDirection: "row",
		borderRadius: 999,
		padding: 4,
		borderWidth: 1,
		marginBottom: 12,
	},
	pill: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 999,
		minWidth: 108,
		alignItems: "center",
	},
	pillText: {
		fontSize: 14,
		fontWeight: "600",
		letterSpacing: -0.2,
	},
});


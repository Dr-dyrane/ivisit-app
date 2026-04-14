import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function MapHeaderIconButton({
	accessibilityLabel,
	backgroundColor,
	color,
	hitSlop = 10,
	iconName = "close",
	iconSize = 17,
	onPress,
	pressableStyle,
	style,
}) {
	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			hitSlop={hitSlop}
			style={pressableStyle}
		>
			{({ pressed }) => (
				<View
					style={[
						style,
						{ backgroundColor, borderRadius: 999, overflow: "hidden" },
						{
							opacity: pressed ? 0.84 : 1,
							transform: [{ scale: pressed ? 0.96 : 1 }],
						},
					]}
				>
					<Ionicons name={iconName} size={iconSize} color={color} />
				</View>
			)}
		</Pressable>
	);
}

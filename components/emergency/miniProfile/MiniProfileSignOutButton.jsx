import { Platform, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function MiniProfileSignOutButton({
	visible,
	isSigningOut,
	colors,
	layout,
	onPress,
}) {
	if (!visible) return null;

	return (
		<Pressable
			onPress={onPress}
			disabled={isSigningOut}
			style={({ pressed }) => [
				styles.signOutRow,
				{
					marginTop: layout.signOut.marginTop,
					minHeight: layout.signOut.minHeight,
					borderRadius: layout.signOut.radius,
					backgroundColor: colors.dangerBg,
					opacity: isSigningOut ? 0.7 : 1,
					borderCurve: Platform.OS === "ios" ? "continuous" : undefined,
				},
				pressed && !isSigningOut ? styles.rowPressed : null,
			]}
		>
			<Ionicons name="exit" size={layout.signOut.iconSize} color={colors.dangerText} />
			<Text
				style={[
					styles.signOutText,
					{
						color: colors.dangerText,
						fontSize: layout.signOut.textSize,
						lineHeight: layout.signOut.textLineHeight,
						fontWeight: layout.signOut.textWeight,
					},
				]}
			>
				{isSigningOut ? "Signing Out..." : "Sign Out"}
			</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	signOutRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},
	rowPressed: {
		opacity: 0.86,
		transform: [{ scale: 0.992 }],
	},
	signOutText: {
		letterSpacing: -0.08,
	},
});

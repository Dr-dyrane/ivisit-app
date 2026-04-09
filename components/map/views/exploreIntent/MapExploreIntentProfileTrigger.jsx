import React from "react";
import { Image, Platform, Pressable, View } from "react-native";
import styles from "./mapExploreIntent.styles";

export default function MapExploreIntentProfileTrigger({
	onPress,
	userImageSource,
	isSignedIn,
	isCollapsed = false,
}) {
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.avatarPressable,
				isCollapsed ? styles.avatarPressableCollapsed : null,
				{ transform: [{ scale: pressed ? 0.96 : 1 }] },
			]}
		>
			<Image
				source={userImageSource}
				resizeMode="cover"
				style={[
					styles.avatarImage,
					isCollapsed ? styles.avatarImageCollapsed : null,
					{
						shadowColor: "#000000",
						shadowOpacity: 0.16,
						shadowRadius: 12,
						shadowOffset: { width: 0, height: 6 },
						...Platform.select({
							web: {
								boxShadow: "0px 10px 18px rgba(15,23,42,0.18)",
							},
						}),
					},
				]}
			/>
			{isSignedIn ? <View style={[styles.avatarDot, isCollapsed ? styles.avatarDotCollapsed : null]} /> : null}
		</Pressable>
	);
}

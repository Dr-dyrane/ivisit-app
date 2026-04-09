import React, { useCallback, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text } from "react-native";
import * as WebBrowser from "expo-web-browser";

export default function InAppBrowserLink({
	label,
	url,
	color = "#64748B",
	align = "center",
	style,
	textStyle,
}) {
	const [isOpening, setIsOpening] = useState(false);

	const handlePress = useCallback(async () => {
		if (!url || isOpening) {
			return;
		}

		try {
			setIsOpening(true);
			await WebBrowser.openBrowserAsync(url, {
				controlsColor: color,
				enableBarCollapsing: true,
				showTitle: true,
				presentationStyle:
					WebBrowser.WebBrowserPresentationStyle?.PAGE_SHEET ??
					WebBrowser.WebBrowserPresentationStyle?.FORM_SHEET,
			});
		} catch {
			await Linking.openURL(url);
		} finally {
			setIsOpening(false);
		}
	}, [color, isOpening, url]);

	return (
		<Pressable
			onPress={handlePress}
			disabled={!url || isOpening}
			hitSlop={8}
			accessibilityRole="link"
			accessibilityLabel={label}
			style={({ pressed }) => [
				styles.link,
				{
					alignSelf: align === "start" ? "flex-start" : "center",
					opacity: pressed || isOpening ? 0.72 : 1,
				},
				style,
			]}
		>
			{isOpening ? <ActivityIndicator size="small" color={color} style={styles.loader} /> : null}
			<Text
				style={[
					styles.text,
					{
						color,
						textAlign: align === "start" ? "left" : "center",
					},
					textStyle,
				]}
			>
				{label}
			</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	link: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
	},
	loader: {
		marginRight: 4,
	},
	text: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "400",
	},
});

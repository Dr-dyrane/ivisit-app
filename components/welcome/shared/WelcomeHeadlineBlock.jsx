import React from "react";
import { Platform, Text } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../../constants/colors";
import { WELCOME_COPY } from "../welcomeContent";

/**
 * WelcomeHeadlineBlock
 *
 * Renders the gradient headline text.
 * Web: CSS background-clip gradient via inline style.
 * Native: MaskedView + LinearGradient for true gradient text.
 */
export default function WelcomeHeadlineBlock({ styles, headlineDisplayStyle, colors, isDarkMode }) {
	if (Platform.OS === "web") {
		return (
			<Text
				style={[
					styles.headline,
					headlineDisplayStyle,
					{
						color: "transparent",
						backgroundImage: `linear-gradient(135deg, ${colors.headline} 0%, ${colors.headline} 62%, ${COLORS.brandPrimary} 100%)`,
						backgroundClip: "text",
						WebkitBackgroundClip: "text",
						WebkitTextFillColor: "transparent",
						textShadowColor: isDarkMode ? "rgba(134,16,14,0.16)" : "rgba(134,16,14,0.10)",
						textShadowRadius: 12,
					},
				]}
			>
				{WELCOME_COPY.headline}
			</Text>
		);
	}

	return (
		<MaskedView
			maskElement={
				<Text style={[styles.headline, headlineDisplayStyle]}>
					{WELCOME_COPY.headline}
				</Text>
			}
		>
			<LinearGradient
				colors={[colors.headline, colors.headline, COLORS.brandPrimary]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
			>
				<Text style={[styles.headline, headlineDisplayStyle, { opacity: 0 }]}>
					{WELCOME_COPY.headline}
				</Text>
			</LinearGradient>
		</MaskedView>
	);
}

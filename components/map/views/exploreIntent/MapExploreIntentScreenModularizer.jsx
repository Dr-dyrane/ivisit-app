import React from "react";
import { View } from "react-native";
import styles from "./mapExploreIntent.styles";

export default function MapExploreIntentScreenModularizer({
	screens = [],
	isWebMobileVariant = false,
	isWebMobileMd = false,
	presentationMode = "sheet",
	centerContent = false,
	contentMaxWidth = null,
}) {
	const resolvedScreens = Array.isArray(screens) ? screens.filter(Boolean) : [];
	const panelMaxWidth = contentMaxWidth ? Math.min(contentMaxWidth * 1.55, 1180) : null;

	const renderScreen = (
		{
			key,
			content,
			fullBleed = false,
			containerStyle = null,
			panelFlex = 1,
			panelMinWidth = 0,
		},
		{ inPanelRow = false } = {},
	) => (
		<View
			key={key}
			style={[
				!fullBleed ? styles.contentSectionInset : null,
				!fullBleed && !inPanelRow && isWebMobileVariant ? styles.contentSectionInsetWebMobile : null,
				!fullBleed && !inPanelRow && isWebMobileMd ? styles.contentSectionInsetWebMobileMd : null,
				!fullBleed && !inPanelRow && centerContent ? styles.contentSectionCentered : null,
				!fullBleed && !inPanelRow && centerContent && contentMaxWidth
					? { maxWidth: contentMaxWidth }
					: null,
				inPanelRow
					? [styles.screenPanelItem, { flex: panelFlex, minWidth: panelMinWidth }]
					: null,
				containerStyle,
			]}
		>
			{content}
		</View>
	);

	if (presentationMode === "panel") {
		const inlineScreens = resolvedScreens.filter((screen) => !screen.fullBleed);
		const fullBleedScreens = resolvedScreens.filter((screen) => screen.fullBleed);
		const leadScreens = inlineScreens.slice(0, 2);
		const trailingScreens = inlineScreens.slice(2);

		return (
			<>
				{leadScreens.length ? (
					<View
						style={[
							styles.screenPanelRow,
							centerContent ? styles.contentSectionCentered : null,
							panelMaxWidth ? { maxWidth: panelMaxWidth } : null,
						]}
					>
						{leadScreens.map((screen) => renderScreen(screen, { inPanelRow: true }))}
					</View>
				) : null}
				{trailingScreens.map((screen) => renderScreen(screen))}
				{fullBleedScreens.map((screen) => renderScreen(screen))}
			</>
		);
	}

	return <>{resolvedScreens.map((screen) => renderScreen(screen))}</>;
}

import React from "react";
import { Text, View } from "react-native";
import MapProviderListContent from "./MapProviderListSheet";
import MapHeaderIconButton from "../shared/MapHeaderIconButton";
import styles from "./mapProviderListStage.styles";

export function MapProviderListTopSlot({
	containerStyle,
	titleColor,
	closeSurfaceColor,
	titleLabel,
	onClose,
}) {
	return (
		<View style={[styles.headerRow, containerStyle]}>
			<View style={styles.headerCopy}>
				<Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
					{titleLabel}
				</Text>
			</View>
			<MapHeaderIconButton
				onPress={onClose}
				accessibilityLabel={`Close ${titleLabel}`}
				backgroundColor={closeSurfaceColor}
				color={titleColor}
				style={styles.closeButton}
			/>
		</View>
	);
}

export function MapProviderListBodyContent({
	providerCategory,
	location,
	countryCode,
	onSelectProvider,
	selectedProviderId,
	isSidebarPresentation = false,
}) {
	return (
		<MapProviderListContent
			providerCategory={providerCategory}
			location={location}
			countryCode={countryCode}
			onSelectProvider={onSelectProvider}
			selectedProviderId={selectedProviderId}
			isSidebarPresentation={isSidebarPresentation}
		/>
	);
}

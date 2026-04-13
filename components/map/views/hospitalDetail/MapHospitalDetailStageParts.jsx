import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapHospitalDetailBody from "../../surfaces/hospitals/MapHospitalDetailBody";
import MapHospitalDetailCollapsedRow from "./MapHospitalDetailCollapsedRow";
import styles from "./mapHospitalDetailStage.styles";

export function MapHospitalDetailCollapsedTopSlot({
	model,
	onExpand,
	onClose,
	titleColor,
	mutedColor,
	isDarkMode,
	iconSurfaceColor,
	iconBorderColor,
}) {
	return (
		<MapHospitalDetailCollapsedRow
			action={model.collapsedAction}
			title={model.summary.title}
			subtitle={model.collapsedDistanceLabel}
			onExpand={onExpand}
			onClose={onClose}
			titleColor={titleColor}
			mutedColor={mutedColor}
			isDarkMode={isDarkMode}
			iconSurfaceColor={iconSurfaceColor}
			iconBorderColor={iconBorderColor}
		/>
	);
}

export function MapHospitalDetailFloatingTopSlot({
	modalContainedStyle,
	contentMaxWidth,
	canCycleHospital,
	onCycleHospital,
	floatingCycleSurface,
	floatingCycleIconColor,
	shouldShowFloatingTitle,
	floatingTitleColor,
	title,
	onClose,
	floatingCloseSurface,
	floatingCloseIconColor,
}) {
	return (
		<View pointerEvents="box-none" style={styles.floatingTopSlot}>
			<View
				pointerEvents="box-none"
				style={[
					styles.floatingTopHeader,
					modalContainedStyle
						? {
								left: null,
								right: null,
								width: "100%",
								maxWidth: contentMaxWidth,
								alignSelf: "center",
								paddingHorizontal: 14,
							}
						: null,
				]}
			>
				{canCycleHospital ? (
					<Pressable
						onPress={onCycleHospital}
						accessibilityRole="button"
						accessibilityLabel="Show next hospital"
						hitSlop={10}
						style={styles.floatingTopActionPressable}
					>
						{({ pressed }) => (
							<View
								style={[
									styles.floatingTopActionButton,
									{ backgroundColor: floatingCycleSurface },
									pressed ? styles.floatingTopCloseButtonPressed : null,
								]}
							>
								<Ionicons
									name="chevron-forward"
									size={20}
									color={floatingCycleIconColor}
								/>
							</View>
						)}
					</Pressable>
				) : (
					<View style={styles.floatingTopSpacer} />
				)}
				<View style={styles.floatingTopTitleWrap}>
					{shouldShowFloatingTitle ? (
						<Text
							numberOfLines={1}
							style={[styles.floatingTopTitle, { color: floatingTitleColor }]}
						>
							{title}
						</Text>
					) : null}
				</View>
				<Pressable
					onPress={onClose}
					accessibilityRole="button"
					accessibilityLabel="Close hospital details"
					hitSlop={10}
					style={styles.floatingTopClosePressable}
				>
					{({ pressed }) => (
						<View
							style={[
								styles.floatingTopCloseButton,
								{ backgroundColor: floatingCloseSurface },
								pressed ? styles.floatingTopCloseButtonPressed : null,
							]}
						>
							<Ionicons name="close" size={18} color={floatingCloseIconColor} />
						</View>
					)}
				</Pressable>
			</View>
		</View>
	);
}

export function MapHospitalDetailBodyContent({
	model,
	revealHero,
	onExpandedHeaderLayout,
	onCycleHospital,
	selectedAmbulanceServiceId,
	selectedRoomServiceId,
	onSelectAmbulanceServiceId,
	onSelectRoomServiceId,
}) {
	return (
		<MapHospitalDetailBody
			model={model}
			revealHero={revealHero}
			onExpandedHeaderLayout={onExpandedHeaderLayout}
			onCycleHospital={onCycleHospital}
			selectedAmbulanceServiceId={selectedAmbulanceServiceId}
			selectedRoomServiceId={selectedRoomServiceId}
			onSelectAmbulanceServiceId={onSelectAmbulanceServiceId}
			onSelectRoomServiceId={onSelectRoomServiceId}
		/>
	);
}

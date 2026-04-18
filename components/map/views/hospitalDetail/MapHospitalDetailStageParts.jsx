import React from "react";
import { Text, View } from "react-native";
import MapHospitalDetailBody from "../../surfaces/hospitals/MapHospitalDetailBody";
import MapHeaderIconButton from "../shared/MapHeaderIconButton";
import MapHospitalDetailCollapsedRow from "./MapHospitalDetailCollapsedRow";
import styles from "./mapHospitalDetailStage.styles";

export function MapHospitalDetailCollapsedTopSlot({
	model,
	onExpand,
	onClose,
	titleColor,
	mutedColor,
	iconSurfaceColor,
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
			iconSurfaceColor={iconSurfaceColor}
		/>
	);
}

export function MapHospitalDetailFloatingTopSlot({
	modalContainedStyle,
	contentMaxWidth,
	showToggle = true,
	onToggle,
	toggleAccessibilityLabel = "Toggle hospital sheet size",
	toggleIconName = "chevron-up",
	floatingToggleSurface,
	floatingToggleIconColor,
	shouldShowFloatingTitle,
	floatingTitleColor,
	title,
	subtitle,
	mutedColor,
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
				{showToggle ? (
					<MapHeaderIconButton
						onPress={onToggle}
						accessibilityLabel={toggleAccessibilityLabel}
						backgroundColor={floatingToggleSurface}
						color={floatingToggleIconColor}
						iconName={toggleIconName}
						iconSize={19}
						pressableStyle={styles.floatingTopActionPressable}
						style={styles.floatingTopActionButton}
					/>
				) : (
					<View style={styles.floatingTopActionSpacer} />
				)}
				<View style={styles.floatingTopTitleWrap}>
					{shouldShowFloatingTitle ? (
						<>
							<Text
								numberOfLines={1}
								style={[styles.floatingTopTitle, { color: floatingTitleColor }]}
							>
								{title}
							</Text>
							{subtitle ? (
								<Text
									numberOfLines={1}
									style={[styles.floatingTopSubtitle, { color: mutedColor }]}
								>
									{subtitle}
								</Text>
							) : null}
						</>
					) : null}
				</View>
				<MapHeaderIconButton
					onPress={onClose}
					accessibilityLabel="Close hospital details"
					backgroundColor={floatingCloseSurface}
					color={floatingCloseIconColor}
					pressableStyle={styles.floatingTopClosePressable}
					style={styles.floatingTopCloseButton}
				/>
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
	onOpenServiceDetails,
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
			onOpenServiceDetails={onOpenServiceDetails}
		/>
	);
}

import React from "react";
import { Text, View } from "react-native";
import MapHeaderIconButton from "../shared/MapHeaderIconButton";
import MapVisitDetailBody from "../../surfaces/visitDetail/MapVisitDetailBody";
import styles from "./mapVisitDetailStage.styles";

/**
 * MapVisitDetailFloatingTopSlot
 *
 * Floating top slot for VISIT_DETAIL sheet phase.
 * Mirrors MapHospitalDetailFloatingTopSlot but simpler (no collapsed state):
 *   - Toggle button (half ↔ expanded) on the leading edge
 *   - Centered title (hospital name) + subtitle (visit type)
 *   - Close button on the trailing edge
 */
export function MapVisitDetailFloatingTopSlot({
	modalContainedStyle,
	contentMaxWidth,
	showToggle = true,
	onToggle,
	toggleAccessibilityLabel = "Toggle visit sheet size",
	toggleIconName = "chevron-up",
	floatingToggleSurface,
	floatingToggleIconColor,
	shouldShowFloatingTitle = true,
	title,
	subtitle,
	titleColor,
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
							{title ? (
								<Text
									numberOfLines={1}
									style={[styles.floatingTopTitle, { color: titleColor }]}
								>
									{title}
								</Text>
							) : null}
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
					accessibilityLabel="Close visit details"
					backgroundColor={floatingCloseSurface}
					color={floatingCloseIconColor}
					pressableStyle={styles.floatingTopClosePressable}
					style={styles.floatingTopCloseButton}
				/>
			</View>
		</View>
	);
}

export function MapVisitDetailBodyContent({
	model,
	onCancelVisit,
	isExpanded,
	onExpandedHeaderLayout,
}) {
	return (
		<MapVisitDetailBody
			model={model}
			onCancelVisit={onCancelVisit}
			revealHero={isExpanded}
			onExpandedHeaderLayout={onExpandedHeaderLayout}
		/>
	);
}

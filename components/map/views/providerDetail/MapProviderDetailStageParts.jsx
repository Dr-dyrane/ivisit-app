// components/map/views/providerDetail/MapProviderDetailStageParts.jsx
//
// Named exports for PROVIDER_DETAIL sheet phase slots.
// Exact mirror of MapHospitalDetailStageParts + MapVisitDetailStageParts:
//   - MapProviderDetailCollapsedTopSlot
//   - MapProviderDetailFloatingTopSlot
//   - MapProviderDetailBodyContent

import React from "react";
import { Text, View } from "react-native";
import MapHeaderIconButton from "../shared/MapHeaderIconButton";
import MapProviderDetailBody from "../../surfaces/providerDetail/MapProviderDetailBody";
import MapProviderDetailCollapsedRow from "./MapProviderDetailCollapsedRow";
import FadeEndText from "../../../ui/FadeEndText";
import styles from "./mapProviderDetailStage.styles";

// ─── Collapsed top slot ───────────────────────────────────────────────────────

export function MapProviderDetailCollapsedTopSlot({
	model,
	onExpand,
	onClose,
	titleColor,
	mutedColor,
	iconSurfaceColor,
}) {
	return (
		<MapProviderDetailCollapsedRow
			action={model.collapsedAction}
			title={model.summary.title}
			subtitle={model.collapsedDistanceLabel}
			onExpand={onExpand}
			onClose={onClose}
			titleColor={titleColor}
			mutedColor={mutedColor}
			iconSurfaceColor={iconSurfaceColor}
			tintColor={model.tintColor}
		/>
	);
}

// ─── Floating top slot (HALF + EXPANDED) ─────────────────────────────────────

export function MapProviderDetailFloatingTopSlot({
	modalContainedStyle,
	contentMaxWidth,
	showToggle = true,
	onToggle,
	toggleAccessibilityLabel = "Toggle provider sheet size",
	toggleIconName = "chevron-up",
	floatingToggleSurface,
	floatingToggleIconColor,
	shouldShowFloatingTitle = false,
	floatingTitleColor,
	floatingTitleFadeColor,
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
							{title ? (
								<FadeEndText
									text={title}
									fadeColor={floatingTitleFadeColor}
									fadeWidth={28}
									fadeRadius={12}
									containerStyle={styles.floatingTopTitleFade}
									textStyle={[styles.floatingTopTitle, { color: floatingTitleColor }]}
								/>
							) : null}
							{subtitle ? (
								<FadeEndText
									text={subtitle}
									fadeColor={floatingTitleFadeColor}
									fadeWidth={28}
									fadeRadius={12}
									containerStyle={styles.floatingTopTitleFade}
									textStyle={[styles.floatingTopSubtitle, { color: mutedColor }]}
								/>
							) : null}
						</>
					) : null}
				</View>

				<MapHeaderIconButton
					onPress={onClose}
					accessibilityLabel="Close provider details"
					backgroundColor={floatingCloseSurface}
					color={floatingCloseIconColor}
					pressableStyle={styles.floatingTopClosePressable}
					style={styles.floatingTopCloseButton}
				/>
			</View>
		</View>
	);
}

// ─── Body content ─────────────────────────────────────────────────────────────

export function MapProviderDetailBodyContent({
	model,
	revealHero = false,
	onExpandedHeaderLayout,
}) {
	return (
		<MapProviderDetailBody
			model={model}
			revealHero={revealHero}
			onExpandedHeaderLayout={onExpandedHeaderLayout}
		/>
	);
}

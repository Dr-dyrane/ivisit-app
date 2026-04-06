import React from "react";
import { Pressable, Text, View } from "react-native";
import EntryActionButton from "../../../../entry/EntryActionButton";
import EmergencyHospitalRoutePreview from "../../EmergencyHospitalRoutePreview";
import { EMERGENCY_FLOW_STATES } from "../../../emergencyFlowContent";

const SPLIT_LAYOUT_VARIANTS = new Set([
	"ios-pad",
	"android-tablet",
	"android-chromebook",
	"macbook",
	"web-sm-wide",
	"web-md",
	"web-lg",
	"web-xl",
	"web-2xl-3xl",
	"web-ultra-wide",
]);

export default function EmergencyChooseHospitalStageBase({
	variant = "ios-mobile",
	activeLocation,
	hospital,
	routeCoordinates = [],
	routeInfo = null,
	isCalculatingRoute = false,
	displayedEta,
	headlineText,
	helperText,
	isRefreshingRoutePreview = false,
	isRefreshingCatalog = false,
	hospitalChoiceMessage = "",
	onPrimaryPress,
	onSecondaryPress,
	metrics,
	styles,
}) {
	const useSplitLayout = SPLIT_LAYOUT_VARIANTS.has(variant);
	const reviewNotice = isRefreshingRoutePreview
		? "Updating route to the selected hospital."
		: isRefreshingCatalog && hospitalChoiceMessage
			? hospitalChoiceMessage
			: "";
	const primaryLabel = isRefreshingRoutePreview
		? "Updating route..."
		: EMERGENCY_FLOW_STATES.proposed_hospital.primaryAction;
	const secondaryLabel = EMERGENCY_FLOW_STATES.proposed_hospital.secondaryAction;
	const canRenderMap = !!activeLocation && !!hospital;
	const mapBottomPadding = useSplitLayout ? 32 : metrics.primaryHeight + 228;

	const reviewCard = (
		<View style={useSplitLayout ? styles.reviewSplitSheet : styles.reviewSheet}>
			<View style={styles.reviewWell}>
				<View style={styles.reviewEtaCard}>
					<Text style={styles.reviewEtaLabel}>Estimated arrival</Text>
					<Text style={styles.reviewEtaValue}>{displayedEta}</Text>
				</View>
				<View style={styles.reviewCopyBlock}>
					<Text style={styles.reviewHeadline}>{headlineText}</Text>
					{helperText ? (
						<Text style={styles.reviewHelper}>{helperText}</Text>
					) : null}
					{reviewNotice ? (
						<View style={styles.reviewMetaRow}>
							<View style={styles.reviewMetaChip}>
								<Text style={styles.reviewMetaText}>{reviewNotice}</Text>
							</View>
						</View>
					) : null}
				</View>
				<View style={styles.reviewActions}>
					<EntryActionButton
						label={primaryLabel}
						variant="primary"
						height={metrics.primaryHeight}
						onPress={isRefreshingRoutePreview ? undefined : onPrimaryPress}
					/>
					<Pressable
						onPress={isRefreshingRoutePreview ? undefined : onSecondaryPress}
						style={[
							styles.reviewQuietLink,
							isRefreshingRoutePreview ? { opacity: 0.56 } : null,
						]}
					>
						<Text style={styles.quietLinkText}>{secondaryLabel}</Text>
					</Pressable>
				</View>
			</View>
		</View>
	);

	if (!useSplitLayout) {
		return reviewCard;
	}

	return (
		<View style={styles.reviewSplitShell}>
			<View style={styles.reviewSplitMapPanel}>
				{canRenderMap ? (
					<EmergencyHospitalRoutePreview
						key={`choose-hospital-${variant}-${hospital?.id || "none"}`}
						origin={activeLocation}
						hospital={hospital}
						bottomPadding={mapBottomPadding}
						routeCoordinates={routeCoordinates}
						routeInfo={routeInfo}
						isCalculatingRoute={isCalculatingRoute}
						visible={true}
						showLoadingBadge={true}
					/>
				) : null}
			</View>
			<View style={styles.reviewSplitCardRail}>{reviewCard}</View>
		</View>
	);
}

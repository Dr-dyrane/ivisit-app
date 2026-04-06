import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EntryActionButton from "../../../../entry/EntryActionButton";
import EmergencyHospitalRoutePreview from "../../EmergencyHospitalRoutePreview";
import { EMERGENCY_FLOW_STATES } from "../../../emergencyFlowContent";

const STACKED_REVIEW_VARIANTS = new Set([
	"android-fold",
	"android-tablet",
	"web-sm-wide",
	"web-md",
]);

const SIDE_BY_SIDE_LAYOUT_VARIANTS = new Set([
	"ios-pad",
	"android-chromebook",
	"macbook",
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
	showRouteMap = true,
	onPrimaryPress,
	onSecondaryPress,
	metrics,
	styles,
}) {
	const useStackedReviewLayout = STACKED_REVIEW_VARIANTS.has(variant);
	const useSideBySideLayout = SIDE_BY_SIDE_LAYOUT_VARIANTS.has(variant);
	const useSplitLayout = useStackedReviewLayout || useSideBySideLayout;
	const reviewNotice = isRefreshingRoutePreview
		? "Updating route to the selected hospital."
		: isRefreshingCatalog && hospitalChoiceMessage
			? hospitalChoiceMessage
			: "";
	const primaryLabel = isRefreshingRoutePreview
		? "Updating route..."
		: EMERGENCY_FLOW_STATES.proposed_hospital.primaryAction;
	const secondaryLabel = EMERGENCY_FLOW_STATES.proposed_hospital.secondaryAction;
	const hospitalImageUri =
		typeof hospital?.image === "string" && hospital.image.trim().length > 0
			? hospital.image.trim()
			: null;
	const hospitalDistance =
		typeof hospital?.distance === "number"
			? `${hospital.distance.toFixed(hospital.distance >= 10 ? 0 : 1)} km away`
			: typeof hospital?.distance === "string" && hospital.distance.trim().length > 0
				? hospital.distance.trim()
				: routeInfo?.distanceText || null;
	const hospitalWaitTime =
		typeof hospital?.waitTime === "string" && hospital.waitTime.trim().length > 0
			? hospital.waitTime.trim()
			: routeInfo?.durationText || displayedEta;
	const hospitalRating =
		Number.isFinite(Number(hospital?.rating)) && Number(hospital.rating) > 0
			? Number(hospital.rating).toFixed(1)
			: null;
	const hospitalSpecialties = Array.isArray(hospital?.specialties)
		? hospital.specialties
				.filter((item) => typeof item === "string" && item.trim().length > 0)
				.slice(0, 2)
		: [];
	const hospitalServiceLine = hospitalSpecialties.length > 0
		? hospitalSpecialties.join(" • ")
		: "Emergency department";
	const hospitalInitial =
		typeof hospital?.name === "string" && hospital.name.trim().length > 0
			? hospital.name.trim().charAt(0).toUpperCase()
			: "H";
	const panelMeta = [
		hospitalDistance
			? { key: "distance", icon: "navigate-outline", label: hospitalDistance }
			: null,
		hospitalWaitTime
			? { key: "wait", icon: "time-outline", label: `Wait ${hospitalWaitTime}` }
			: null,
		hospitalRating
			? { key: "rating", icon: "star", label: hospitalRating }
			: null,
	].filter(Boolean);
	const canRenderMap = showRouteMap && !!activeLocation && !!hospital;
	const mapBottomPadding = useSplitLayout ? 32 : metrics.primaryHeight + 228;
	const reviewCardContainerStyle = useSideBySideLayout
		? styles.reviewSplitSheet
		: useStackedReviewLayout
			? styles.reviewStackSheet
			: styles.reviewSheet;

	const reviewCard = (
		<View style={reviewCardContainerStyle}>
			<View style={styles.reviewWell}>
				{useSideBySideLayout ? (
					<View style={styles.reviewPanelLead}>
						<Text style={styles.reviewSectionEyebrow}>Emergency destination</Text>
						<View style={styles.reviewHeroMedia}>
							{hospitalImageUri ? (
								<Image
									source={{ uri: hospitalImageUri }}
									style={styles.reviewHeroImage}
									resizeMode="cover"
								/>
							) : (
								<View style={styles.reviewHeroFallback}>
									<Text style={styles.reviewHeroFallbackMonogram}>{hospitalInitial}</Text>
									<Text style={styles.reviewHeroFallbackCaption}>{hospitalServiceLine}</Text>
								</View>
							)}
							<View style={styles.reviewHeroBadge}>
								<Ionicons name="medical-outline" size={12} color="#F8FAFC" />
								<Text style={styles.reviewHeroBadgeText}>Ready for intake</Text>
							</View>
						</View>
					</View>
				) : null}
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
				{useSideBySideLayout ? (
					<View style={styles.reviewSummaryList}>
						{panelMeta.length ? (
							<View style={styles.reviewHospitalMetaRow}>
								{panelMeta.map((item) => (
									<View key={item.key} style={styles.reviewHospitalMetaChip}>
										<Ionicons name={item.icon} size={13} color="#B91C1C" />
										<Text style={styles.reviewHospitalMetaText}>{item.label}</Text>
									</View>
								))}
							</View>
						) : null}
						<View style={styles.reviewSummaryRow}>
							<Text style={styles.reviewSummaryLabel}>Care focus</Text>
							<Text style={styles.reviewSummaryValue} numberOfLines={2}>
								{hospitalServiceLine}
							</Text>
						</View>
					</View>
				) : null}
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

	if (useStackedReviewLayout) {
		return (
			<View style={styles.reviewStackShell}>
				<View style={styles.reviewStackMapPanel}>
					{canRenderMap ? (
						<EmergencyHospitalRoutePreview
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
				<View style={styles.reviewStackCardRail}>{reviewCard}</View>
			</View>
		);
	}

	return (
		<View style={styles.reviewSplitShell}>
			<View style={styles.reviewSplitMapPanel}>
				{canRenderMap ? (
					<EmergencyHospitalRoutePreview
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

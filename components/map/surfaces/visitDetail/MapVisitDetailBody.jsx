import React, { useEffect, useState } from "react";
import {
	ImageBackground,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { styles as bodyStyles } from "./mapVisitDetail.styles";
import { HISTORY_DETAILS_COPY } from "../../history/history.content";

const ACTION_ICON_SIZE = 22;
const RATING_STAR_SIZE = 16;

function RatingStars({ value, tintColor }) {
	const rating = Number(value);
	if (!Number.isFinite(rating)) return null;

	return (
		<View style={bodyStyles.ratingStarsRow}>
			{Array.from({ length: 5 }).map((_, index) => {
				const slot = index + 1;
				let iconName = "star-outline";
				if (rating >= slot) {
					iconName = "star";
				} else if (rating >= slot - 0.5) {
					iconName = "star-half";
				}
				return (
					<Ionicons
						key={`rating-star-${slot}`}
						name={iconName}
						size={RATING_STAR_SIZE}
						color={tintColor}
					/>
				);
			})}
		</View>
	);
}

function SkeletonBlock({ style, color }) {
	return <View style={[bodyStyles.skeletonBlock, { backgroundColor: color }, style]} />;
}

function SectionCard({
	title = null,
	titleColor,
	surfaceColor,
	children,
	collapsible = false,
	expanded = true,
	onToggle,
	summary = null,
	chevronColor,
}) {
	const childCount = React.Children.count(children);
	if (!title && childCount === 0) return null;
	if (title && childCount === 0 && !summary) return null;

	const header = title ? (
		collapsible ? (
			<Pressable
				onPress={onToggle}
				accessibilityRole="button"
				accessibilityLabel={`${expanded ? "Collapse" : "Expand"} ${title}`}
				style={({ pressed }) => [
					bodyStyles.sectionHeaderPressable,
					pressed ? bodyStyles.sectionHeaderPressed : null,
				]}
			>
				<Text style={[bodyStyles.sectionTitle, { color: titleColor }]}>{title}</Text>
				<View style={bodyStyles.sectionHeaderMeta}>
					{summary ? (
						<Text
							numberOfLines={1}
							style={[bodyStyles.sectionSummary, { color: chevronColor }]}
						>
							{summary}
						</Text>
					) : null}
					<Ionicons
						name={expanded ? "chevron-up" : "chevron-down"}
						size={16}
						color={chevronColor}
					/>
				</View>
			</Pressable>
		) : (
			<View style={bodyStyles.sectionHeaderStatic}>
				<Text style={[bodyStyles.sectionTitle, { color: titleColor }]}>{title}</Text>
				{summary ? (
					<Text
						numberOfLines={1}
						style={[bodyStyles.sectionSummary, { color: chevronColor }]}
					>
						{summary}
					</Text>
				) : null}
			</View>
		)
	) : null;

	return (
		<View style={[bodyStyles.sectionCard, { backgroundColor: surfaceColor }]}>
			{header}
			{!collapsible || expanded ? children : null}
		</View>
	);
}

function DetailRows({ rows, theme }) {
	if (!Array.isArray(rows) || rows.length === 0) return null;
	return (
		<View style={bodyStyles.detailList}>
			{rows.map((row, index) => (
				<React.Fragment key={row.key || `${row.label}-${index}`}>
					<View style={bodyStyles.detailRow}>
						<View style={bodyStyles.detailLeading}>
							<View
								style={[
									bodyStyles.detailIconWrap,
									{ backgroundColor: theme.tone.orb },
								]}
							>
								<Ionicons
									name={row.icon || "information-circle-outline"}
									size={15}
									color={theme.tone.icon}
								/>
							</View>
							<Text style={[bodyStyles.detailLabel, { color: theme.mutedColor }]}>
								{row.label}
							</Text>
						</View>
						{row.kind === "rating" && row.ratingValue != null ? (
							<View style={bodyStyles.detailRatingWrap}>
								<RatingStars
									value={row.ratingValue}
									tintColor={theme.actionRateColor}
								/>
							</View>
						) : (
							<Text
								numberOfLines={2}
								style={[bodyStyles.detailValue, { color: theme.titleColor }]}
							>
								{row.value}
							</Text>
						)}
					</View>
					{index < rows.length - 1 ? (
						<View
							style={[
								bodyStyles.detailHairline,
								{ backgroundColor: theme.hairlineDivider },
							]}
						/>
					) : null}
				</React.Fragment>
			))}
		</View>
	);
}

function JourneyCard({ journey, theme }) {
	if (!journey) return null;
	const isDarkSurface = theme.titleColor === "#F8FAFC";
	const routeGradientColors = isDarkSurface
		? ["rgba(255,255,255,0.04)", "rgba(255,255,255,0.01)"]
		: ["rgba(15,23,42,0.03)", "rgba(15,23,42,0.01)"];
	const routeFadeColors = isDarkSurface
		? ["rgba(15,23,42,0)", "rgba(15,23,42,0.86)"]
		: ["rgba(255,255,255,0)", "rgba(255,255,255,0.96)"];
	const clampedProgress = Math.max(
		0,
		Math.min(100, Math.round((Number(journey.progressValue) || 0) * 100)),
	);
	return (
		<SectionCard
			title={HISTORY_DETAILS_COPY.sectionTitles.journey}
			titleColor={theme.groupTitleColor}
			surfaceColor={theme.groupSurface}
			chevronColor={theme.mutedColor}
		>
			<View style={bodyStyles.routeCardChrome}>
				<LinearGradient
					pointerEvents="none"
					colors={routeGradientColors}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={bodyStyles.routeCardGradient}
				/>
				<View style={bodyStyles.routeMetricRow}>
					{journey.whenLabel ? (
						<View
							style={[
								bodyStyles.routeMetricPill,
								{ backgroundColor: theme.neutralActionSurface },
							]}
						>
							<Text style={[bodyStyles.routeMetricText, { color: theme.titleColor }]}>
								{journey.whenLabel}
							</Text>
						</View>
					) : null}
					{journey.statusLabel ? (
						<Text style={[bodyStyles.routeStatusText, { color: theme.mutedColor }]}>
							{journey.statusLabel}
						</Text>
					) : null}
				</View>
				<View style={bodyStyles.routeHeader}>
					{journey.serviceLabel ? (
						<View style={[bodyStyles.routePill, { backgroundColor: theme.tone.orb }]}>
							<Ionicons
								name={journey.trackingKind === "bed" ? "bed-outline" : "car-outline"}
								size={15}
								color={theme.tone.icon}
							/>
							<Text style={[bodyStyles.routePillText, { color: theme.tone.icon }]}>
								{journey.serviceLabel}
							</Text>
						</View>
					) : null}
					{journey.requestLabel ? (
						<View
							style={[
								bodyStyles.routePill,
								{ backgroundColor: theme.neutralActionSurface },
							]}
						>
							<Ionicons name="receipt-outline" size={15} color={theme.titleColor} />
							<Text style={[bodyStyles.routePillText, { color: theme.titleColor }]}>
								{journey.requestLabel}
							</Text>
						</View>
					) : null}
				</View>
				<View style={bodyStyles.routeStops}>
					<View
						style={[
							bodyStyles.routeConnectorTrack,
							{ backgroundColor: theme.hairlineDivider },
						]}
					/>
					<View
						style={[
							bodyStyles.routeConnectorProgress,
							{
								backgroundColor: theme.tone.icon,
								height: `${clampedProgress}%`,
							},
						]}
					/>
					<View style={bodyStyles.routeStopRow}>
						<View
							style={[
								bodyStyles.routeStopIconWrap,
								{ backgroundColor: theme.tone.orb },
							]}
						>
							<Ionicons name="business-outline" size={16} color={theme.tone.icon} />
						</View>
						<View style={bodyStyles.routeStopCopyWrap}>
							<View style={bodyStyles.routeStopCopy}>
								<Text style={[bodyStyles.routeStopLabel, { color: theme.mutedColor }]}>
									{journey.originLabel || "Hospital"}
								</Text>
								<Text
									numberOfLines={1}
									ellipsizeMode="tail"
									style={[bodyStyles.routeStopTitle, { color: theme.titleColor }]}
								>
									{journey.originTitle}
								</Text>
								{journey.originSubtitle ? (
									<Text
										numberOfLines={1}
										ellipsizeMode="tail"
										style={[bodyStyles.routeStopSubtitle, { color: theme.mutedColor }]}
									>
										{journey.originSubtitle}
									</Text>
								) : null}
							</View>
							<LinearGradient
								pointerEvents="none"
								colors={routeFadeColors}
								start={{ x: 0, y: 0.5 }}
								end={{ x: 1, y: 0.5 }}
								style={bodyStyles.routeStopFade}
							/>
						</View>
					</View>
					<View style={bodyStyles.routeStopRow}>
						<View
							style={[
								bodyStyles.routeStopIconWrap,
								{ backgroundColor: theme.neutralActionSurface },
							]}
						>
							<Ionicons name="navigate" size={16} color={theme.titleColor} />
						</View>
						<View style={bodyStyles.routeStopCopyWrap}>
							<View style={bodyStyles.routeStopCopy}>
								<Text style={[bodyStyles.routeStopLabel, { color: theme.mutedColor }]}>
									{journey.destinationLabel || "Destination"}
								</Text>
								<Text
									numberOfLines={1}
									ellipsizeMode="tail"
									style={[bodyStyles.routeStopTitle, { color: theme.titleColor }]}
								>
									{journey.destinationTitle}
								</Text>
								{journey.destinationSubtitle ? (
									<Text
										numberOfLines={1}
										ellipsizeMode="tail"
										style={[bodyStyles.routeStopSubtitle, { color: theme.mutedColor }]}
									>
										{journey.destinationSubtitle}
									</Text>
								) : null}
							</View>
							<LinearGradient
								pointerEvents="none"
								colors={routeFadeColors}
								start={{ x: 0, y: 0.5 }}
								end={{ x: 1, y: 0.5 }}
								style={bodyStyles.routeStopFade}
							/>
						</View>
					</View>
				</View>
			</View>
		</SectionCard>
	);
}

function VisitDetailSkeleton({ theme }) {
	return (
		<View style={bodyStyles.scrollContent}>
			<View
				style={[
					bodyStyles.heroCanvas,
					bodyStyles.skeletonHeroCard,
					{ backgroundColor: theme.heroSurface },
				]}
			>
				<View style={bodyStyles.skeletonHeroInner}>
					<View style={bodyStyles.skeletonHeroBadgeRow}>
						<SkeletonBlock
							color={theme.skeletonSoftColor}
							style={bodyStyles.skeletonHeroBadge}
						/>
						<SkeletonBlock
							color={theme.skeletonBaseColor}
							style={bodyStyles.skeletonHeroStatus}
						/>
					</View>
					<View style={bodyStyles.skeletonHeroCopy}>
						<SkeletonBlock
							color={theme.skeletonBaseColor}
							style={bodyStyles.skeletonHeroTitle}
						/>
						<SkeletonBlock
							color={theme.skeletonSoftColor}
							style={bodyStyles.skeletonHeroSubtitle}
						/>
						<SkeletonBlock
							color={theme.skeletonSoftColor}
							style={bodyStyles.skeletonHeroSupport}
						/>
					</View>
				</View>
			</View>

			<SkeletonBlock
				color={theme.skeletonBaseColor}
				style={bodyStyles.skeletonPrimaryButton}
			/>

			<View style={[bodyStyles.sectionCard, { backgroundColor: theme.groupSurface }]}>
				{Array.from({ length: 3 }).map((_, index) => (
					<View key={`visit-skeleton-row-${index}`}>
						<View style={bodyStyles.skeletonDetailRow}>
							<SkeletonBlock
								color={theme.skeletonSoftColor}
								style={bodyStyles.skeletonDetailIcon}
							/>
							<View style={bodyStyles.skeletonDetailCopy}>
								<SkeletonBlock
									color={theme.skeletonBaseColor}
									style={bodyStyles.skeletonDetailLabel}
								/>
								<SkeletonBlock
									color={theme.skeletonSoftColor}
									style={bodyStyles.skeletonDetailValue}
								/>
							</View>
						</View>
						{index < 2 ? (
							<View
								style={[
									bodyStyles.detailHairline,
									{ backgroundColor: theme.hairlineDivider },
								]}
							/>
						) : null}
					</View>
				))}
			</View>
		</View>
	);
}

function PassportHero({ hero, theme }) {
	if (!hero) return null;

	return (
		<ImageBackground
			source={hero.imageSource}
			resizeMode="cover"
			fadeDuration={0}
			style={bodyStyles.heroCanvas}
			imageStyle={bodyStyles.heroCanvasImage}
		>
			<LinearGradient
				colors={theme.heroImageScrimColors}
				style={StyleSheet.absoluteFillObject}
			/>
			<LinearGradient
				colors={theme.heroImageTopMaskColors}
				style={bodyStyles.heroTopMask}
			/>
			<View style={bodyStyles.heroCanvasInner}>
				<View style={bodyStyles.heroCanvasMetaRow}>
					<View style={bodyStyles.heroBadgeRail}>
						{Array.isArray(hero.badges)
							? hero.badges.slice(0, 2).map((badge) => (
									<View
										key={badge}
										style={[
											bodyStyles.heroBadge,
											{ backgroundColor: theme.heroBadgeSurface },
										]}
									>
										<Text
											style={[
												bodyStyles.heroBadgeText,
												{ color: theme.heroOnImageBodyColor },
											]}
										>
											{badge}
										</Text>
									</View>
								))
							: null}
					</View>
					{hero.statusLabel ? (
						<View
							style={[
								bodyStyles.heroStatusChip,
								{ backgroundColor: theme.tone.chip },
							]}
						>
							<Text
								style={[
									bodyStyles.heroStatusText,
									{ color: theme.tone.chipText },
								]}
							>
								{hero.statusLabel}
							</Text>
						</View>
					) : null}
				</View>

				<View
					style={[
						bodyStyles.heroCanvasBody,
						{ backgroundColor: theme.heroTextPanelSurface },
					]}
				>
					<Text
						numberOfLines={2}
						style={[
							bodyStyles.heroTitle,
							{ color: theme.heroOnImageTitleColor },
						]}
					>
						{hero.title}
					</Text>
					{hero.subtitle ? (
						<Text
							numberOfLines={2}
							style={[
								bodyStyles.heroSubtitle,
								{ color: theme.heroOnImageBodyColor },
							]}
						>
							{hero.subtitle}
						</Text>
					) : null}
					{hero.supportLine ? (
						<Text
							numberOfLines={2}
							style={[
								bodyStyles.heroSupportLine,
								{ color: theme.heroOnImageBodyColor },
							]}
						>
							{hero.supportLine}
						</Text>
					) : null}
					{hero.facilityLine ? (
						<Text
							numberOfLines={2}
							style={[
								bodyStyles.heroFacilityLine,
								{ color: theme.heroOnImageMutedColor },
							]}
						>
							{hero.facilityLine}
						</Text>
					) : null}
				</View>
			</View>
		</ImageBackground>
	);
}

export default function MapVisitDetailBody({
	model,
	onCancelVisit,
	isExpanded = false,
}) {
	const {
		theme,
		hero,
		compactDetails,
		journey,
		expandedDetails,
		paymentRows,
		paymentSummary,
		triageRows,
		triageSummary,
		preparation,
		primaryAction,
		actions,
		canCancel,
	} = model;

	const [paymentExpanded, setPaymentExpanded] = useState(false);
	const [triageExpanded, setTriageExpanded] = useState(false);
	const [detailsExpanded, setDetailsExpanded] = useState(false);

	useEffect(() => {
		setPaymentExpanded(false);
		setTriageExpanded(false);
		setDetailsExpanded(false);
	}, [model?.recordKey]);

	if (!theme || !hero) {
		return (
			<VisitDetailSkeleton
				theme={
					theme || {
						groupSurface: "rgba(255,255,255,0.08)",
						heroSurface: "rgba(15,23,42,0.72)",
						skeletonBaseColor: "rgba(255,255,255,0.08)",
						skeletonSoftColor: "rgba(255,255,255,0.05)",
						hairlineDivider: "rgba(148,163,184,0.18)",
					}
				}
			/>
		);
	}

	return (
		<View style={bodyStyles.scrollContent}>
			<PassportHero hero={hero} theme={theme} />

			{primaryAction?.onPress ? (
				<Pressable
					onPress={primaryAction.onPress}
					style={({ pressed }) => [
						bodyStyles.primaryButton,
						{
							backgroundColor: theme.tone.chip,
							opacity: pressed ? 0.86 : 1,
						},
					]}
					accessibilityRole="button"
					accessibilityLabel={primaryAction.label}
				>
					<Text
						style={[
							bodyStyles.primaryButtonText,
							{ color: theme.tone.chipText },
						]}
					>
						{primaryAction.label}
					</Text>
				</Pressable>
			) : null}

			{compactDetails.length > 0 ? (
				<SectionCard
					surfaceColor={theme.groupSurface}
					chevronColor={theme.mutedColor}
				>
					<DetailRows rows={compactDetails} theme={theme} />
				</SectionCard>
			) : null}

			{isExpanded ? (
				<>
					<JourneyCard journey={journey} theme={theme} />

					{expandedDetails.length > 0 ? (
						<SectionCard
							title={HISTORY_DETAILS_COPY.sectionTitles.moreDetails}
							titleColor={theme.groupTitleColor}
							surfaceColor={theme.groupSurface}
							collapsible
							expanded={detailsExpanded}
							onToggle={() => setDetailsExpanded((value) => !value)}
							chevronColor={theme.mutedColor}
						>
							<DetailRows rows={expandedDetails} theme={theme} />
						</SectionCard>
					) : null}

					{paymentRows.length > 0 ? (
						<SectionCard
							title={HISTORY_DETAILS_COPY.sectionTitles.payment}
							titleColor={theme.groupTitleColor}
							surfaceColor={theme.groupSurface}
							summary={paymentSummary}
							collapsible
							expanded={paymentExpanded}
							onToggle={() => setPaymentExpanded((value) => !value)}
							chevronColor={theme.mutedColor}
						>
							<DetailRows rows={paymentRows} theme={theme} />
						</SectionCard>
					) : null}

					{triageRows.length > 0 ? (
						<SectionCard
							title={HISTORY_DETAILS_COPY.sectionTitles.triage}
							titleColor={theme.groupTitleColor}
							surfaceColor={theme.groupSurface}
							summary={triageSummary}
							collapsible
							expanded={triageExpanded}
							onToggle={() => setTriageExpanded((value) => !value)}
							chevronColor={theme.mutedColor}
						>
							<DetailRows rows={triageRows} theme={theme} />
						</SectionCard>
					) : null}

					{preparation ? (
						<SectionCard
							title={HISTORY_DETAILS_COPY.sectionTitles.preparation}
							titleColor={theme.groupTitleColor}
							surfaceColor={theme.groupSurface}
							chevronColor={theme.mutedColor}
						>
							{preparation.map((item, index) => (
								<View key={`prep-${index}`} style={bodyStyles.preparationRow}>
									<View
										style={[
											bodyStyles.preparationDot,
											{ backgroundColor: theme.tone.icon },
										]}
									/>
									<Text
										style={[bodyStyles.preparationText, { color: theme.bodyColor }]}
									>
										{item}
									</Text>
								</View>
							))}
						</SectionCard>
					) : null}

					{actions.length > 0 ? (
						<SectionCard
							title={HISTORY_DETAILS_COPY.sectionTitles.actions}
							titleColor={theme.groupTitleColor}
							surfaceColor={theme.groupSurface}
							chevronColor={theme.mutedColor}
						>
							{actions.map((action, index) => (
								<React.Fragment key={action.key}>
									<Pressable
										onPress={action.onPress}
										accessibilityRole="button"
										accessibilityLabel={action.label}
										style={({ pressed }) => [
											bodyStyles.actionRow,
											pressed ? { opacity: 0.7 } : null,
										]}
									>
										<Ionicons
											name={action.iconName}
											size={ACTION_ICON_SIZE}
											color={action.iconColor}
										/>
										<Text
											style={[bodyStyles.actionLabel, { color: theme.titleColor }]}
										>
											{action.label}
										</Text>
										<Ionicons
											name="chevron-forward"
											size={16}
											color={theme.chevronColor}
										/>
									</Pressable>
									{index < actions.length - 1 ? (
										<View
											style={[
												bodyStyles.actionHairline,
												{ backgroundColor: theme.hairlineDivider },
											]}
										/>
									) : null}
								</React.Fragment>
							))}
						</SectionCard>
					) : null}
				</>
			) : null}

			{isExpanded && canCancel && typeof onCancelVisit === "function" ? (
				<Pressable
					onPress={onCancelVisit}
					style={({ pressed }) => [
						bodyStyles.cancelButton,
						{
							backgroundColor: theme.destructiveActionSurface,
							opacity: pressed ? 0.85 : 1,
						},
					]}
					accessibilityRole="button"
					accessibilityLabel={HISTORY_DETAILS_COPY.actionLabels.cancel}
				>
					<Text
						style={[
							bodyStyles.cancelButtonText,
							{ color: theme.destructiveActionText },
						]}
					>
						{HISTORY_DETAILS_COPY.actionLabels.cancel}
					</Text>
				</Pressable>
			) : null}
		</View>
	);
}

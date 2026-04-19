import React, { useCallback, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Image,
	ImageBackground,
	Pressable,
	Text,
	View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import EntryActionButton from "../../../entry/EntryActionButton";
import PaymentMethodSelector from "../../../payment/PaymentMethodSelector";
import styles from "./mapCommitPayment.styles";

function MapCommitPaymentOverlaySurface({
	style,
	backgroundColor = null,
	overlayColors = null,
	children,
}) {
	return (
		<View
			style={[
				styles.overlaySurfaceShell,
				style,
				backgroundColor ? { backgroundColor } : null,
			]}
		>
			{overlayColors?.length ? (
				<LinearGradient
					pointerEvents="none"
					colors={overlayColors}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.overlaySurfaceGradient}
				/>
			) : null}
			{children}
		</View>
	);
}

function MapCommitPaymentHeroRow({
	imageSource,
	iconName,
	title,
	subtitle,
	titleColor,
	subtitleColor,
	iconColor,
	mediaSurfaceColor,
	rowSurfaceColor,
	rowOverlayColors,
	rowFadeColors,
}) {
	return (
		<MapCommitPaymentOverlaySurface
			style={styles.heroSummaryRow}
			backgroundColor={rowSurfaceColor}
			overlayColors={rowOverlayColors}
		>
			<View style={[styles.heroSummaryMedia, { backgroundColor: mediaSurfaceColor }]}>
				{imageSource ? (
					<Image
						source={imageSource}
						style={styles.heroSummaryImage}
						resizeMode="cover"
					/>
				) : (
					<Ionicons name={iconName} size={18} color={iconColor} />
				)}
			</View>
			<View style={styles.heroSummaryCopyWrap}>
				<View style={styles.heroSummaryCopy}>
				<Text
					numberOfLines={1}
					style={[styles.heroSummaryTitle, { color: titleColor }]}
				>
					{title}
				</Text>
				<Text
					numberOfLines={1}
					style={[styles.heroSummarySubtitle, { color: subtitleColor }]}
				>
					{subtitle}
				</Text>
				</View>
				{rowFadeColors?.length ? (
					<LinearGradient
						pointerEvents="none"
						colors={rowFadeColors}
						start={{ x: 0, y: 0.5 }}
						end={{ x: 1, y: 0.5 }}
						style={styles.heroSummaryFade}
					/>
				) : null}
			</View>
		</MapCommitPaymentOverlaySurface>
	);
}

export function MapCommitPaymentSummaryCard({
	titleColor,
	mutedColor,
	heroSubtitleColor = null,
	headerSubtitleColor = null,
	surfaceColor,
	headerTitle = null,
	headerSubtitle = null,
	selectionRows = [],
	heroImageSource,
	heroImageOpacity = 0.9,
	heroVeilColor = null,
	heroTopMaskColors = null,
	heroBlendColors = null,
	heroBottomMergeColors = null,
	mediaSurfaceColor,
	headerSurfaceColor = null,
	headerOverlayColors = null,
	rowSurfaceColor = null,
	rowOverlayColors = null,
	rowFadeColors = null,
	accentColor,
	totalCostLabel,
	primaryActionTitle,
	primaryActionValueLabel,
	primaryActionHint,
	onPrimaryAction,
	primaryActionInteractive = true,
	primaryActionDisabled = false,
	primaryActionLoading = false,
	primaryActionShowsSkeleton = false,
	primaryActionSurfaceColor,
}) {
	const hasHeroImage = Boolean(heroImageSource);
	const showHeaderCopy = Boolean(headerTitle || headerSubtitle);
	const primaryTextColor = primaryActionDisabled
		? "rgba(255,255,255,0.82)"
		: "#FFFFFF";

	return (
		<View style={[styles.heroCard, { backgroundColor: surfaceColor }]}>
			{hasHeroImage ? (
				<ImageBackground
					source={heroImageSource}
					resizeMode="cover"
					fadeDuration={0}
					style={styles.heroImageFrame}
					imageStyle={[styles.heroImage, { opacity: heroImageOpacity }]}
				>
					{heroVeilColor ? (
						<View
							pointerEvents="none"
							style={[styles.heroVeil, { backgroundColor: heroVeilColor }]}
						/>
					) : null}
					{heroBlendColors ? (
						<LinearGradient
							pointerEvents="none"
							colors={heroBlendColors}
							style={styles.heroBlend}
						/>
					) : null}
					{heroTopMaskColors ? (
						<LinearGradient
							pointerEvents="none"
							colors={heroTopMaskColors}
							style={styles.heroTopMask}
						/>
					) : null}
					{heroBottomMergeColors ? (
						<LinearGradient
							pointerEvents="none"
							colors={heroBottomMergeColors}
							style={styles.heroBottomMerge}
						/>
					) : null}
				</ImageBackground>
			) : null}

			<View style={styles.heroContent}>
				<View
					style={[
						styles.heroTopRow,
						!showHeaderCopy ? styles.heroTopRowTrailing : null,
					]}
				>
					{showHeaderCopy ? (
						<MapCommitPaymentOverlaySurface
							style={styles.heroHeaderCopy}
							backgroundColor={headerSurfaceColor}
							overlayColors={headerOverlayColors}
						>
							<Text
								numberOfLines={1}
								style={[styles.heroHeaderTitle, { color: titleColor }]}
							>
								{headerTitle}
							</Text>
							<Text
								numberOfLines={1}
								style={[
									styles.heroHeaderSubtitle,
									{ color: headerSubtitleColor || mutedColor },
								]}
							>
								{headerSubtitle}
							</Text>
						</MapCommitPaymentOverlaySurface>
					) : null}
					{primaryActionInteractive ? (
						<Pressable
							onPress={onPrimaryAction}
							disabled={primaryActionDisabled || primaryActionLoading}
							accessibilityRole="button"
							accessibilityLabel={primaryActionTitle}
							style={({ pressed }) => [
								styles.heroPrimaryActionPressable,
								pressed && !primaryActionDisabled && !primaryActionLoading
									? styles.heroPrimaryActionPressed
									: null,
							]}
						>
							<View
								style={[
									styles.heroPrimaryAction,
									{
										backgroundColor:
											primaryActionSurfaceColor || accentColor,
									},
									primaryActionDisabled
										? styles.heroPrimaryActionDisabled
										: null,
								]}
							>
								<Text
									numberOfLines={1}
									style={[
										styles.heroPrimaryActionLabel,
										{ color: primaryTextColor },
									]}
								>
									{primaryActionTitle}
								</Text>
								<View style={styles.heroPrimaryActionValueRow}>
									{primaryActionLoading && !primaryActionShowsSkeleton ? (
										<ActivityIndicator
											size="small"
											color={primaryTextColor}
										/>
									) : null}
									{primaryActionShowsSkeleton ? (
										<View style={styles.heroPrimaryActionSkeletonWrap}>
											<View style={styles.heroPrimaryActionSkeleton} />
										</View>
									) : (
										<Text
											numberOfLines={1}
											style={[
												styles.heroPrimaryActionValue,
												{ color: primaryTextColor },
											]}
										>
											{primaryActionValueLabel}
										</Text>
									)}
								</View>
								{primaryActionHint && !primaryActionShowsSkeleton ? (
									<Text
										numberOfLines={1}
										style={[
											styles.heroPrimaryActionHint,
											{ color: "rgba(255,255,255,0.82)" },
										]}
									>
										{primaryActionHint}
									</Text>
								) : null}
							</View>
						</Pressable>
					) : (
						<View
							style={[
								styles.heroPrimaryAction,
								{
									backgroundColor:
										primaryActionSurfaceColor || accentColor,
								},
								primaryActionDisabled
									? styles.heroPrimaryActionDisabled
									: null,
							]}
						>
							<Text
								numberOfLines={1}
								style={[
									styles.heroPrimaryActionLabel,
									{ color: primaryTextColor },
								]}
							>
								{primaryActionTitle}
							</Text>
							<View style={styles.heroPrimaryActionValueRow}>
								{primaryActionShowsSkeleton ? (
									<View style={styles.heroPrimaryActionSkeletonWrap}>
										<View style={styles.heroPrimaryActionSkeleton} />
									</View>
								) : (
									<Text
										numberOfLines={1}
										style={[
											styles.heroPrimaryActionValue,
											{ color: primaryTextColor },
										]}
									>
										{primaryActionValueLabel}
									</Text>
								)}
							</View>
							{primaryActionHint && !primaryActionShowsSkeleton ? (
								<Text
									numberOfLines={1}
									style={[
										styles.heroPrimaryActionHint,
										{ color: "rgba(255,255,255,0.82)" },
									]}
								>
									{primaryActionHint}
								</Text>
							) : null}
						</View>
					)}
				</View>

				<View style={styles.heroSummaryList}>
					{selectionRows.map((row) => (
						<MapCommitPaymentHeroRow
							key={`${row.title}-${row.subtitle}-${row.iconName || "row"}`}
							imageSource={row.imageSource}
							iconName={row.iconName}
							title={row.title}
							subtitle={row.subtitle}
							titleColor={titleColor}
							subtitleColor={heroSubtitleColor || mutedColor}
							iconColor={row.iconColor}
							mediaSurfaceColor={mediaSurfaceColor}
							rowSurfaceColor={rowSurfaceColor}
							rowOverlayColors={rowOverlayColors}
							rowFadeColors={rowFadeColors}
						/>
					))}
				</View>
			</View>
		</View>
	);
}

function formatPaymentMethodSummary(method) {
	if (!method) return "Choose a method";

	if (method.is_cash) {
		return "Cash · Provider confirmation";
	}

	if (method.is_wallet) {
		return `${method.brand || "iVisit Balance"} · Balance`;
	}

	const brand = method.brand || "Card";
	const last4 = method.last4 ? ` ending in ${method.last4}` : "";
	return `${brand}${last4}`;
}

export function MapCommitPaymentSelectorCard({
	titleColor,
	mutedColor,
	surfaceColor,
	accentColor,
	rowSurfaceColor,
	changePillSurfaceColor,
	title,
	description,
	selectedMethod,
	onMethodSelect,
	cost,
	hospitalId,
	organizationId,
	simulatePayments,
	demoCashOnly,
}) {
	const [isExpanded, setIsExpanded] = useState(false);
	const paymentSummary = useMemo(
		() => formatPaymentMethodSummary(selectedMethod),
		[selectedMethod],
	);
	const shouldShowSelector = isExpanded || !selectedMethod;
	const handleExpand = useCallback(() => {
		setIsExpanded(true);
	}, []);
	const handleSelectMethod = useCallback(
		(method) => {
			onMethodSelect?.(method);
			setIsExpanded(false);
		},
		[onMethodSelect],
	);

	return (
		<View style={[styles.selectorCard, { backgroundColor: surfaceColor }]}>
			<View style={styles.selectorHeader}>
				<Text style={[styles.selectorTitle, { color: titleColor }]}>{title}</Text>
				{description ? (
					<Text style={[styles.selectorDescription, { color: mutedColor }]}>
						{description}
					</Text>
				) : null}
			</View>
			{shouldShowSelector ? (
				<View style={styles.selectorBody}>
					<PaymentMethodSelector
						selectedMethod={selectedMethod}
						onMethodSelect={handleSelectMethod}
						cost={cost}
						hospitalId={hospitalId}
						organizationId={organizationId}
						simulatePayments={simulatePayments}
						preferCashFirst={simulatePayments}
						demoCashOnly={demoCashOnly}
					/>
				</View>
			) : (
				<Pressable
					onPress={handleExpand}
					accessibilityRole="button"
					accessibilityLabel="Change payment method"
					style={({ pressed }) => [
						styles.paymentSummaryRow,
						{ backgroundColor: rowSurfaceColor },
						pressed ? styles.paymentSummaryRowPressed : null,
					]}
				>
					<Text
						numberOfLines={1}
						style={[styles.paymentSummaryText, { color: titleColor }]}
					>
						{paymentSummary}
					</Text>
					<View
						style={[
							styles.paymentChangePill,
							{ backgroundColor: changePillSurfaceColor },
						]}
					>
						<Text style={[styles.paymentChangeText, { color: accentColor }]}>
							Change
						</Text>
					</View>
				</Pressable>
			)}
		</View>
	);
}

export function MapCommitPaymentBreakdownCard({
	titleColor,
	surfaceColor,
	dividerColor,
	title,
	breakdown = [],
	totalCostLabel,
}) {
	if (!Array.isArray(breakdown) || breakdown.length === 0) return null;

	return (
		<View style={[styles.breakdownCard, { backgroundColor: surfaceColor }]}>
			<Text style={[styles.breakdownTitle, { color: titleColor }]}>{title}</Text>
			<View style={styles.breakdownList}>
				{breakdown.map((item) => (
					<View key={`${item.name}-${item.cost}`} style={styles.breakdownRow}>
						<Text style={[styles.breakdownRowLabel, { color: titleColor }]}>
							{item.name}
						</Text>
						<Text style={[styles.breakdownRowValue, { color: titleColor }]}>
							${Number(item.cost || 0).toFixed(2)}
						</Text>
					</View>
				))}
			</View>
			<View style={[styles.breakdownDivider, { backgroundColor: dividerColor }]} />
			<View style={styles.breakdownTotalRow}>
				<Text style={[styles.breakdownTotalLabel, { color: titleColor }]}>Total</Text>
				<Text style={[styles.breakdownTotalValue, { color: titleColor }]}>
					{totalCostLabel}
				</Text>
			</View>
		</View>
	);
}

export function MapCommitPaymentBreakdownSkeletonCard({
	surfaceColor,
	skeletonBaseColor,
	skeletonSoftColor,
}) {
	return (
		<View style={[styles.breakdownCard, { backgroundColor: surfaceColor }]}>
			<View
				style={[
					styles.breakdownSkeletonTitle,
					{ backgroundColor: skeletonBaseColor },
				]}
			/>
			<View style={styles.breakdownList}>
				{[0, 1, 2].map((index) => (
					<View key={`payment-skeleton-row-${index}`} style={styles.breakdownRow}>
						<View
							style={[
								styles.breakdownSkeletonLabel,
								index === 2 ? styles.breakdownSkeletonLabelShort : null,
								{ backgroundColor: index === 1 ? skeletonSoftColor : skeletonBaseColor },
							]}
						/>
						<View
							style={[
								styles.breakdownSkeletonValue,
								{ backgroundColor: index === 1 ? skeletonBaseColor : skeletonSoftColor },
							]}
						/>
					</View>
				))}
			</View>
			<View style={[styles.breakdownDivider, { backgroundColor: skeletonSoftColor }]} />
			<View style={styles.breakdownTotalRow}>
				<View
					style={[
						styles.breakdownSkeletonTotalLabel,
						{ backgroundColor: skeletonBaseColor },
					]}
				/>
				<View
					style={[
						styles.breakdownSkeletonTotalValue,
						{ backgroundColor: skeletonSoftColor },
					]}
				/>
			</View>
		</View>
	);
}

export function MapCommitPaymentStatusCard({
	titleColor,
	mutedColor,
	surfaceColor,
	accentColor,
	statusTitle,
	statusDescription,
	requestMeta,
	statusKind = "dispatched",
	primaryActionLabel = null,
	onPrimaryAction,
	secondaryActionLabel = null,
	onSecondaryAction,
}) {
	const iconName =
		statusKind === "waiting_approval"
			? "time-outline"
			: statusKind === "processing_payment"
				? "card-outline"
				: statusKind === "finalizing_dispatch"
					? "sync-outline"
					: statusKind === "failed" || statusKind === "payment_declined"
						? "alert-circle-outline"
						: "checkmark-done-circle-outline";

	return (
		<View style={[styles.statusCard, { backgroundColor: surfaceColor }]}>
			<View style={[styles.statusIconWrap, { backgroundColor: `${accentColor}20` }]}>
				<Ionicons name={iconName} size={30} color={accentColor} />
			</View>
			<Text style={[styles.statusTitle, { color: titleColor }]}>{statusTitle}</Text>
			<Text style={[styles.statusDescription, { color: mutedColor }]}>
				{statusDescription}
			</Text>
			{requestMeta ? (
				<Text style={[styles.statusMeta, { color: titleColor }]}>{requestMeta}</Text>
			) : null}
			{primaryActionLabel ? (
				<View style={styles.statusActionRow}>
					<EntryActionButton
						label={primaryActionLabel}
						onPress={onPrimaryAction}
						height={48}
						radius={22}
						accessibilityLabel={primaryActionLabel}
						style={styles.statusPrimaryAction}
					/>
					{secondaryActionLabel ? (
						<Pressable
							onPress={onSecondaryAction}
							style={({ pressed }) => [
								styles.statusSecondaryAction,
								pressed ? styles.statusSecondaryActionPressed : null,
							]}
						>
							<Text
								style={[styles.statusSecondaryActionText, { color: titleColor }]}
							>
								{secondaryActionLabel}
							</Text>
						</Pressable>
					) : null}
				</View>
			) : null}
		</View>
	);
}

export function MapCommitPaymentFooter({
	label,
	onPress,
	loading = false,
	disabled = false,
	stageMetrics,
	modalContainedStyle,
	contentInsetStyle,
}) {
	return (
		<View
			style={[
				stageMetrics?.footer?.dockStyle,
				styles.footerDock,
				contentInsetStyle,
				modalContainedStyle,
			]}
		>
			<EntryActionButton
				label={label}
				onPress={onPress}
				loading={loading}
				disabled={disabled}
				height={stageMetrics?.footer?.buttonHeight || 52}
				radius={stageMetrics?.footer?.buttonRadius || 26}
				accessibilityLabel={label}
				style={styles.primaryButton}
			/>
		</View>
	);
}

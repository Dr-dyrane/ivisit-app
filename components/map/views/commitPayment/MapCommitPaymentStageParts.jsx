import React from "react";
import { Image, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EntryActionButton from "../../../entry/EntryActionButton";
import PaymentMethodSelector from "../../../payment/PaymentMethodSelector";
import styles from "./mapCommitPayment.styles";

function MapCommitPaymentPassRow({
	imageSource,
	iconName,
	title,
	subtitle,
	titleColor,
	mutedColor,
	iconColor,
	rowSurfaceColor,
	mediaSurfaceColor,
}) {
	return (
		<View style={[styles.passRow, { backgroundColor: rowSurfaceColor }]}>
			<View style={[styles.passRowMedia, { backgroundColor: mediaSurfaceColor }]}>
				{imageSource ? (
					<Image source={imageSource} style={styles.passRowImage} resizeMode="cover" />
				) : (
					<Ionicons name={iconName} size={22} color={iconColor} />
				)}
			</View>
			<View style={styles.passRowCopy}>
				<Text numberOfLines={1} style={[styles.passRowTitle, { color: titleColor }]}>
					{title}
				</Text>
				<Text numberOfLines={1} style={[styles.passRowSubtitle, { color: mutedColor }]}>
					{subtitle}
				</Text>
			</View>
		</View>
	);
}

export function MapCommitPaymentSummaryCard({
	titleColor,
	mutedColor,
	surfaceColor,
	accentColor,
	hospitalName,
	hospitalSubtitle,
	hospitalImageSource,
	transportTitle,
	transportSubtitle,
	transportImageSource,
	pickupLabel,
	totalCostLabel,
	rowSurfaceColor,
	mediaSurfaceColor,
	highlightColor,
	shadeColor,
}) {
	return (
		<View style={[styles.heroCard, { backgroundColor: surfaceColor }]}>
			<View
				pointerEvents="none"
				style={[styles.heroCardTopHighlight, { backgroundColor: highlightColor }]}
			/>
			<View
				pointerEvents="none"
				style={[styles.heroCardBottomShade, { backgroundColor: shadeColor }]}
			/>
			<View style={styles.passHeader}>
				<View style={styles.passHeaderCopy}>
					<Text numberOfLines={1} style={[styles.passHeaderTitle, { color: titleColor }]}>
						{hospitalName}
					</Text>
					<Text numberOfLines={1} style={[styles.passHeaderSubtitle, { color: mutedColor }]}>
						{transportTitle}
					</Text>
				</View>
				{totalCostLabel ? (
					<View style={styles.passTotalPill}>
						<Text style={[styles.priceLabel, { color: mutedColor }]}>Total</Text>
						<Text style={[styles.priceValue, { color: titleColor }]}>
							{totalCostLabel}
						</Text>
					</View>
				) : null}
			</View>
			<View style={styles.passRowStack}>
				<MapCommitPaymentPassRow
					imageSource={hospitalImageSource}
					iconName="business"
					title={hospitalName}
					subtitle={hospitalSubtitle || "Hospital"}
					titleColor={titleColor}
					mutedColor={mutedColor}
					iconColor={accentColor}
					rowSurfaceColor={rowSurfaceColor}
					mediaSurfaceColor={mediaSurfaceColor}
				/>
				<MapCommitPaymentPassRow
					imageSource={transportImageSource}
					iconName="car-sport"
					title={transportTitle}
					subtitle={transportSubtitle || "Transport"}
					titleColor={titleColor}
					mutedColor={mutedColor}
					iconColor={accentColor}
					rowSurfaceColor={rowSurfaceColor}
					mediaSurfaceColor={mediaSurfaceColor}
				/>
				<MapCommitPaymentPassRow
					iconName="location"
					title="Pickup"
					subtitle={pickupLabel}
					titleColor={titleColor}
					mutedColor={mutedColor}
					iconColor={accentColor}
					rowSurfaceColor={rowSurfaceColor}
					mediaSurfaceColor={mediaSurfaceColor}
				/>
			</View>
		</View>
	);
}

export function MapCommitPaymentSelectorCard({
	titleColor,
	mutedColor,
	surfaceColor,
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
			<View style={styles.selectorBody}>
				<PaymentMethodSelector
					selectedMethod={selectedMethod}
					onMethodSelect={onMethodSelect}
					cost={cost}
					hospitalId={hospitalId}
					organizationId={organizationId}
					simulatePayments={simulatePayments}
					preferCashFirst={simulatePayments}
					demoCashOnly={demoCashOnly}
				/>
			</View>
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
			<View style={{ marginTop: 10 }}>
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

export function MapCommitPaymentStatusCard({
	titleColor,
	mutedColor,
	surfaceColor,
	accentColor,
	statusTitle,
	statusDescription,
	requestMeta,
	statusKind = "dispatched",
}) {
	const iconName =
		statusKind === "waiting_approval"
			? "time-outline"
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

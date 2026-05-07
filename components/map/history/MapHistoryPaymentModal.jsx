import React, { useMemo } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapModalShell from "../surfaces/MapModalShell";
import { useTheme } from "../../../contexts/ThemeContext";
import useResponsiveSurfaceMetrics from "../../../hooks/ui/useResponsiveSurfaceMetrics";
import buildHistoryThemeTokens from "./history.theme";
import { styles } from "./mapHistoryPaymentModal.styles";
import { formatMoney } from "../../../utils/formatMoney";

const formatAmount = (value, currency = "USD") => {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return formatMoney(0, { currency });
	return formatMoney(Math.abs(numeric), { currency });
};

const formatTimestamp = (value) => {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date.toLocaleString();
};

const resolveStatusTone = (status, isDarkMode) => {
	const normalized = String(status || "").toLowerCase();
	if (normalized === "completed" || normalized === "paid") {
		return {
			color: isDarkMode ? "#86EFAC" : "#166534",
			surface: isDarkMode ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.10)",
		};
	}
	if (normalized === "pending") {
		return {
			color: isDarkMode ? "#FCD34D" : "#92400E",
			surface: isDarkMode ? "rgba(245,158,11,0.16)" : "rgba(245,158,11,0.10)",
		};
	}
	return {
		color: isDarkMode ? "#FDA4AF" : "#9F1239",
		surface: isDarkMode ? "rgba(244,63,94,0.16)" : "rgba(244,63,94,0.10)",
	};
};

function SkeletonBlock({ style, color }) {
	return <View style={[styles.skeletonBlock, { backgroundColor: color }, style]} />;
}

function PaymentModalSkeleton({ theme }) {
	return (
		<View style={[styles.card, { backgroundColor: theme.groupSurface }]}>
			<View style={styles.skeletonHeader}>
				<SkeletonBlock style={styles.skeletonOrb} color={theme.skeletonSoftColor} />
				<SkeletonBlock style={styles.skeletonAmount} color={theme.skeletonBaseColor} />
				<SkeletonBlock style={styles.skeletonStatus} color={theme.skeletonSoftColor} />
			</View>
			<View style={styles.loadingStack}>
				{Array.from({ length: 4 }).map((_, index) => (
					<View key={`payment-modal-skeleton-${index}`} style={styles.skeletonRow}>
						<SkeletonBlock style={styles.skeletonLabel} color={theme.skeletonSoftColor} />
						<SkeletonBlock style={styles.skeletonValue} color={theme.skeletonBaseColor} />
						{index < 3 ? (
							<View style={[styles.hairline, { backgroundColor: theme.hairlineDivider }]} />
						) : null}
					</View>
				))}
			</View>
		</View>
	);
}

export default function MapHistoryPaymentModal({
	visible,
	loading = false,
	paymentRecord = null,
	onClose,
}) {
	const { isDarkMode } = useTheme();
	const viewportMetrics = useResponsiveSurfaceMetrics({
		presentationMode: "modal",
	});
	const theme = useMemo(
		() => buildHistoryThemeTokens({ isDarkMode, surface: "hero" }),
		[isDarkMode],
	);
	const statusTone = useMemo(
		() => resolveStatusTone(paymentRecord?.status, isDarkMode),
		[isDarkMode, paymentRecord?.status],
	);
	const colors = {
		title: isDarkMode ? "#F8FAFC" : "#0F172A",
		body: isDarkMode ? "#CBD5E1" : "#475569",
		muted: isDarkMode ? "#94A3B8" : "#64748B",
	};

	const rows = [
		{ key: "description", label: "Description", value: paymentRecord?.description || null },
		{ key: "time", label: "Date & time", value: formatTimestamp(paymentRecord?.created_at) },
		{
			key: "method",
			label: "Payment method",
			value: paymentRecord?.payment_method || paymentRecord?.metadata?.payment_method || "iVisit Wallet",
		},
		{
			key: "reference",
			label: "Reference",
			value:
				paymentRecord?.emergency_requests?.display_id ||
				paymentRecord?.emergency_request_id ||
				null,
		},
		{ key: "transaction", label: "Transaction ID", value: paymentRecord?.id || null, mono: true },
	].filter((row) => row.value);

	return (
		<MapModalShell
			visible={visible}
			onClose={onClose}
			title="Payment details"
			headerLayout="leading"
			minHeightRatio={0.48}
			maxHeightRatio={0.76}
			contentContainerStyle={styles.content}
		>
			{loading || !paymentRecord ? (
				<PaymentModalSkeleton theme={theme} />
			) : (
				<View style={[styles.card, { backgroundColor: theme.groupSurface }]}>
					<View style={styles.header}>
						<View style={[styles.iconOrb, { backgroundColor: statusTone.surface }]}>
							<Ionicons
								name={paymentRecord?.transaction_type === "credit" ? "arrow-down" : "receipt-outline"}
								size={30}
								color={statusTone.color}
							/>
						</View>
						<Text style={[styles.amount, { color: colors.title }]}>
							{`${paymentRecord?.transaction_type === "credit" ? "+" : "-"}${formatAmount(paymentRecord?.amount, paymentRecord?.currency || "USD")}`}
						</Text>
						<Text style={[styles.status, { color: statusTone.color }]}>
							{String(paymentRecord?.status || "unknown").toUpperCase()}
						</Text>
					</View>

					<View style={styles.body}>
						{rows.map((row, index) => (
							<React.Fragment key={row.key}>
								<View style={styles.row}>
									<Text style={[styles.rowLabel, { color: colors.muted }]}>
										{row.label}
									</Text>
									<Text
										style={[
											styles.rowValue,
											{ color: colors.title },
											row.mono
												? {
													fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
												}
												: null,
											row.mono ? styles.rowValueMono : null,
										]}
									>
										{row.value}
									</Text>
								</View>
								{index < rows.length - 1 ? (
									<View
										style={[
											styles.hairline,
											{ backgroundColor: theme.hairlineDivider },
										]}
									/>
								) : null}
							</React.Fragment>
						))}
					</View>

					<Pressable
						onPress={onClose}
						style={({ pressed }) => [
							styles.doneButton,
							{
								backgroundColor: theme.neutralActionSurface,
								opacity: pressed ? 0.84 : 1,
							},
						]}
					>
						<Text style={[styles.doneButtonText, { color: colors.title }]}>
							Done
						</Text>
					</Pressable>
				</View>
			)}
		</MapModalShell>
	);
}

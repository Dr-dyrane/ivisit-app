import React, { useState, useMemo } from "react";
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	ActivityIndicator,
	Platform,
	ScrollView,
	Modal,
	TextInput,
} from "react-native";
import { useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../constants/colors";
import styles from "./paymentScreenComponents.styles.js";
import { getPaymentGlassTokens, squircle } from "./tokens/paymentGlassTokens";
import { getStackViewportVariant, getStackViewportSurfaceConfig } from "../../utils/ui/stackViewportConfig";

// WalletBalanceCard - Premium balance card with gradient
// PULLBACK NOTE: Extracted from PaymentScreen for reusability
// OLD: Inline balance card in PaymentScreen
// NEW: Reusable WalletBalanceCard component
// REASON: Modularize payment screen UI
export function WalletBalanceCard({ walletBalance, onTopUp, isSaving, isDarkMode }) {
	return (
		<View style={styles.balanceCardWrapper}>
			{Platform.OS === "ios" ? (
				<BlurView intensity={isDarkMode ? 40 : 80} tint={isDarkMode ? "dark" : "light"} style={StyleSheet.absoluteFill} />
			) : (
				<View
					style={[
						StyleSheet.absoluteFill,
						{
							backgroundColor: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLight,
						},
					]}
				/>
			)}
			<LinearGradient
				colors={[COLORS.brandPrimary, "#4f46e5"]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={[styles.balanceCard, { opacity: 0.9 }]}
			>
				<View style={styles.balanceHeader}>
					<View>
						<Text style={styles.walletLabel}>Available Balance</Text>
						<Text style={styles.balanceValue}>
							${walletBalance.balance.toFixed(2)}
						</Text>
					</View>
					<View style={styles.currencyBadge}>
						<Text style={styles.currencyText}>{walletBalance.currency}</Text>
					</View>
				</View>

				<View style={styles.walletActions}>
					<Pressable
						onPress={onTopUp}
						disabled={isSaving}
						style={({ pressed }) => [
							styles.topUpButton,
							{ opacity: (pressed || isSaving) ? 0.8 : 1 }
						]}
					>
						<Ionicons name="add-circle" size={20} color={COLORS.brandPrimary} />
						<Text style={styles.topUpText}>Add Funds</Text>
					</Pressable>
				</View>
			</LinearGradient>
		</View>
	);
}

// PaymentSummarySection - Payment breakdown summary
// PULLBACK NOTE: Extracted from PaymentScreen for reusability
// OLD: Inline summary in PaymentScreen
// NEW: Reusable PaymentSummarySection component
// REASON: Modularize payment screen UI
export function PaymentSummarySection({ cost, isDarkMode }) {
	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		card: isDarkMode ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.8)",
	};

	return (
		<View style={[styles.section, { backgroundColor: colors.card }]}>
			<Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Summary</Text>
			{cost.breakdown.map((item, idx) => (
				<View key={idx} style={styles.row}>
					<View style={styles.itemInfo}>
						<Text style={[styles.rowLabel, { color: colors.text }]}>{item.name}</Text>
						{item.type === "fee" && (
							<Text style={styles.subLabel}>Processing & Platform Fee</Text>
						)}
					</View>
					<Text style={[styles.rowValue, { color: colors.text }]}>
						${item.cost.toFixed(2)}
					</Text>
				</View>
			))}
			<View style={[styles.divider, { backgroundColor: colors.border }]} />
			<View style={styles.totalRow}>
				<Text style={[styles.totalLabel, { color: colors.text }]}>Total to Pay</Text>
				<Text style={[styles.totalValue, { color: COLORS.brandPrimary }]}>${cost.totalCost.toFixed(2)}</Text>
			</View>
		</View>
	);
}

// ServiceReceiptCard - Merged service cost summary for the checkout left island
// Combines PaymentIdentitySection + PaymentSummarySection into one compact surface.
// Designed specifically for the MD+ sidebar island where vertical space is shared.
export function ServiceReceiptCard({ cost, insuranceApplied, isDarkMode }) {
	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		separator: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
	};

	return (
		<View style={{ gap: 0 }}>
			{/* Amount hero */}
			<View style={{ alignItems: 'center', paddingVertical: 20, gap: 6 }}>
				<Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: colors.textMuted }}>
					Total Due
				</Text>
				<Text style={{ fontSize: 40, fontWeight: '800', letterSpacing: -2, color: colors.text }}>
					${cost.totalCost.toFixed(2)}
				</Text>
				{insuranceApplied && (
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(134,16,14,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderCurve: 'continuous' }}>
						<Ionicons name="shield-checkmark" size={12} color={COLORS.brandPrimary} />
						<Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.brandPrimary }}>Insurance Applied</Text>
					</View>
				)}
			</View>

			{/* Separator */}
			<View style={{ height: 1, backgroundColor: colors.separator, marginHorizontal: 4 }} />

			{/* Breakdown rows */}
			<View style={{ paddingTop: 16, paddingBottom: 8, gap: 10 }}>
				{cost.breakdown.map((item, idx) => (
					<View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
						<View style={{ flex: 1 }}>
							<Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{item.name}</Text>
							{item.type === 'fee' && (
								<Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>Processing fee</Text>
							)}
						</View>
						<Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>${item.cost.toFixed(2)}</Text>
					</View>
				))}
			</View>

			{/* Assurance footer */}
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 12, paddingBottom: 4 }}>
				<Ionicons name="lock-closed" size={10} color={colors.textMuted} />
				<Text style={{ fontSize: 10, fontWeight: '500', color: colors.textMuted }}>PCI-DSS · Secure & Encrypted</Text>
			</View>
		</View>
	);
}

// PaymentHistoryList - Transaction history ledger (shows last 3)
// PULLBACK NOTE: Extracted from PaymentScreen for reusability
// OLD: Inline history in PaymentScreen showing all transactions
// NEW: Reusable PaymentHistoryList component showing last 3 with See More
// REASON: Modularize payment screen UI and improve UX
export function PaymentHistoryList({ paymentHistory, onTransactionPress, refreshing, onRefresh, onSeeMore, isDarkMode, loading }) {
	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.8)",
		skeleton: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
	};

	// Show only last 3 transactions
	const displayHistory = paymentHistory.slice(0, 3);
	const hasMore = paymentHistory.length > 3;

	// Skeleton loader component
	const SkeletonItem = ({ showDivider }) => (
		<View style={[styles.ledgerItem, showDivider && styles.ledgerDivider]}>
			<View style={[styles.typeIcon, { backgroundColor: colors.skeleton }]} />
			<View style={styles.ledgerMeta}>
				<View style={[styles.skeletonText, { backgroundColor: colors.skeleton, width: "60%" }]} />
				<View style={[styles.skeletonText, { backgroundColor: colors.skeleton, width: "40%", marginTop: 4 }]} />
			</View>
			<View style={[styles.skeletonText, { backgroundColor: colors.skeleton, width: "50%" }]} />
		</View>
	);

	return (
		<View style={styles.activityContainer}>
			<View style={styles.activityHeader}>
				<Text style={[styles.sectionTitle, { color: colors.text }]}>Payment History</Text>
				<Pressable onPress={onRefresh}>
					{refreshing ? (
						<ActivityIndicator size="small" color={COLORS.brandPrimary} />
					) : (
						<Ionicons name="refresh" size={20} color={COLORS.brandPrimary} />
					)}
				</Pressable>
			</View>

			{loading ? (
				<View style={[styles.ledgerList, { backgroundColor: colors.card }]}>
					<SkeletonItem showDivider={true} />
					<SkeletonItem showDivider={true} />
					<SkeletonItem showDivider={false} />
					<Pressable
						style={({ pressed }) => [
							styles.seeMoreButton,
							{ opacity: pressed ? 0.7 : 1 }
						]}
					>
						<Text style={[styles.seeMoreText, { color: COLORS.brandPrimary }]}>
							See All
						</Text>
						<Ionicons name="chevron-forward" size={16} color={COLORS.brandPrimary} />
					</Pressable>
				</View>
			) : displayHistory.length > 0 ? (
				<View style={[styles.ledgerList, { backgroundColor: colors.card }]}>
					{displayHistory.map((item, index) => (
						<Pressable
							key={item.id}
							onPress={() => onTransactionPress(item)}
							style={({ pressed }) => [
								styles.ledgerItem,
								index !== displayHistory.length - 1 && styles.ledgerDivider,
								{ opacity: pressed ? 0.7 : 1 }
							]}
						>
							<View style={[
								styles.typeIcon,
								{ backgroundColor: item.status === "completed" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)" }
							]}>
								<Ionicons
									name={item.status === "completed" ? "checkmark-circle" : (item.status === "pending" ? "time" : "close-circle")}
									size={16}
									color={item.status === "completed" ? "#22C55E" : (item.status === "pending" ? "#F59E0B" : "#EF4444")}
								/>
							</View>
							<View style={styles.ledgerMeta}>
								<Text style={[styles.ledgerDesc, { color: colors.text }]}>
									{item.emergency_requests?.service_type === "ambulance" ? "Ambulance Service" :
										item.emergency_requests?.service_type === "bed" ? "Hospital Bed Booking" :
											item.metadata?.source === "top_up" ? "Wallet Top-up" : "Service Payment"}
								</Text>
								<Text style={[styles.ledgerDate, { color: colors.textMuted }]}>
									{new Date(item.created_at).toLocaleDateString()}
								</Text>
							</View>
							<Text style={[
								styles.ledgerAmount,
								{ color: item.status === "completed" ? colors.text : colors.textMuted }
							]}>
								${parseFloat(item.amount).toFixed(2)}
							</Text>
						</Pressable>
					))}

					{hasMore && (
						<Pressable
							onPress={onSeeMore}
							style={({ pressed }) => [
								styles.seeMoreButton,
								{ opacity: pressed ? 0.7 : 1 }
							]}
						>
							<Text style={[styles.seeMoreText, { color: COLORS.brandPrimary }]}>
								See All ({paymentHistory.length})
							</Text>
							<Ionicons name="chevron-forward" size={16} color={COLORS.brandPrimary} />
						</Pressable>
					)}
				</View>
			) : (
				<View style={[styles.emptyLedger, { backgroundColor: colors.card }]}>
					<View style={{ width: 56, height: 56, borderRadius: 28, borderCurve: 'continuous', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center' }}>
						<Ionicons name="receipt-outline" size={26} color={colors.textMuted} />
					</View>
					<Text style={[styles.emptyText, { color: colors.text, fontWeight: '600', fontSize: 15 }]}>No payments yet</Text>
					<Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4, lineHeight: 18, maxWidth: 200 }}>
						Your payments will appear here after your first visit.
					</Text>
				</View>
			)}
		</View>
	);
}

// PaymentHistoryModal - Detailed payment history modal with time grouping and filtering
// PULLBACK NOTE: New component for full payment history view
// OLD: No detailed history modal existed
// NEW: PaymentHistoryModal with time grouping and status filtering
// REASON: Provide comprehensive payment history with better UX
// PULLBACK NOTE: Accept children slot for nested modals (e.g. detail modal)
// OLD: No children support — nested modals rendered as siblings in orchestrator failed to stack on iOS/Android
// NEW: Nested modals render inside this Modal's tree so native presentation stacks correctly
// REASON: RN Modal siblings do not reliably z-order across platforms; nesting is the canonical fix
export function PaymentHistoryModal({ visible, paymentHistory, onTransactionPress, onClose, isDarkMode, children }) {
	const [statusFilter, setStatusFilter] = useState("all"); // all, completed, pending, failed
	const { width } = useWindowDimensions();

	// Viewport config — resolve variant and surface config for modal sizing
	const viewportVariant = useMemo(
		() => getStackViewportVariant({ platform: Platform.OS, width }),
		[width],
	);
	const surfaceConfig = useMemo(
		() => getStackViewportSurfaceConfig(viewportVariant),
		[viewportVariant],
	);

	const isCenteredModal = surfaceConfig.modalPresentationMode === "centered-modal";

	const ModalOverlayContainer = Platform.OS === "ios" ? BlurView : View;
	const modalOverlayProps = Platform.OS === "ios"
		? { intensity: isDarkMode ? 60 : 80, tint: isDarkMode ? "dark" : "light" }
		: {};
	const modalOverlayStyle = [
		styles.modalOverlay,
		isCenteredModal && { justifyContent: "center", alignItems: "center", padding: 24 },
		Platform.OS === "android" && {
			backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.86)" : "rgba(255, 255, 255, 0.84)",
		},
	];

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.8)",
	};

	// Filter transactions by status
	const filteredHistory = statusFilter === "all"
		? paymentHistory
		: paymentHistory.filter(item => item.status === statusFilter);

	// Group transactions by time period
	const groupTransactionsByTime = (transactions) => {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		const thisWeek = new Date(today);
		thisWeek.setDate(thisWeek.getDate() - 7);
		const thisMonth = new Date(today);
		thisMonth.setDate(thisMonth.getDate() - 30);

		const groups = {
			today: [],
			yesterday: [],
			thisWeek: [],
			thisMonth: [],
			older: [],
		};

		transactions.forEach(item => {
			const date = new Date(item.created_at);
			if (date >= today) {
				groups.today.push(item);
			} else if (date >= yesterday) {
				groups.yesterday.push(item);
			} else if (date >= thisWeek) {
				groups.thisWeek.push(item);
			} else if (date >= thisMonth) {
				groups.thisMonth.push(item);
			} else {
				groups.older.push(item);
			}
		});

		return groups;
	};

	const groupedTransactions = groupTransactionsByTime(filteredHistory);

	const filters = [
		{ key: "all", label: "All", icon: "list" },
		{ key: "completed", label: "Completed", icon: "checkmark-circle" },
		{ key: "pending", label: "Pending", icon: "time" },
		{ key: "failed", label: "Failed", icon: "close-circle" },
	];

	const renderTransactionGroup = (title, transactions) => {
		if (transactions.length === 0) return null;

		return (
			<View key={title} style={styles.historyGroup}>
				<Text style={[styles.groupTitle, { color: colors.textMuted }]}>{title}</Text>
				{transactions.map((item, index) => (
					<Pressable
						key={item.id}
						onPress={() => onTransactionPress(item)}
						style={({ pressed }) => [
							styles.historyItem,
							index !== transactions.length - 1 && styles.historyDivider,
							{ opacity: pressed ? 0.7 : 1 }
						]}
					>
						<View style={[
							styles.typeIcon,
							{ backgroundColor: item.status === "completed" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)" }
						]}>
							<Ionicons
								name={item.status === "completed" ? "checkmark-circle" : (item.status === "pending" ? "time" : "close-circle")}
								size={16}
								color={item.status === "completed" ? "#22C55E" : (item.status === "pending" ? "#F59E0B" : "#EF4444")}
							/>
						</View>
						<View style={styles.ledgerMeta}>
							<Text style={[styles.ledgerDesc, { color: colors.text }]}>
								{item.emergency_requests?.service_type === "ambulance" ? "Ambulance Service" :
									item.emergency_requests?.service_type === "bed" ? "Hospital Bed Booking" :
										item.metadata?.source === "top_up" ? "Wallet Top-up" : "Service Payment"}
							</Text>
							<Text style={[styles.ledgerDate, { color: colors.textMuted }]}>
								{new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
							</Text>
						</View>
						<Text style={[
							styles.ledgerAmount,
							{ color: item.status === "completed" ? colors.text : colors.textMuted }
						]}>
							${parseFloat(item.amount).toFixed(2)}
						</Text>
					</Pressable>
				))}
			</View>
		);
	};

	return (
		<Modal visible={visible} transparent animationType={isCenteredModal ? "fade" : "slide"} onRequestClose={onClose}>
			<ModalOverlayContainer {...modalOverlayProps} style={modalOverlayStyle}>
				<Pressable style={styles.modalBackdrop} onPress={onClose} />
				<View style={[
					styles.historyModalCard,
					{ backgroundColor: colors.card, maxWidth: surfaceConfig.modalMaxWidth, width: '100%', alignSelf: 'center' },
					isCenteredModal && { height: undefined, maxHeight: '85%' },
				]}>
				<View style={styles.modalGrabber} />

				{/* Header */}
				<View style={styles.historyModalHeader}>
					<Text style={[styles.historyModalTitle, { color: colors.text }]}>Payment History</Text>
					<Pressable onPress={onClose} style={styles.closeButton}>
						<Ionicons name="close" size={24} color={colors.textMuted} />
					</Pressable>
				</View>

				{/* Status Filters */}
				<View style={styles.filterContainer}>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
						{filters.map((filter) => (
							<Pressable
								key={filter.key}
								onPress={() => setStatusFilter(filter.key)}
								style={({ pressed }) => [
									styles.filterChip,
									statusFilter === filter.key ? styles.filterChipActive : { backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#F1F5F9" },
									{ opacity: pressed ? 0.8 : 1 }
								]}
							>
								<Ionicons
									name={filter.icon}
									size={16}
									color={statusFilter === filter.key ? COLORS.brandPrimary : colors.textMuted}
								/>
								<Text style={[
									styles.filterText,
									statusFilter === filter.key ? { color: COLORS.brandPrimary } : { color: colors.textMuted }
								]}>
									{filter.label}
								</Text>
								{statusFilter === filter.key && (
									<View style={styles.filterBadge}>
										<Text style={styles.filterBadgeText}>{filteredHistory.length}</Text>
									</View>
								)}
							</Pressable>
						))}
					</ScrollView>
				</View>

				{/* Transaction List */}
				<ScrollView style={styles.historyScroll} showsVerticalScrollIndicator={false}>
					{filteredHistory.length === 0 ? (
						<View style={styles.historyEmptyState}>
							<Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
							<Text style={[styles.historyEmptyText, { color: colors.textMuted }]}>No transactions found</Text>
						</View>
					) : (
						<>
							{renderTransactionGroup("Today", groupedTransactions.today)}
							{renderTransactionGroup("Yesterday", groupedTransactions.yesterday)}
							{renderTransactionGroup("This week", groupedTransactions.thisWeek)}
							{renderTransactionGroup("This month", groupedTransactions.thisMonth)}
							{renderTransactionGroup("Older", groupedTransactions.older)}
						</>
					)}
					<View style={{ height: 20 }} />
				</ScrollView>
			</View>
			{/* Nested modal slot — renders inside this Modal's tree so it stacks above */}
			{children}
		</ModalOverlayContainer>
		</Modal>
	);
}

// PaymentIdentitySection - Payment amount display with insurance badge
// PULLBACK NOTE: Extracted from PaymentScreen for reusability
// OLD: Inline payment identity section in PaymentScreen
// NEW: Reusable PaymentIdentitySection component
// REASON: Modularize payment screen UI
export function PaymentIdentitySection({ cost, insuranceApplied, isDarkMode }) {
	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.8)",
	};

	return (
		<View style={[styles.glowCard, { backgroundColor: colors.card }]}>
			<View style={styles.amountDisplay}>
				<Text style={[styles.amountLabel, { color: colors.textMuted }]}>Total Amount</Text>
				<Text style={[styles.amountValue, { color: colors.text }]}>${cost.totalCost.toFixed(2)}</Text>
			</View>

			{insuranceApplied && (
				<View style={styles.insuranceBadge}>
					<Ionicons name="shield-checkmark" size={16} color={COLORS.brandPrimary} />
					<Text style={styles.insuranceBadgeText}>Insurance Covered</Text>
				</View>
			)}

			<View style={styles.serviceAssurance}>
				<Ionicons name="checkmark-circle" size={12} color={colors.textMuted} />
				<Text style={[styles.serviceText, { color: colors.textMuted }]}>
					Secure Payment & Quality Guarantee
				</Text>
			</View>
		</View>
	);
}

// AddFundsModal - Simple modal for wallet top-up
// PULLBACK NOTE: Refactor to 4-layer glass stack following MapSheetShell pattern
// OLD: Single-layer BlurView wrapper + flat card background
// NEW: Overlay uses tokens; card uses host/underlay/blur/backdrop/overlay layers
// REASON: Match map sheets liquid glass fidelity and platform inclusiveness
export function AddFundsModal({ visible, onClose, onAmountSelect, isDarkMode, isSaving }) {
	const [amount, setAmount] = useState("");
	const tokens = getPaymentGlassTokens({ isDarkMode });
	const isAndroid = Platform.OS === "android";
	const isIOS = Platform.OS === "ios";
	const { width } = useWindowDimensions();

	// Viewport config — resolve variant and surface config for modal sizing
	const viewportVariant = useMemo(
		() => getStackViewportVariant({ platform: Platform.OS, width }),
		[width],
	);
	const surfaceConfig = useMemo(
		() => getStackViewportSurfaceConfig(viewportVariant),
		[viewportVariant],
	);

	const isCenteredModal = surfaceConfig.modalPresentationMode === "centered-modal";

	const ModalOverlayContainer = isIOS ? BlurView : View;
	const modalOverlayProps = isIOS
		? { intensity: tokens.blurIntensity + 10, tint: tokens.blurTint }
		: {};
	const modalOverlayStyle = [
		styles.modalOverlay,
		isCenteredModal && { justifyContent: "center", alignItems: "center", padding: 24 },
		!isIOS && {
			backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.86)" : "rgba(255, 255, 255, 0.84)",
		},
	];

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		inputBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
	};

	const handleConfirm = () => {
		const num = parseFloat(amount);
		if (num && num > 0) {
			onAmountSelect(num);
			setAmount("");
		}
	};

	const handleClose = () => {
		setAmount("");
		onClose();
	};

	const presetAmounts = [50, 100, 200, 500];

	return (
		<Modal visible={visible} transparent animationType={isCenteredModal ? "fade" : "slide"} onRequestClose={handleClose}>
			<ModalOverlayContainer {...modalOverlayProps} style={modalOverlayStyle}>
				<Pressable style={styles.modalBackdrop} onPress={handleClose} />

				{/* Card host: shadow + squircle + hardware texture for Android */}
				<View
					style={[styles.addFundsCard, squircle(24), tokens.shadowStyle, { overflow: "hidden", maxWidth: surfaceConfig.modalMaxWidth, width: '100%', alignSelf: 'center' }]}
					renderToHardwareTextureAndroid={isAndroid}
					needsOffscreenAlphaCompositing={isAndroid}
				>
					{/* Layer 1: Android underlay */}
					{isAndroid ? (
						<View
							pointerEvents="none"
							style={[StyleSheet.absoluteFillObject, squircle(24), { backgroundColor: tokens.glassUnderlay }]}
						/>
					) : null}

					{/* Layer 2: iOS real blur */}
					{isIOS ? (
						<BlurView
							intensity={tokens.blurIntensity}
							tint={tokens.blurTint}
							style={[StyleSheet.absoluteFill, squircle(24), { overflow: "hidden" }]}
						/>
					) : null}

					{/* Layer 3: Translucent backdrop tint */}
					<View
						pointerEvents="none"
						style={[StyleSheet.absoluteFillObject, squircle(24), { backgroundColor: tokens.glassBackdrop }]}
					/>

					{/* Layer 4: Glass overlay */}
					<View
						pointerEvents="none"
						style={[StyleSheet.absoluteFillObject, squircle(24), { backgroundColor: tokens.glassOverlay }]}
					/>

					<View style={styles.addFundsHeader}>
						<Text style={[styles.addFundsTitle, { color: colors.text }]}>Add Funds</Text>
						<Pressable onPress={handleClose} style={[styles.closeButton, squircle(12)]}>
							<Ionicons name="close" size={24} color={colors.textMuted} />
						</Pressable>
					</View>

					<View style={styles.amountInputWrapper}>
						<Text style={[styles.currencyPrefix, { color: colors.textMuted }]}>$</Text>
						<TextInput
							style={[styles.amountInput, squircle(16), { color: colors.text, backgroundColor: colors.inputBg }]}
							placeholder="Enter amount"
							placeholderTextColor={colors.textMuted}
							value={amount}
							onChangeText={setAmount}
							keyboardType="decimal-pad"
						/>
					</View>

					<View style={styles.presetGrid}>
						{presetAmounts.map((preset) => (
							<Pressable
								key={preset}
								onPress={() => setAmount(preset.toString())}
								style={({ pressed }) => [
									styles.presetChip,
									squircle(12),
									{ backgroundColor: colors.inputBg, opacity: pressed ? 0.7 : 1 }
								]}
							>
								<Text style={[styles.presetText, { color: colors.text }]}>${preset}</Text>
							</Pressable>
						))}
					</View>

					<Pressable
						onPress={handleConfirm}
						disabled={isSaving || !amount}
						style={({ pressed }) => [
							styles.confirmButton,
							squircle(16),
							{
								backgroundColor: COLORS.brandPrimary,
								opacity: (pressed || isSaving || !amount) ? 0.7 : 1,
							},
						]}
					>
						{isSaving ? (
							<ActivityIndicator size="small" color="#FFFFFF" />
						) : (
							<Text style={styles.confirmButtonText}>Add Funds</Text>
						)}
					</Pressable>
				</View>
			</ModalOverlayContainer>
		</Modal>
	);
}

// LinkPaymentCard - Button to link a new payment card
// PULLBACK NOTE: Refactor to 4-layer glass stack following MapSheetShell pattern
// OLD: Single-layer blur/fallback, flat shadow, one-off colors
// NEW: host (shadow) → underlay (Android) → clip → blur/backdrop/overlay → content
// REASON: Match map sheets liquid glass fidelity, inherit platform-aware tokens
export function LinkPaymentCard({ onPress, isDarkMode }) {
	const tokens = getPaymentGlassTokens({ isDarkMode });
	const isAndroid = Platform.OS === "android";
	const isIOS = Platform.OS === "ios";
	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
	};

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.linkCardButton,
				squircle(24),
				tokens.shadowStyle,
				{ overflow: "hidden", opacity: pressed ? 0.7 : 1 }
			]}
			renderToHardwareTextureAndroid={isAndroid}
			needsOffscreenAlphaCompositing={isAndroid}
		>
			{/* Layer 1: Android underlay (opaque fill behind the simulated glass) */}
			{isAndroid ? (
				<View
					pointerEvents="none"
					style={[StyleSheet.absoluteFillObject, squircle(24), { backgroundColor: tokens.glassUnderlay }]}
				/>
			) : null}

			{/* Layer 2: iOS real blur */}
			{isIOS ? (
				<BlurView
					intensity={tokens.blurIntensity}
					tint={tokens.blurTint}
					style={[StyleSheet.absoluteFill, squircle(24), { overflow: "hidden" }]}
				/>
			) : null}

			{/* Layer 3: Translucent backdrop tint */}
			<View
				pointerEvents="none"
				style={[StyleSheet.absoluteFillObject, squircle(24), { backgroundColor: tokens.glassBackdrop }]}
			/>

			{/* Layer 4: Glass overlay (brand/mode tint) */}
			<View
				pointerEvents="none"
				style={[StyleSheet.absoluteFillObject, squircle(24), { backgroundColor: tokens.glassOverlay }]}
			/>

			{/* Content */}
			<View style={styles.linkCardContent}>
				<View style={[styles.linkCardIcon, squircle(16)]}>
					<Ionicons name="card" size={24} color={COLORS.brandPrimary} />
				</View>
				<View>
					<Text style={[styles.linkCardTitle, { color: colors.text }]}>Link Payment Card</Text>
					<Text style={[styles.linkCardSub, { color: colors.textMuted }]}>
						For automatic billing & top-ups
					</Text>
				</View>
			</View>
			<Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
		</Pressable>
	);
}

// PaymentFooter - Confirm payment button section
// PULLBACK NOTE: Extracted from PaymentScreen for reusability
// OLD: Inline footer in PaymentScreen
// NEW: Reusable PaymentFooter component
// REASON: Modularize payment screen UI
// PaymentContextIsland — XL right context island for Checkout variant
// Trust signals + service-aware "What happens next" + cost transparency footer.
// Pure informational surface — no interactions, no API calls, no borders.
export function PaymentContextIsland({ cost, insuranceApplied, serviceType, isDarkMode }) {
	const text = isDarkMode ? '#FFFFFF' : '#0F172A';
	const textMuted = isDarkMode ? '#94A3B8' : '#64748B';
	const separator = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
	const iconColor = isDarkMode ? '#94A3B8' : '#64748B';

	const isAmbulance = serviceType !== 'bed';

	const steps = isAmbulance
		? ['Request approved', 'Ambulance dispatched', 'Track live ETA']
		: ['Request approved', 'Bed assigned', 'Navigate to facility'];

	const stepIcons = isAmbulance
		? ['checkmark-circle', 'car', 'navigate']
		: ['checkmark-circle', 'bed', 'navigate'];

	return (
		<View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 20, gap: 0 }}>
			{/* Section 1 — Service Assurance */}
			<View style={{ gap: 16, paddingBottom: 20 }}>
				<Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: textMuted }}>
					Secure Payment
				</Text>
				{[
					{ icon: 'lock-closed', label: 'PCI-DSS Level 1 encrypted' },
					{ icon: 'flash', label: 'Real-time service dispatch' },
					{ icon: 'shield-checkmark', label: 'Covered by iVisit guarantee' },
				].map(({ icon, label }) => (
					<View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
						<View style={{ width: 28, height: 28, borderRadius: 8, borderCurve: 'continuous', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center' }}>
							<Ionicons name={icon} size={13} color={COLORS.brandPrimary} />
						</View>
						<Text style={{ fontSize: 13, fontWeight: '500', color: text, flex: 1 }}>{label}</Text>
					</View>
				))}
			</View>

			{/* Separator */}
			<View style={{ height: 1, backgroundColor: separator, marginHorizontal: 0, marginBottom: 20 }} />

			{/* Section 2 — What Happens Next */}
			<View style={{ gap: 16, paddingBottom: 20 }}>
				<Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: textMuted }}>
					What Happens Next
				</Text>
				{steps.map((step, idx) => (
					<View key={step} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
						<View style={{ width: 28, height: 28, borderRadius: 8, borderCurve: 'continuous', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center' }}>
							<Ionicons name={stepIcons[idx]} size={13} color={iconColor} />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={{ fontSize: 12, fontWeight: '400', color: textMuted, marginBottom: 1 }}>Step {idx + 1}</Text>
							<Text style={{ fontSize: 13, fontWeight: '600', color: text }}>{step}</Text>
						</View>
					</View>
				))}
			</View>

			{/* Separator */}
			<View style={{ height: 1, backgroundColor: separator, marginHorizontal: 0, marginBottom: 16 }} />

			{/* Section 3 — Cost Transparency footer */}
			<View style={{ gap: 4 }}>
				<Text style={{ fontSize: 12, fontWeight: '500', color: textMuted, lineHeight: 17 }}>
					No hidden fees. Billed exactly{' '}
					<Text style={{ fontWeight: '700', color: text }}>${(cost?.totalCost ?? 0).toFixed(2)}</Text>.
				</Text>
				{insuranceApplied && (
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
						<Ionicons name="shield-checkmark" size={11} color={COLORS.brandPrimary} />
						<Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.brandPrimary }}>
							Insurance has been applied to your total.
						</Text>
					</View>
				)}
			</View>
		</View>
	);
}

// WalletContextIsland — XL right context island for Management variant
// Wallet balance hero + last transaction preview + security footer.
// One ghost CTA (Top Up) — no other interactions.
export function WalletContextIsland({ walletBalance, lastTransaction, isLoading, onTopUp, isDarkMode }) {
	const text = isDarkMode ? '#FFFFFF' : '#0F172A';
	const textMuted = isDarkMode ? '#94A3B8' : '#64748B';
	const separator = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
	const ghostBg = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

	const balance = walletBalance?.balance ?? 0;
	const currency = walletBalance?.currency ?? 'USD';

	const txDate = lastTransaction?.created_at
		? new Date(lastTransaction.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
		: null;
	const txAmount = lastTransaction?.amount != null
		? `$${parseFloat(lastTransaction.amount).toFixed(2)}`
		: null;
	const txStatus = lastTransaction?.status ?? null;
	const statusColor = txStatus === 'completed' ? '#22C55E' : txStatus === 'failed' ? COLORS.brandPrimary : textMuted;

	return (
		<View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 20, gap: 0 }}>
			{/* Section 1 — Balance Hero */}
			<View style={{ alignItems: 'flex-start', paddingBottom: 20, gap: 4 }}>
				<Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: textMuted }}>
					Available Balance
				</Text>
				{isLoading ? (
					<View style={{ height: 40, justifyContent: 'center' }}>
						<ActivityIndicator size="small" color={textMuted} />
					</View>
				) : (
					<Text style={{ fontSize: 32, fontWeight: '800', letterSpacing: -1, color: text, lineHeight: 38 }}>
						{currency} {balance.toFixed(2)}
					</Text>
				)}
				{/* Ghost Top Up CTA */}
				<Pressable
					onPress={onTopUp}
					style={({ pressed }) => ({
						marginTop: 10,
						paddingHorizontal: 14,
						paddingVertical: 7,
						borderRadius: 10,
						borderCurve: 'continuous',
						backgroundColor: pressed ? (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)') : ghostBg,
						flexDirection: 'row',
						alignItems: 'center',
						gap: 6,
					})}
				>
					<Ionicons name="add-circle-outline" size={14} color={COLORS.brandPrimary} />
					<Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.brandPrimary, letterSpacing: 0.3 }}>
						Top Up
					</Text>
				</Pressable>
			</View>

			{/* Separator */}
			<View style={{ height: 1, backgroundColor: separator, marginBottom: 20 }} />

			{/* Section 2 — Last Transaction */}
			<View style={{ gap: 12, paddingBottom: 20 }}>
				<Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: textMuted }}>
					Last Transaction
				</Text>
				{!lastTransaction ? (
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
						<Ionicons name="receipt-outline" size={18} color={textMuted} />
						<Text style={{ fontSize: 13, color: textMuted, fontWeight: '400' }}>No transactions yet</Text>
					</View>
				) : (
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
						<View style={{ width: 36, height: 36, borderRadius: 10, borderCurve: 'continuous', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center' }}>
							<Ionicons name="receipt-outline" size={16} color={textMuted} />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={{ fontSize: 13, fontWeight: '600', color: text }}>
								{lastTransaction?.service_type ?? 'Service'}
							</Text>
							<Text style={{ fontSize: 11, color: textMuted }}>{txDate}</Text>
						</View>
						<View style={{ alignItems: 'flex-end', gap: 2 }}>
							<Text style={{ fontSize: 13, fontWeight: '700', color: text }}>{txAmount}</Text>
							{txStatus && (
								<Text style={{ fontSize: 10, fontWeight: '700', color: statusColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
									{txStatus}
								</Text>
							)}
						</View>
					</View>
				)}
			</View>

			{/* Separator */}
			<View style={{ height: 1, backgroundColor: separator, marginBottom: 16 }} />

			{/* Section 3 — Security footer */}
			<View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
				<Ionicons name="lock-closed" size={11} color={textMuted} style={{ marginTop: 1 }} />
				<Text style={{ fontSize: 11, fontWeight: '400', color: textMuted, lineHeight: 16, flex: 1 }}>
					Your payment data is encrypted and never stored on-device.
				</Text>
			</View>
		</View>
	);
}

export function PaymentFooter({ selectedMethod, isSaving, onPayment, isDarkMode }) {
	const colors = {
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
	};

	return (
		<View style={styles.footer}>
			<View style={styles.securityRow}>
				<Ionicons name="lock-closed" size={14} color={COLORS.brandPrimary} />
				<Text style={[styles.securityText, { color: colors.textMuted }]}>
					PCI-DSS Compliant Secure Payment
				</Text>
			</View>

			<Pressable
				onPress={onPayment}
				disabled={isSaving}
				style={({ pressed }) => [
					styles.payButton,
					{
						backgroundColor: selectedMethod ? COLORS.brandPrimary : (isDarkMode ? "#1E293B" : "#E2E8F0"),
						opacity: pressed ? 0.9 : 1
					}
				]}
			>
				{isSaving ? (
					<ActivityIndicator color="#FFFFFF" />
				) : (
					<>
						<Text style={styles.payButtonText}>Confirm Payment</Text>
						<Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
					</>
				)}
			</Pressable>
		</View>
	);
}


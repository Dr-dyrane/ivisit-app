// components/emergency/ServiceRatingModal.jsx
// Refactored to use StyleSheet instead of Tailwind for web responsiveness

import { useEffect, useMemo, useState, useCallback } from "react";
import {
	View,
	Text,
	Pressable,
	TextInput,
	KeyboardAvoidingView,
	Keyboard,
	Platform,
	ScrollView,
	Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import { useAndroidKeyboardAwareModal } from "../../hooks/ui/useAndroidKeyboardAwareModal";
import useResponsiveSurfaceMetrics from "../../hooks/ui/useResponsiveSurfaceMetrics";
import { paymentService } from "../../services/paymentService";
import { formatMoney } from "../../utils/formatMoney";
import MapModalShell from "../map/surfaces/MapModalShell";
import { styles, getServiceRatingModalResponsiveStyles } from "./serviceRatingModal.styles";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const TIP_PRESETS = [0, 5, 10, 20];
const IS_WEB = Platform.OS === "web";

export function ServiceRatingModal({
	visible,
	serviceType = "visit",
	title = "Rate your service",
	subtitle = null,
	serviceDetails = null,
	onClose,
	onSkip,
	onSubmit,
	surfaceVariant = "map",
	preferDrawerPresentation = false,
}) {
	const { isDarkMode } = useTheme();
	const [rating, setRating] = useState(0);
	const [comment, setComment] = useState("");
	const [selectedTip, setSelectedTip] = useState(0);
	const [customTip, setCustomTip] = useState("");
	const [isCustomTip, setIsCustomTip] = useState(false);
	const [walletBalance, setWalletBalance] = useState(0);
	const [walletCurrency, setWalletCurrency] = useState("USD");
	const [walletLoading, setWalletLoading] = useState(false);
	const [isSkipPending, setIsSkipPending] = useState(false);
	const [isSubmitPending, setIsSubmitPending] = useState(false);

	// Get responsive viewport metrics
	const viewportMetrics = useResponsiveSurfaceMetrics({
		presentationMode: preferDrawerPresentation ? "modal" : "sheet",
	});
	const responsiveStyles = useMemo(
		() => getServiceRatingModalResponsiveStyles(viewportMetrics),
		[viewportMetrics]
	);

	const { modalHeight, keyboardHeight, getKeyboardAvoidingViewProps, getScrollViewProps } =
		useAndroidKeyboardAwareModal({
			defaultHeight: SCREEN_HEIGHT,
			maxHeightPercentage: 0.9,
		});

	useEffect(() => {
		if (!visible) return;
		setRating(0);
		setComment("");
		setSelectedTip(0);
		setCustomTip("");
		setIsCustomTip(false);
		setIsSkipPending(false);
		setIsSubmitPending(false);
	}, [visible]);

	useEffect(() => {
		if (!visible) return undefined;
		let cancelled = false;

		const loadWallet = async () => {
			setWalletLoading(true);
			try {
				const wallet = await paymentService.getWalletBalance();
				if (cancelled) return;
				setWalletBalance(Number(wallet?.balance || 0));
				setWalletCurrency(String(wallet?.currency || "USD"));
			} catch (error) {
				if (!cancelled) {
					setWalletBalance(0);
					setWalletCurrency("USD");
				}
				console.warn("[ServiceRatingModal] Wallet balance load failed:", error);
			} finally {
				if (!cancelled) setWalletLoading(false);
			}
		};

		loadWallet();
		return () => {
			cancelled = true;
		};
	}, [visible]);

	const colors = useMemo(
		() => ({
			bg: isDarkMode ? COLORS.bgDark : "#FCFDFE",
			text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
			subtext: isDarkMode ? COLORS.textMutedDark : "#667085",
			card: isDarkMode ? COLORS.bgDarkAlt : "#EEF2F6",
			accent: COLORS.brandPrimary,
		}),
		[isDarkMode]
	);

	const secondaryActionStyle = useMemo(
		() => ({
			backgroundColor: isDarkMode ? "rgba(255,255,255,0.10)" : "#E9EEF5",
			shadowColor: "#020617",
			shadowOpacity: isDarkMode ? 0.22 : 0.12,
			shadowRadius: 18,
			shadowOffset: { width: 0, height: 10 },
			elevation: 4,
		}),
		[isDarkMode]
	);

	const disabledPrimaryActionStyle = useMemo(
		() => ({
			backgroundColor: isDarkMode ? "rgba(255,255,255,0.12)" : "#E9EEF5",
			opacity: 1,
		}),
		[isDarkMode]
	);

	const enabledPrimaryActionStyle = useMemo(
		() => ({
			backgroundColor: colors.accent,
			opacity: 1,
			shadowColor: "#020617",
			shadowOpacity: isDarkMode ? 0.28 : 0.18,
			shadowRadius: 22,
			shadowOffset: { width: 0, height: 12 },
			elevation: 8,
		}),
		[colors.accent, isDarkMode]
	);

	const currentTipAmount = useMemo(() => {
		const normalizedCustomTip = Number.parseFloat(
			String(customTip || "").replace(/[^0-9.]/g, "")
		);
		if (isCustomTip) {
			return Number.isFinite(normalizedCustomTip)
				? Math.max(0, Math.round(normalizedCustomTip * 100) / 100)
				: 0;
		}
		return Number(selectedTip) || 0;
	}, [customTip, isCustomTip, selectedTip]);

	const isWalletShortForTip =
		currentTipAmount > 0 && currentTipAmount > Number(walletBalance || 0);
	const tipCurrency = walletCurrency || "USD";

	const mapShellMaxHeightRatio = useMemo(() => {
		if (!Number.isFinite(modalHeight) || modalHeight <= 0) {
			return 0.9;
		}
		return Math.max(0.56, Math.min(0.92, modalHeight / SCREEN_HEIGHT));
	}, [modalHeight]);

	const close = useCallback(() => {
		Keyboard.dismiss();
		onClose?.();
	}, [onClose]);

	const handleSkip = useCallback(async () => {
		if (isSkipPending || isSubmitPending) return;
		setIsSkipPending(true);
		try {
			const result = await onSkip?.();
			if (result === false) return;
			close();
		} catch (error) {
			console.warn("[ServiceRatingModal] Skip failed:", error);
		} finally {
			setIsSkipPending(false);
		}
	}, [close, isSkipPending, isSubmitPending, onSkip]);

	const handleSubmit = useCallback(async () => {
		if (rating < 1) return;
		if (isSkipPending || isSubmitPending) return;
		setIsSubmitPending(true);
		try {
			const result = await onSubmit?.({
				rating,
				comment: comment?.trim() || null,
				serviceType,
				tipAmount: currentTipAmount > 0 ? currentTipAmount : 0,
				tipCurrency: walletCurrency || "USD",
			});
			if (result === false) return;
			close();
		} catch (error) {
			console.warn("[ServiceRatingModal] Submit failed:", error);
		} finally {
			setIsSubmitPending(false);
		}
	}, [
		close,
		comment,
		currentTipAmount,
		isSkipPending,
		isSubmitPending,
		onSubmit,
		rating,
		serviceType,
		walletCurrency,
	]);

	const stars = useMemo(() => [1, 2, 3, 4, 5], []);

	const getServiceIcon = () => {
		switch (serviceType) {
			case "ambulance":
				return "medical";
			case "bed":
				return "bed";
			default:
				return "calendar";
		}
	};

	const getServiceTypeLabel = () => {
		switch (serviceType) {
			case "ambulance":
				return "emergency response";
			case "bed":
				return "hospital stay";
			default:
				return "visit";
		}
	};

	const getRatingText = () => {
		switch (rating) {
			case 5:
				return "Excellent!";
			case 4:
				return "Good";
			case 3:
				return "Okay";
			case 2:
				return "Poor";
			case 1:
				return "Very Poor";
			default:
				return "";
		}
	};

	const handleShellClose = useCallback(() => {
		if (isSkipPending || isSubmitPending) return;
		if (keyboardHeight > 0) {
			Keyboard.dismiss();
			return;
		}
		void handleSkip();
	}, [handleSkip, isSkipPending, isSubmitPending, keyboardHeight]);

	// Web ESC key support
	useEffect(() => {
		if (!IS_WEB || !visible || typeof window === "undefined") return undefined;
		const onKeyDown = (event) => {
			if (event.key === "Escape" && !isSkipPending && !isSubmitPending) {
				event.preventDefault();
				void handleSkip();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [handleSkip, isSkipPending, isSubmitPending, visible]);

	const ratingBody = (
		<>
			{/* Header */}
			<View style={[styles.header, responsiveStyles.header]}>
				<View
					style={[
						styles.iconContainer,
						responsiveStyles.iconContainer,
						{ backgroundColor: `${colors.accent}15` },
					]}
				>
					<Ionicons name={getServiceIcon()} size={32} color={colors.accent} />
				</View>
				<Text
					style={[
						styles.title,
						responsiveStyles.title,
						{ color: colors.text },
					]}
				>
					{title}
				</Text>
				{subtitle && (
					<Text
						style={[
							styles.subtitle,
							responsiveStyles.subtitle,
							{ color: colors.subtext },
						]}
					>
						{subtitle}
					</Text>
				)}
			</View>

			{/* Service Details */}
			{serviceDetails && (
				<View
					style={[
						styles.serviceDetailsCard,
						responsiveStyles.serviceDetailsCard,
						{ backgroundColor: colors.card },
					]}
				>
					{serviceDetails.provider && (
						<View style={styles.serviceDetailRow}>
							<Ionicons
								name="person"
								size={16}
								color={colors.subtext}
								style={styles.serviceDetailIcon}
							/>
							<Text
								style={[
									styles.serviceDetailText,
									responsiveStyles.serviceDetailText,
									{ color: colors.text },
								]}
							>
								{serviceDetails.provider}
							</Text>
						</View>
					)}
					{serviceDetails.hospital && (
						<View style={styles.serviceDetailRow}>
							<Ionicons
								name="business"
								size={16}
								color={colors.subtext}
								style={styles.serviceDetailIcon}
							/>
							<Text
								style={[
									styles.serviceDetailText,
									responsiveStyles.serviceDetailText,
									{ color: colors.text },
								]}
							>
								{serviceDetails.hospital}
							</Text>
						</View>
					)}
					{serviceDetails.duration && (
						<View style={[styles.serviceDetailRow, styles.serviceDetailRowLast]}>
							<Ionicons
								name="time"
								size={16}
								color={colors.subtext}
								style={styles.serviceDetailIcon}
							/>
							<Text
								style={[
									styles.serviceDetailText,
									responsiveStyles.serviceDetailText,
									{ color: colors.text },
								]}
							>
								{serviceDetails.duration}
							</Text>
						</View>
					)}
				</View>
			)}

			{/* Rating Section */}
			<View style={[styles.ratingSection, responsiveStyles.ratingSection]}>
				<Text
					style={[
						styles.ratingPrompt,
						responsiveStyles.ratingPrompt,
						{ color: colors.text },
					]}
				>
					How was your {getServiceTypeLabel()}?
				</Text>

				{/* Stars */}
				<View style={[styles.starsContainer, responsiveStyles.starsContainer]}>
					{stars.map((star) => {
						const isActive = star <= rating;
						return (
							<Pressable
								key={star}
								onPress={() => {
									Keyboard.dismiss();
									setRating(star);
								}}
								style={({ pressed }) => [
									styles.starButton,
									responsiveStyles.starButton,
									{ opacity: pressed ? 0.7 : 1 },
								]}
							>
								<Ionicons
									name={isActive ? "star" : "star-outline"}
									size={40}
									color={isActive ? colors.accent : colors.subtext}
								/>
							</Pressable>
						);
					})}
				</View>

				{/* Rating Text */}
				{rating > 0 && (
					<Text
						style={[
							styles.ratingText,
							responsiveStyles.ratingText,
							{ color: colors.accent },
						]}
					>
						{getRatingText()}
					</Text>
				)}
			</View>

			{/* Feedback Section */}
			<View style={[styles.feedbackSection, responsiveStyles.feedbackSection]}>
				<Text
					style={[
						styles.feedbackLabel,
						responsiveStyles.feedbackLabel,
						{ color: colors.text },
					]}
				>
					Add a note
				</Text>
				<TextInput
					value={comment}
					onChangeText={setComment}
					placeholder="Add a note"
					placeholderTextColor={colors.subtext}
					style={[
						styles.feedbackInput,
						responsiveStyles.feedbackInput,
						{ color: colors.text, backgroundColor: colors.card },
					]}
					multiline
				/>
			</View>

			{/* Tip Section */}
			<View style={[styles.tipSection, responsiveStyles.tipSection]}>
				<Text
					style={[
						styles.tipLabel,
						responsiveStyles.tipLabel,
						{ color: colors.text },
					]}
				>
					Add a tip (optional)
				</Text>
				<Text
					style={[
						styles.tipDescription,
						responsiveStyles.tipDescription,
						{ color: colors.subtext },
					]}
				>
					Tips are charged from your wallet balance.
				</Text>

				<View style={[styles.tipButtonsRow, responsiveStyles.tipButtonsRow]}>
					{TIP_PRESETS.map((amount) => {
						const isActive = !isCustomTip && selectedTip === amount;
						return (
							<Pressable
								key={`tip-${amount}`}
								onPress={() => {
									setIsCustomTip(false);
									setSelectedTip(amount);
								}}
								style={[
									styles.tipButton,
									responsiveStyles.tipButton,
									{
										backgroundColor: isActive
											? `${colors.accent}20`
											: colors.card,
									},
								]}
							>
								<Text
									style={[
										styles.tipButtonText,
										responsiveStyles.tipButtonText,
										{ color: isActive ? colors.accent : colors.text },
									]}
								>
									{amount === 0
										? "No tip"
										: formatMoney(amount, {
											currency: tipCurrency,
											minimumFractionDigits: 0,
											maximumFractionDigits: 0,
										})}
								</Text>
							</Pressable>
						);
					})}

					<Pressable
						onPress={() => {
							setIsCustomTip(true);
							setSelectedTip(0);
						}}
						style={[
							styles.tipButton,
							responsiveStyles.tipButton,
							{
								backgroundColor: isCustomTip
									? `${colors.accent}20`
									: colors.card,
							},
						]}
					>
						<Text
							style={[
								styles.tipButtonText,
								responsiveStyles.tipButtonText,
								{ color: isCustomTip ? colors.accent : colors.text },
							]}
						>
							Custom
						</Text>
					</Pressable>
				</View>

				{isCustomTip && (
					<TextInput
						value={customTip}
						onChangeText={setCustomTip}
						placeholder="Enter tip amount"
						placeholderTextColor={colors.subtext}
						keyboardType="decimal-pad"
						style={[
							styles.tipCustomInput,
							responsiveStyles.tipCustomInput,
							{ color: colors.text, backgroundColor: colors.card },
						]}
					/>
				)}

				<Text
					style={[
						styles.walletBalance,
						responsiveStyles.walletBalance,
						{ color: colors.subtext },
					]}
				>
					{walletLoading
						? "Checking wallet balance..."
						: `Wallet balance: ${formatMoney(walletBalance, {
							currency: tipCurrency,
						})}`}
				</Text>

				{isWalletShortForTip ? (
					<Text
						style={[
							styles.walletShortWarning,
							responsiveStyles.walletShortWarning,
							{ color: "#F59E0B" },
						]}
					>
						Wallet is low. You can still continue and choose cash or card fallback next.
					</Text>
				) : null}
			</View>

			{/* Actions */}
			<View style={[styles.actionsContainer, responsiveStyles.actionsContainer]}>
				<Pressable
					onPress={() => {
						if (isSkipPending || isSubmitPending) return;
						if (keyboardHeight > 0) {
							Keyboard.dismiss();
							return;
						}
						void handleSkip();
					}}
					disabled={isSkipPending || isSubmitPending}
					style={({ pressed }) => [
						styles.actionButton,
						pressed && !isSkipPending ? { opacity: 0.94, transform: [{ scale: 0.988 }] } : null,
					]}
				>
					<View
						style={[
							styles.actionButtonInner,
							responsiveStyles.actionButtonInner,
							secondaryActionStyle,
						]}
					>
						<Text
							style={[
								styles.actionButtonText,
								responsiveStyles.actionButtonText,
								{ color: colors.text },
							]}
						>
							{isSkipPending ? "Skipping..." : "Skip"}
						</Text>
					</View>
				</Pressable>

				<Pressable
					onPress={() => {
						void handleSubmit();
					}}
					disabled={rating < 1 || isSkipPending || isSubmitPending}
					style={({ pressed }) => [
						styles.actionButton,
						pressed && rating >= 1 && !isSubmitPending
							? { opacity: 0.96, transform: [{ scale: 0.988 }] }
							: null,
					]}
				>
					<View
						style={[
							styles.actionButtonInner,
							responsiveStyles.actionButtonInner,
							rating >= 1 && !isSubmitPending
								? enabledPrimaryActionStyle
								: disabledPrimaryActionStyle,
						]}
					>
						<Text
							style={[
								styles.actionButtonText,
								responsiveStyles.actionButtonText,
								{
									color:
										rating >= 1 && !isSubmitPending
											? COLORS.bgLight
											: colors.text,
								},
							]}
						>
							{isSubmitPending ? "Saving..." : "Submit"}
						</Text>
					</View>
				</Pressable>
			</View>
		</>
	);

	return (
		<MapModalShell
			visible={visible}
			onClose={handleShellClose}
			title={null}
			enableSnapDetents={false}
			matchExpandedSheetHeight={false}
			minHeightRatio={0.62}
			maxHeightRatio={mapShellMaxHeightRatio}
			presentationModeOverride={
				preferDrawerPresentation ? "left-drawer" : "bottom-sheet"
			}
			scrollEnabled={false}
			contentContainerStyle={{
				flex: 1,
				paddingTop: 8,
			}}
		>
			<KeyboardAvoidingView {...getKeyboardAvoidingViewProps()}>
				<ScrollView
					{...getScrollViewProps()}
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{ paddingBottom: 8 }}
					keyboardShouldPersistTaps="handled"
				>
					{ratingBody}
				</ScrollView>
			</KeyboardAvoidingView>
		</MapModalShell>
	);
}

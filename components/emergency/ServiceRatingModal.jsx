// components/emergency/ServiceRatingModal.jsx

/**
 * ServiceRatingModal - Apple-inspired redesign
 * Clean, minimal design following app's no-border rule and theme system
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
	Modal,
	View,
	Text,
	Pressable,
	Animated,
	Dimensions,
	TextInput,
	KeyboardAvoidingView,
	Keyboard,
	Platform,
	ScrollView,
	useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import { useAndroidKeyboardAwareModal } from "../../hooks/ui/useAndroidKeyboardAwareModal";
import { paymentService } from "../../services/paymentService";
import MapModalShell from "../map/surfaces/MapModalShell";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const TIP_PRESETS = [0, 5, 10, 20];
const squircle = (radius) => ({
	borderRadius: radius,
	borderCurve: "continuous",
});

export function ServiceRatingModal({
	visible,
	serviceType = "visit", // "ambulance", "bed", "visit"
	title = "Rate your service",
	subtitle = null,
	serviceDetails = null, // { provider, hospital, duration, etc. }
	onClose,
	onSkip,
	onSubmit,
	surfaceVariant = "legacy",
	preferDrawerPresentation = false,
}) {
	const { isDarkMode } = useTheme();
	const { height: windowHeight } = useWindowDimensions();
	const [rating, setRating] = useState(0);
	const [comment, setComment] = useState("");
	const [selectedTip, setSelectedTip] = useState(0);
	const [customTip, setCustomTip] = useState("");
	const [isCustomTip, setIsCustomTip] = useState(false);
	const [walletBalance, setWalletBalance] = useState(0);
	const [walletCurrency, setWalletCurrency] = useState("USD");
	const [walletLoading, setWalletLoading] = useState(false);
	const [isActionPending, setIsActionPending] = useState(false);

	const { modalHeight, keyboardHeight, getKeyboardAvoidingViewProps, getScrollViewProps } =
		useAndroidKeyboardAwareModal({
			defaultHeight: SCREEN_HEIGHT,
			maxHeightPercentage: 0.9
		});

	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const fadeAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!visible) return;
		setRating(0);
		setComment("");
		setSelectedTip(0);
		setCustomTip("");
		setIsCustomTip(false);
		setIsActionPending(false);
		Animated.parallel([
			Animated.spring(slideAnim, {
				toValue: 0,
				tension: 70,
				friction: 12,
				useNativeDriver: true,
			}),
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 220,
				useNativeDriver: true,
			}),
		]).start();
	}, [fadeAnim, slideAnim, visible]);

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

	const colors = useMemo(() => ({
		bg: isDarkMode ? COLORS.bgDark : "#FCFDFE",
		text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
		subtext: isDarkMode ? COLORS.textMutedDark : "#667085",
		card: isDarkMode ? COLORS.bgDarkAlt : "#EEF2F6",
		accent: COLORS.brandPrimary,
	}), [isDarkMode]);
	const sheetStyle = useMemo(
		() => ({
			transform: [{ translateY: slideAnim }],
			backgroundColor: colors.bg,
			height: modalHeight,
			paddingHorizontal: 24,
			paddingTop: 16,
			borderTopLeftRadius: 40,
			borderTopRightRadius: 40,
			borderCurve: "continuous",
		}),
		[colors.bg, modalHeight, slideAnim],
	);
	const secondaryActionStyle = useMemo(
		() => ({
			backgroundColor: isDarkMode ? "rgba(255,255,255,0.10)" : "#E9EEF5",
			shadowColor: "#020617",
			shadowOpacity: isDarkMode ? 0.22 : 0.12,
			shadowRadius: 18,
			shadowOffset: { width: 0, height: 10 },
			elevation: 4,
			...squircle(28),
		}),
		[colors.card, isDarkMode],
	);
	const disabledPrimaryActionStyle = useMemo(
		() => ({
			backgroundColor: isDarkMode ? "rgba(255,255,255,0.12)" : "#E9EEF5",
			opacity: 1,
			...squircle(28),
		}),
		[isDarkMode],
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
			...squircle(28),
		}),
		[colors.accent, isDarkMode],
	);

	const currentTipAmount = useMemo(() => {
		const normalizedCustomTip = Number.parseFloat(String(customTip || "").replace(/[^0-9.]/g, ""));
		if (isCustomTip) {
			return Number.isFinite(normalizedCustomTip)
				? Math.max(0, Math.round(normalizedCustomTip * 100) / 100)
				: 0;
		}
		return Number(selectedTip) || 0;
	}, [customTip, isCustomTip, selectedTip]);

	const isWalletShortForTip =
		currentTipAmount > 0 && currentTipAmount > Number(walletBalance || 0);
	const shouldUseMapShell = surfaceVariant === "map";
	const mapShellMaxHeightRatio = useMemo(() => {
		if (!Number.isFinite(windowHeight) || windowHeight <= 0) {
			return 0.9;
		}
		return Math.max(0.56, Math.min(0.92, modalHeight / windowHeight));
	}, [modalHeight, windowHeight]);

	const close = useCallback(() => {
		Keyboard.dismiss();
		Animated.parallel([
			Animated.timing(slideAnim, {
				toValue: SCREEN_HEIGHT,
				duration: 300,
				useNativeDriver: true,
			}),
			Animated.timing(fadeAnim, {
				toValue: 0,
				duration: 250,
				useNativeDriver: true,
			}),
		]).start(() => onClose?.());
	}, [fadeAnim, onClose, slideAnim]);

	const handleSkip = useCallback(async () => {
		if (isActionPending) return;
		setIsActionPending(true);
		try {
			const result = await onSkip?.();
			if (result === false) return;
			close();
		} catch (error) {
			console.warn("[ServiceRatingModal] Skip failed:", error);
		} finally {
			setIsActionPending(false);
		}
	}, [close, isActionPending, onSkip]);

	const handleSubmit = useCallback(async () => {
		if (rating < 1) return;
		if (isActionPending) return;
		setIsActionPending(true);
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
			setIsActionPending(false);
		}
	}, [
		close,
		comment,
		currentTipAmount,
		isActionPending,
		onSubmit,
		rating,
		serviceType,
		walletCurrency,
	]);

	const stars = useMemo(() => [1, 2, 3, 4, 5], []);

	const getServiceIcon = () => {
		switch (serviceType) {
			case "ambulance": return "medical";
			case "bed": return "bed";
			default: return "calendar";
		}
	};

	const getServiceTypeLabel = () => {
		switch (serviceType) {
			case "ambulance": return "emergency response";
			case "bed": return "hospital stay";
			default: return "visit";
		}
	};

	const getRatingText = () => {
		switch (rating) {
			case 5: return "Excellent!";
			case 4: return "Good";
			case 3: return "Okay";
			case 2: return "Poor";
			case 1: return "Very Poor";
			default: return "";
		}
	};

	const handleShellClose = useCallback(() => {
		if (isActionPending) return;
		if (keyboardHeight > 0) {
			Keyboard.dismiss();
			return;
		}
		void handleSkip();
	}, [handleSkip, isActionPending, keyboardHeight]);

	const ratingBody = (
		<>
			{/* Header */}
			<View className="items-center mb-8">
				<View
					className="w-16 h-16 items-center justify-center mb-4"
					style={{
						backgroundColor: `${colors.accent}15`,
						...squircle(24),
					}}
				>
					<Ionicons name={getServiceIcon()} size={32} color={colors.accent} />
				</View>
				<Text
					className="text-3xl text-center mb-2"
					style={{
						color: colors.text,
						fontWeight: "700",
						letterSpacing: -0.7,
					}}
				>
					{title}
				</Text>
				{subtitle && (
					<Text
						className="text-base text-center"
						style={{ color: colors.subtext }}
					>
						{subtitle}
					</Text>
				)}
			</View>

			{/* Service Details */}
			{serviceDetails && (
				<View
					className="p-4 mb-6"
					style={{
						backgroundColor: colors.card,
						...squircle(24),
					}}
				>
					{serviceDetails.provider && (
						<View className="flex-row items-center mb-3">
							<Ionicons name="person" size={16} color={colors.subtext} style={{ marginRight: 12 }} />
							<Text
								className="text-base font-medium"
								style={{ color: colors.text }}
							>
								{serviceDetails.provider}
							</Text>
						</View>
					)}
					{serviceDetails.hospital && (
						<View className="flex-row items-center mb-3">
							<Ionicons name="business" size={16} color={colors.subtext} style={{ marginRight: 12 }} />
							<Text
								className="text-base font-medium"
								style={{ color: colors.text }}
							>
								{serviceDetails.hospital}
							</Text>
						</View>
					)}
					{serviceDetails.duration && (
						<View className="flex-row items-center">
							<Ionicons name="time" size={16} color={colors.subtext} style={{ marginRight: 12 }} />
							<Text
								className="text-base font-medium"
								style={{ color: colors.text }}
							>
								{serviceDetails.duration}
							</Text>
						</View>
					)}
				</View>
			)}

			{/* Rating Section */}
			<View className="mb-6">
				<Text
					className="text-lg font-semibold text-center mb-6"
					style={{ color: colors.text }}
				>
					How was your {getServiceTypeLabel()}?
				</Text>

				{/* Stars */}
				<View className="flex-row justify-center mb-4">
					{stars.map((star) => {
						const isActive = star <= rating;
						return (
							<Pressable
								key={star}
								onPress={() => {
									Keyboard.dismiss();
									setRating(star);
								}}
								className="p-2"
								style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
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
						className="text-center text-lg font-medium mb-2"
						style={{ color: colors.accent }}
					>
						{getRatingText()}
					</Text>
				)}
			</View>

			{/* Feedback Section */}
			<View className="mb-8">
				<Text
					className="text-base font-medium mb-3"
					style={{ color: colors.text }}
				>
					Add a note
				</Text>
				<TextInput
					value={comment}
					onChangeText={setComment}
					placeholder="Add a note"
					placeholderTextColor={colors.subtext}
					className="p-4 text-base"
					style={{
						color: colors.text,
						backgroundColor: colors.card,
						height: 100,
						textAlignVertical: 'top',
						...squircle(22),
					}}
					multiline
				/>
			</View>

			{/* Tip Section */}
			<View className="mb-8">
				<Text
					className="text-base font-medium mb-2"
					style={{ color: colors.text }}
				>
					Add a tip (optional)
				</Text>
				<Text
					className="text-sm mb-4"
					style={{ color: colors.subtext }}
				>
					Tips are charged from your wallet balance.
				</Text>

				<View className="flex-row flex-wrap mb-4" style={{ gap: 10 }}>
					{TIP_PRESETS.map((amount) => {
						const isActive = !isCustomTip && selectedTip === amount;
						return (
							<Pressable
								key={`tip-${amount}`}
								onPress={() => {
									setIsCustomTip(false);
									setSelectedTip(amount);
								}}
								className="px-4 py-2"
								style={{
									backgroundColor: isActive ? `${colors.accent}20` : colors.card,
									...squircle(18),
								}}
							>
								<Text
									className="text-sm font-semibold"
									style={{ color: isActive ? colors.accent : colors.text }}
								>
									{amount === 0 ? "No tip" : `$${amount}`}
								</Text>
							</Pressable>
						);
					})}

					<Pressable
						onPress={() => {
							setIsCustomTip(true);
							setSelectedTip(0);
						}}
						className="px-4 py-2"
						style={{
							backgroundColor: isCustomTip ? `${colors.accent}20` : colors.card,
							...squircle(18),
						}}
					>
						<Text
							className="text-sm font-semibold"
							style={{ color: isCustomTip ? colors.accent : colors.text }}
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
						className="px-4 py-3 text-base mb-3"
						style={{
							color: colors.text,
							backgroundColor: colors.card,
							...squircle(20),
						}}
					/>
				)}

				<Text
					className="text-sm"
					style={{ color: colors.subtext }}
				>
					{walletLoading
						? "Checking wallet balance..."
						: `Wallet balance: ${walletCurrency} ${Number(walletBalance || 0).toFixed(2)}`}
				</Text>

				{isWalletShortForTip ? (
					<Text className="text-sm mt-2" style={{ color: "#F59E0B" }}>
						Wallet is low. You can still continue and choose cash or card fallback next.
					</Text>
				) : null}
			</View>

			{/* Actions */}
			<View className="flex-row gap-3">
				<Pressable
					onPress={() => {
						if (isActionPending) return;
						if (keyboardHeight > 0) {
							Keyboard.dismiss();
							return;
						}
						void handleSkip();
					}}
					disabled={isActionPending}
					className="flex-1"
					style={({ pressed }) => [
						pressed ? { opacity: 0.94, transform: [{ scale: 0.988 }] } : null,
					]}
				>
					<View
						className="h-14 items-center justify-center"
						style={secondaryActionStyle}
					>
						<Text
							className="text-base"
							style={{ color: colors.text, fontWeight: "600" }}
						>
							{isActionPending ? "Saving..." : "Skip"}
						</Text>
					</View>
				</Pressable>

				<Pressable
					onPress={() => {
						void handleSubmit();
					}}
					disabled={rating < 1 || isActionPending}
					className="flex-1"
					style={({ pressed }) => [
						pressed && rating >= 1 && !isActionPending
							? { opacity: 0.96, transform: [{ scale: 0.988 }] }
							: null,
					]}
				>
					<View
						className="h-14 items-center justify-center"
						style={
							rating >= 1 && !isActionPending
								? enabledPrimaryActionStyle
								: disabledPrimaryActionStyle
						}
					>
						<Text
							className="text-base"
							style={{
								color:
									rating >= 1 && !isActionPending
										? COLORS.bgLight
										: colors.text,
								fontWeight: "600",
							}}
						>
							{isActionPending ? "Saving..." : "Submit"}
						</Text>
					</View>
				</Pressable>
			</View>
		</>
	);

	if (shouldUseMapShell) {
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
					paddingHorizontal: 24,
					paddingTop: 8,
					paddingBottom: 24,
				}}
			>
				<KeyboardAvoidingView {...getKeyboardAvoidingViewProps()}>
					<ScrollView
						{...getScrollViewProps()}
						showsVerticalScrollIndicator={false}
						contentContainerStyle={{ paddingBottom: 40 }}
						keyboardShouldPersistTaps="handled"
					>
						{ratingBody}
					</ScrollView>
				</KeyboardAvoidingView>
			</MapModalShell>
		);
	}

	return (
		<Modal visible={visible} transparent animationType="none" onRequestClose={handleSkip}>
			<View
				className="flex-1 justify-end"
				style={{ paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }}
			>
				<Animated.View
					style={{ opacity: fadeAnim }}
					className="absolute inset-0 bg-black/50"
				>
					<Pressable
						className="flex-1"
						onPress={() => {
							if (isActionPending) return;
							if (keyboardHeight > 0) {
								Keyboard.dismiss();
								return;
							}
							void handleSkip();
						}}
					/>
					{Platform.OS === "ios" ? (
						<BlurView
							intensity={20}
							tint={isDarkMode ? "dark" : "light"}
							style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
						/>
					) : (
						// Android fallback: solid surface to avoid blur-smudge artifacts
						<View
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								right: 0,
								bottom: 0,
								backgroundColor: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLight,
							}}
						/>
					)}
				</Animated.View>

				<Animated.View
					style={sheetStyle}
				>
					{/* Handle */}
					<View
						className="self-center mb-8"
						style={{
							width: 48,
							height: 6,
							backgroundColor: isDarkMode
								? "rgba(255,255,255,0.18)"
								: "rgba(15,23,42,0.12)",
							borderRadius: 999,
						}}
					/>

					<KeyboardAvoidingView {...getKeyboardAvoidingViewProps()}>
						<ScrollView
							{...getScrollViewProps()}
							showsVerticalScrollIndicator={false}
							contentContainerStyle={{ paddingBottom: 40 }}
							keyboardShouldPersistTaps="handled"
						>
							{ratingBody}
						</ScrollView>
					</KeyboardAvoidingView>
				</Animated.View>
			</View>
		</Modal>
	);
}

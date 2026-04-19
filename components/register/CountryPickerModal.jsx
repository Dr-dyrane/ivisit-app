import { useMemo, useState, useRef, useEffect } from "react";
import {
	Animated,
	FlatList,
	Keyboard,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
	useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { useAndroidKeyboardAwareModal } from "../../hooks/ui/useAndroidKeyboardAwareModal";
import countries from "../../data/countries";
import CountryFlagGlyph from "./CountryFlagGlyph";

export default function CountryPickerModal({ visible, onClose, onSelect }) {
	const { isDarkMode } = useTheme();
	const { height: screenHeight, width: screenWidth } = useWindowDimensions();
	const isWeb = Platform.OS === "web";
	const isWebMobile = isWeb && screenWidth < 768;
	const isWebSideSheet = isWeb && !isWebMobile;
	const [query, setQuery] = useState("");

	const defaultModalHeight = Math.min(
		screenHeight * (isWebSideSheet ? 0.92 : isWeb ? 0.82 : 0.75),
		isWebSideSheet ? screenHeight - 28 : isWeb ? 720 : screenHeight - 32,
	);
	const { modalHeight, keyboardHeight, getKeyboardAvoidingViewProps } =
		useAndroidKeyboardAwareModal({
			defaultHeight: defaultModalHeight,
		});

	const hiddenTranslate = isWebSideSheet
		? Math.min(520, Math.max(360, screenWidth * 0.42))
		: isWeb
			? screenHeight
			: screenHeight;
	const slideAnim = useRef(new Animated.Value(hiddenTranslate)).current;
	const bgOpacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (visible) {
			slideAnim.setValue(hiddenTranslate);
			bgOpacity.setValue(0);
			Animated.parallel([
				Animated.spring(slideAnim, {
					toValue: 0,
					tension: 56,
					friction: 10,
					useNativeDriver: true,
				}),
				Animated.timing(bgOpacity, {
					toValue: 1,
					duration: 220,
					useNativeDriver: true,
				}),
			]).start();
			return;
		}

		setQuery("");
		slideAnim.setValue(hiddenTranslate);
		bgOpacity.setValue(0);
	}, [bgOpacity, hiddenTranslate, slideAnim, visible]);

	const colors = {
		bg: isDarkMode ? "#0D1117" : "#FFFFFF",
		inputBg: isDarkMode ? "#161B22" : "#F3F4F6",
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		border: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
		primary: "#86100E",
		muted: isDarkMode ? "rgba(203,213,225,0.72)" : "#64748B",
		rowPressed: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
	};

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return countries;

		return countries.filter((country) => {
			const nameMatch = country.name.toLowerCase().includes(q);
			const codeMatch = country.code.toLowerCase().includes(q);
			const dialMatch = country.dial_code
				.replace(/\s/g, "")
				.includes(q.replace(/\s/g, ""));

			return nameMatch || codeMatch || dialMatch;
		});
	}, [query]);

	const handleClose = () => {
		Keyboard.dismiss();
		Animated.parallel([
			Animated.timing(slideAnim, {
				toValue: hiddenTranslate,
				duration: 220,
				useNativeDriver: true,
			}),
			Animated.timing(bgOpacity, {
				toValue: 0,
				duration: 180,
				useNativeDriver: true,
			}),
		]).start(() => onClose?.());
	};

	const containerHeight = Math.max(320, modalHeight);
	const webBottomWidth = Math.max(320, Math.min(screenWidth, 520));
	const webSideSheetWidth = Math.min(
		468,
		Math.max(360, Math.round(screenWidth * 0.34)),
	);
	const cardTransform = isWebSideSheet
		? [{ translateX: slideAnim }]
		: [{ translateY: slideAnim }];

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={handleClose}
			statusBarTranslucent
		>
			<View
				style={[
					styles.host,
					isWebSideSheet
						? styles.hostWebSideSheet
						: isWebMobile
							? styles.hostWebBottomSheet
							: styles.hostNative,
					!isWeb && Platform.OS === "android"
						? { paddingBottom: keyboardHeight }
						: null,
				]}
			>
				<Animated.View style={[styles.scrim, { opacity: bgOpacity }]}>
					<Pressable style={styles.scrimPressable} onPress={handleClose} />
				</Animated.View>

				<Animated.View
					style={[
						styles.card,
						isWebSideSheet
							? styles.cardWebSideSheet
							: isWebMobile
								? styles.cardWebBottomSheet
								: styles.cardNative,
						{
							backgroundColor: colors.bg,
							maxHeight: containerHeight,
							height: isWebSideSheet ? containerHeight : isWebMobile ? undefined : containerHeight,
							width: isWebSideSheet
								? webSideSheetWidth
								: isWebMobile
									? webBottomWidth
									: "100%",
							transform: cardTransform,
						},
					]}
				>
					{isWebSideSheet ? null : <View style={styles.handle} />}

					<KeyboardAvoidingView
						{...getKeyboardAvoidingViewProps()}
						style={styles.flexOne}
					>
						<View style={styles.headerRow}>
							<Text style={[styles.title, { color: colors.text }]}>
								Select Region
							</Text>
							<Pressable
								onPress={handleClose}
								style={({ pressed }) => [
									styles.closeButton,
									pressed ? styles.closeButtonPressed : null,
								]}
							>
								<Ionicons name="close" size={20} color={colors.text} />
							</Pressable>
						</View>

						<View
							style={[styles.searchShell, { backgroundColor: colors.inputBg }]}
						>
							<Ionicons name="search" size={18} color={colors.muted} />
							<TextInput
								value={query}
								onChangeText={setQuery}
								placeholder="Search country or code"
								placeholderTextColor={colors.muted}
								autoCapitalize="none"
								autoCorrect={false}
								style={[styles.searchInput, { color: colors.text }]}
							/>
							{query.length > 0 ? (
								<Pressable onPress={() => setQuery("")}>
									<Ionicons
										name="close-circle"
										size={18}
										color={colors.muted}
									/>
								</Pressable>
							) : null}
						</View>

						{query.length > 0 ? (
							<Text style={[styles.resultCount, { color: colors.muted }]}>
								{filtered.length} {filtered.length === 1 ? "result" : "results"}
							</Text>
						) : null}

						<FlatList
							data={filtered}
							keyExtractor={(item) => item.code}
							style={styles.list}
							showsVerticalScrollIndicator={false}
							contentContainerStyle={styles.listContent}
							keyboardShouldPersistTaps="handled"
							renderItem={({ item }) => (
								<Pressable
									onPress={() => {
										Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
										onSelect?.(item);
										handleClose();
									}}
									style={({ pressed }) => [
										styles.countryRow,
										{
											borderBottomColor: colors.border,
											backgroundColor: pressed ? colors.rowPressed : "transparent",
										},
									]}
								>
									<View style={styles.countryIdentity}>
										<CountryFlagGlyph
											flag={item.flag}
											code={item.code}
											size={24}
											style={styles.countryFlag}
										/>
										<View style={styles.countryCopy}>
											<Text
												numberOfLines={1}
												style={[styles.countryName, { color: colors.text }]}
											>
												{item.name}
											</Text>
										</View>
									</View>
									<Text style={[styles.countryDial, { color: colors.primary }]}>
										{item.dial_code}
									</Text>
								</Pressable>
							)}
							ListEmptyComponent={
								<View style={styles.emptyState}>
									<Ionicons
										name="search-outline"
										size={48}
										color={colors.muted}
									/>
									<Text style={[styles.emptyText, { color: colors.muted }]}>
										No countries found
									</Text>
								</View>
							}
						/>
					</KeyboardAvoidingView>
				</Animated.View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	host: {
		flex: 1,
	},
	hostNative: {
		justifyContent: "flex-end",
	},
	hostWebBottomSheet: {
		justifyContent: "flex-end",
		alignItems: "center",
		paddingTop: 20,
	},
	hostWebSideSheet: {
		justifyContent: "center",
		alignItems: "flex-end",
		paddingHorizontal: 20,
		paddingVertical: 16,
	},
	scrim: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.6)",
	},
	scrimPressable: {
		flex: 1,
	},
	card: {
		overflow: "hidden",
		borderCurve: "continuous",
	},
	cardNative: {
		borderTopLeftRadius: 40,
		borderTopRightRadius: 40,
		paddingHorizontal: 24,
		paddingTop: 16,
	},
	cardWebBottomSheet: {
		alignSelf: "stretch",
		borderTopLeftRadius: 34,
		borderTopRightRadius: 34,
		paddingHorizontal: 20,
		paddingTop: 16,
		paddingBottom: 8,
	},
	cardWebSideSheet: {
		borderRadius: 32,
		paddingHorizontal: 24,
		paddingTop: 20,
		paddingBottom: 8,
		shadowColor: "#0F172A",
		shadowOpacity: 0.24,
		shadowRadius: 28,
		shadowOffset: { width: 0, height: 18 },
		elevation: 14,
	},
	handle: {
		width: 48,
		height: 6,
		borderRadius: 999,
		backgroundColor: "rgba(148,163,184,0.35)",
		alignSelf: "center",
		marginBottom: 24,
	},
	flexOne: {
		flex: 1,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 16,
	},
	title: {
		fontSize: 28,
		lineHeight: 32,
		fontWeight: "900",
		letterSpacing: -0.9,
	},
	closeButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(148,163,184,0.12)",
	},
	closeButtonPressed: {
		opacity: 0.9,
		transform: [{ scale: 0.98 }],
	},
	searchShell: {
		height: 56,
		borderRadius: 22,
		borderCurve: "continuous",
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
	},
	searchInput: {
		flex: 1,
		marginLeft: 12,
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "700",
	},
	resultCount: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "600",
		marginBottom: 10,
	},
	list: {
		flex: 1,
	},
	listContent: {
		paddingBottom: 28,
	},
	countryRow: {
		minHeight: 64,
		paddingVertical: 14,
		paddingHorizontal: 4,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderBottomWidth: 1,
	},
	countryIdentity: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		minWidth: 0,
	},
	countryFlag: {
		marginRight: 16,
	},
	countryCopy: {
		flex: 1,
		minWidth: 0,
	},
	countryName: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "800",
	},
	countryDial: {
		marginLeft: 12,
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "900",
	},
	emptyState: {
		alignItems: "center",
		paddingVertical: 32,
	},
	emptyText: {
		marginTop: 12,
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "600",
	},
});

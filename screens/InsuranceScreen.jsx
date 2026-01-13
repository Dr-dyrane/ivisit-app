"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	Animated,
	TouchableOpacity,
	RefreshControl,
	Alert,
	LayoutAnimation,
	UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import InputModal from "../components/ui/InputModal";
import Input from "../components/form/Input";
import { insuranceService } from "../services/insuranceService";
import { notificationDispatcher } from "../services/notificationDispatcher";
import useSwipeGesture from "../utils/useSwipeGesture";

// Enable LayoutAnimation on Android
if (Platform.OS === "android") {
	if (UIManager.setLayoutAnimationEnabledExperimental) {
		UIManager.setLayoutAnimationEnabledExperimental(true);
	}
}

// --- THE IDENTITY ARTIFACT (POLICY CARD) ---
const PolicyCard = ({ policy, isDarkMode, onEdit, onDelete }) => {
	const [unmasked, setUnmasked] = useState(false);
	const [selected, setSelected] = useState(false);
	const [holdTimer, setHoldTimer] = useState(null);
	const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
	const mutedColor = isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;

	const handlePress = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setUnmasked(!unmasked);
	};

	const handlePressIn = () => {
		const timer = setTimeout(() => {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
			setSelected(!selected);
		}, 500);
		setHoldTimer(timer);
	};

	const handlePressOut = () => {
		if (holdTimer) {
			clearTimeout(holdTimer);
			setHoldTimer(null);
		}
	};

	return (
		<TouchableOpacity
			activeOpacity={0.9}
			onPress={handlePress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			style={[
				styles.policyCard,
				{
					backgroundColor: isDarkMode ? "#0B0F1A" : "#FFFFFF",
					shadowColor: unmasked ? COLORS.brandPrimary : selected ? COLORS.brandPrimary : "#000",
					shadowOpacity: unmasked ? 0.2 : selected ? 0.3 : 0.08,
					borderColor: unmasked ? COLORS.brandPrimary + "40" : selected ? COLORS.brandPrimary + "60" : "transparent",
					borderWidth: (unmasked || selected) ? 1 : 0,
					transform: [{ scale: selected ? 0.98 : 1 }]
				},
			]}
		>
			{/* Corner Seal - Selection Indicator */}
			{selected && (
				<View style={styles.cornerSeal}>
					<Ionicons 
						name="checkmark-circle" 
						size={24} 
						color={COLORS.brandPrimary}
						style={{
							backgroundColor: '#FFFFFF',
							borderRadius: 12,
							padding: 2
						}}
					/>
				</View>
			)}

			<View style={styles.cardHeader}>
				<View style={styles.providerInfo}>
					<Text
						style={[styles.editorialSubtitle, { color: COLORS.brandPrimary }]}
					>
						PROVIDER
					</Text>
					<Text style={[styles.providerName, { color: textColor }]}>
						{policy.provider_name}
					</Text>
				</View>
				<View
					style={[
						styles.iconBox,
						{ backgroundColor: COLORS.brandPrimary + "15" },
					]}
				>
					<Ionicons
						name={unmasked ? "eye-off" : "shield-checkmark"}
						size={22}
						color={COLORS.brandPrimary}
					/>
				</View>
			</View>

			<View
				style={[
					styles.dataWidget,
					{
						backgroundColor: isDarkMode
							? "rgba(255,255,255,0.03)"
							: "rgba(0,0,0,0.02)",
					},
				]}
			>
				<View>
					<Text style={[styles.editorialSubtitle, { color: mutedColor }]}>
						POLICY NUMBER
					</Text>
					<Text style={[styles.policyNumber, { color: textColor }]}>
						{unmasked
							? policy.policy_number
							: `•••• •••• ${policy.policy_number.slice(-4)}`}
					</Text>
				</View>

				{unmasked && policy.group_number && (
					<View style={{ marginTop: 16 }}>
						<Text style={[styles.editorialSubtitle, { color: mutedColor }]}>
							GROUP
						</Text>
						<Text style={[styles.groupNumber, { color: textColor }]}>
							{policy.group_number}
						</Text>
					</View>
				)}
			</View>

			{/* Hint Text */}
			{!unmasked && !selected && (
				<Text style={[styles.hintText, { color: mutedColor }]}>
					Tap to reveal • Hold to select
				</Text>
			)}

			{!unmasked ? (
				<Text style={[styles.hintText, { color: mutedColor }]}>
					Tap to reveal details
				</Text>
			) : (
				<View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
					<TouchableOpacity
						onPress={() => onEdit(policy)}
						style={{
							flex: 1,
							height: 44,
							borderRadius: 14,
							backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#F1F5F9",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Text style={{ fontWeight: "700", color: textColor }}>Edit</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => onDelete(policy.id)}
						style={{
							flex: 1,
							height: 44,
							borderRadius: 14,
							backgroundColor: "rgba(239, 68, 68, 0.1)",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Text style={{ fontWeight: "700", color: COLORS.error }}>
							Remove
						</Text>
					</TouchableOpacity>
				</View>
			)}
		</TouchableOpacity>
	);
};

import { useFAB } from "../contexts/FABContext";

export default function InsuranceScreen() {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();
	const { registerFAB, unregisterFAB } = useFAB();

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#FFFFFF",
	};

	const [policies, setPolicies] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [showAddModal, setShowAddModal] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	// Focus Flow State
	const [step, setStep] = useState(0);

	// Form State
	const [formData, setFormData] = useState({
		provider_name: "",
		policy_number: "",
		group_number: "",
		policy_holder_name: "",
	});

	const backButton = useCallback(() => <HeaderBackButton />, []);

	const openCreate = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setFormData({ provider_name: "", policy_number: "", group_number: "", policy_holder_name: "" });
		setStep(0);
		setShowAddModal(true);
	}, []);

	// FAB Registration
	useFocusEffect(
		useCallback(() => {
			registerFAB('insurance-add', {
				icon: 'shield-checkmark',
				label: 'Add Policy',
				subText: 'Link new insurance coverage',
				visible: true,
				onPress: openCreate,
				style: 'primary',
				haptic: 'medium',
				priority: 7,
				animation: 'prominent',
				allowInStack: true,
			});

			return () => {
				unregisterFAB('insurance-add');
			};
		}, [registerFAB, unregisterFAB, openCreate])
	);

	const fetchPolicies = useCallback(async () => {
		try {
			const data = await insuranceService.list();
			setPolicies(data);
		} catch (error) {
			console.error("Failed to fetch policies:", error);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Insurance",
				subtitle: "COVERAGE",
				icon: (
					<Ionicons name="shield-checkmark" size={26} color={colors.text} />
				),
				backgroundColor: colors.card,
				leftComponent: backButton(),
				rightComponent: null, // Removed right component as per request to rely on FAB
			});
			fetchPolicies();
		}, [backButton, resetHeader, resetTabBar, setHeaderState, fetchPolicies])
	);
	const canSave = () => {
		if (step === 0) return formData.provider_name.trim().length >= 3;
		if (step === 1) {
			const policyValidation = getInputValidation('policy_number', formData.policy_number);
			return policyValidation.valid;
		}
		return true;
	};

	const getInputValidation = (field, value) => {
		switch (field) {
			case 'provider_name':
				if (value.trim().length === 0) return { valid: false, message: '' };
				if (value.trim().length < 3) return { valid: false, message: 'Provider name too short' };
				return { valid: true, message: 'Got it!' };
			case 'policy_number':
				if (value.trim().length === 0) return { valid: false, message: '' };
				// Accept alphanumeric with dashes, spaces, min 5 chars
				const policyRegex = /^[A-Z0-9\-\s]+$/i;
				if (!policyRegex.test(value)) return { valid: false, message: 'Use letters, numbers, and dashes only' };
				if (value.replace(/[^A-Z0-9]/gi, '').length < 5) return { valid: false, message: 'Policy number too short (min 5 chars)' };
				return { valid: true, message: 'Perfect!' };
			case 'group_number':
				if (value.trim().length === 0) return { valid: false, message: '' };
				// Accept alphanumeric with dashes and spaces
				const groupRegex = /^[A-Z0-9\-\s]+$/i;
				if (!groupRegex.test(value)) return { valid: false, message: 'Use letters, numbers, and dashes only' };
				return { valid: true, message: 'Optional added' };
			case 'policy_holder_name':
				if (value.trim().length === 0) return { valid: false, message: '' };
				return { valid: true, message: 'Nice!' };
			default:
				return { valid: false, message: '' };
		}
	};

	const [shakeAnim] = useState(new Animated.Value(0));

	const shake = () => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
		Animated.sequence([
			Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
			Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
			Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
			Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
			Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
		]).start();
	};

	const attemptNextStep = () => {
		if (canSave()) {
			transitionStep(step + 1);
		} else {
			shake();
		}
	};

	const swipeHandlers = useSwipeGesture(
		() => {
			// Swipe Left -> Next (with validation)
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			
			// Subtle animation feedback like onboarding
			Animated.sequence([
				Animated.timing(shakeAnim, {
					toValue: 2,
					duration: 100,
					useNativeDriver: true,
				}),
				Animated.timing(shakeAnim, {
					toValue: 0,
					duration: 100,
					useNativeDriver: true,
				}),
			]).start();

			if (canSave()) {
				transitionStep(step + 1);
			} else {
				shake(); // Invalid input - stronger shake
			}
		},
		() => {
			// Swipe Right -> Back
			if (step > 0) {
				Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
				transitionStep(step - 1);
			}
		}
	);

	const transitionStep = (newStep) => {
		if (newStep < 0 || newStep > 2) return;
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		setStep(newStep);
	};

	const [editingId, setEditingId] = useState(null);

	const handleEdit = (policy) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setFormData({
			provider_name: policy.provider_name,
			policy_number: policy.policy_number,
			group_number: policy.group_number || "",
			policy_holder_name: policy.policy_holder_name || "",
		});
		setEditingId(policy.id);
		setShowAddModal(true);
		setStep(0);
	};

	const handleDelete = async (id) => {
		Alert.alert(
			"Remove Policy",
			"Are you sure you want to remove this insurance policy? This cannot be undone.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Remove",
					style: "destructive",
					onPress: async () => {
						try {
							await insuranceService.delete(id);
							await notificationDispatcher.dispatchInsuranceEvent("deleted", {
								id,
							});
							Haptics.notificationAsync(
								Haptics.NotificationFeedbackType.Success
							);
							await fetchPolicies();
						} catch (error) {
							Alert.alert("Error", "Failed to delete policy.");
						}
					},
				},
			]
		);
	};

	const handleSubmit = async () => {
		setSubmitting(true);
		try {
			if (editingId) {
				await insuranceService.update(editingId, formData);
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			} else {
				const newPolicy = await insuranceService.create(formData);
				await notificationDispatcher.dispatchInsuranceEvent(
					"created",
					newPolicy
				);
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			}

			await fetchPolicies();
			setShowAddModal(false);
			setFormData({
				provider_name: "",
				policy_number: "",
				group_number: "",
				policy_holder_name: "",
			});
			setEditingId(null);
			setStep(0);
		} catch (error) {
			Alert.alert(
				"Error",
				`Failed to ${editingId ? "update" : "add"} policy. Please try again.`
			);
		} finally {
			setSubmitting(false);
		}
	};

	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;

	useEffect(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 600,
				useNativeDriver: true,
			}),
			Animated.spring(slideAnim, {
				toValue: 0,
				friction: 8,
				tension: 50,
				useNativeDriver: true,
			}),
		]).start();
	}, []);

	const handleScroll = useCallback(
		(event) => {
			handleTabBarScroll(event);
			handleHeaderScroll(event);
		},
		[handleHeaderScroll, handleTabBarScroll]
	);

	const backgroundColors = isDarkMode
		? ["#121826", "#0B0F1A", "#121826"]
		: ["#FFFFFF", "#F3E7E7", "#FFFFFF"];

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const topPadding = STACK_TOP_PADDING;

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			<ScrollView
				contentContainerStyle={{
					paddingTop: topPadding,
					paddingBottom: bottomPadding,
					paddingHorizontal: 12,
				}}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={handleScroll}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={() => {
							setRefreshing(true);
							fetchPolicies();
						}}
						tintColor={colors.text}
					/>
				}
			>
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
					}}
				>
					<Text style={{
						fontSize: 10,
						fontWeight: "800",
						color: colors.textMuted,
						marginBottom: 16,
						letterSpacing: 1.5,
						textTransform: "uppercase",
						paddingHorizontal: 8,
					}}>
						iVisit Medical Profile
					</Text>

					{policies.length === 0 && !loading ? (
						<TouchableOpacity
							onPress={() => setShowAddModal(true)}
							style={{
								backgroundColor: colors.card,
								borderRadius: 36,
								padding: 24,
								shadowColor: isDarkMode ? "#000" : COLORS.brandPrimary,
								shadowOffset: { width: 0, height: 8 },
								shadowOpacity: isDarkMode ? 0.3 : 0.08,
								shadowRadius: 16,
								borderWidth: 0,
								alignItems: "center",
							}}
						>
							<View
								style={{
									width: 80,
									height: 80,
									borderRadius: 24,
									backgroundColor: COLORS.brandPrimary + "15",
									alignItems: "center",
									justifyContent: "center",
									marginBottom: 20,
								}}
							>
								<Ionicons
									name="shield-checkmark"
									size={40}
									color={COLORS.brandPrimary}
								/>
							</View>

							<Text
								style={{
									fontSize: 24,
									fontWeight: "900",
									color: colors.text,
									letterSpacing: -1.0,
									textAlign: "center",
									marginBottom: 8,
								}}
							>
								No iVisit Coverage
							</Text>
							<Text
								style={{
									fontSize: 16,
									lineHeight: 24,
									color: colors.textMuted,
									fontWeight: "500",
									textAlign: "center",
									marginBottom: 24,
									paddingHorizontal: 12,
								}}
							>
								Link your insurance details to enable seamless billing and automated coverage verification for all your iVisit medical services.
							</Text>

							<View
								style={{
									backgroundColor: COLORS.brandPrimary,
									paddingHorizontal: 24,
									paddingVertical: 14,
									borderRadius: 18,
									flexDirection: "row",
									alignItems: "center",
									gap: 8,
									shadowColor: COLORS.brandPrimary,
									shadowOffset: { width: 0, height: 4 },
									shadowOpacity: 0.3,
									shadowRadius: 8,
								}}
							>
								<Ionicons name="add" size={20} color="#FFF" />
								<Text
									style={{ color: "#FFF", fontWeight: "900", fontSize: 15 }}
								>
									Link iVisit Coverage
								</Text>
							</View>
						</TouchableOpacity>
					) : (
						<View style={{ gap: 16 }}>
							{policies.map((policy) => (
								<PolicyCard
									key={policy.id}
									policy={policy}
									isDarkMode={isDarkMode}
									onEdit={handleEdit}
									onDelete={handleDelete}
								/>
							))}
						</View>
					)}
				</Animated.View>
			</ScrollView>

			{/* --- THE FOCUS FLOW MODAL --- */}
			<InputModal
				visible={showAddModal}
				onClose={() => {
					setShowAddModal(false);
					setEditingId(null);
					setStep(0);
				}}
				title={
					editingId
						? "Update Policy"
						: step === 0
						? "Insurance Provider"
						: step === 1
						? "Policy Details"
						: "Finalize"
				}
				primaryAction={
					step === 2 ? handleSubmit : attemptNextStep
				}
				primaryActionLabel={
					step === 2 ? (editingId ? "Save Changes" : "Link Identity") : "Next"
				}
				disabled={
					(step === 0 && formData.provider_name.trim().length < 3) ||
					(step === 1 && formData.policy_number.trim().length < 5)
				}
				secondaryAction={
					step > 0
						? () => transitionStep(step - 1)
						: () => {
								setShowAddModal(false);
								setEditingId(null);
						  }
				}
				secondaryActionLabel={step > 0 ? "Back" : "Cancel"}
			>
				{/* Progress Vital Signal */}
				<View style={styles.vitalTrack}>
					<View
						style={[styles.vitalFill, { width: `${((step + 1) / 3) * 100}%` }]}
					/>
					<View
						style={[styles.vitalPlow, { left: `${((step + 1) / 3) * 100}%` }]}
					/>
				</View>

				<Animated.View style={[styles.stepContainer, { transform: [{ translateX: shakeAnim }] }]} {...swipeHandlers}>
					{step === 0 && (
						<View>
							<Input
								label="Who is your provider?"
								placeholder="e.g. Aetna"
								value={formData.provider_name}
								onChangeText={(t) =>
									setFormData((prev) => ({ ...prev, provider_name: t }))
								}
								icon="business"
								autoFocus
								returnKeyType="next"
								onSubmitEditing={attemptNextStep}
							/>
							{formData.provider_name.trim().length > 0 && (
								<Text style={{
									fontSize: 12,
									fontWeight: '600',
									color: getInputValidation('provider_name', formData.provider_name).valid ? COLORS.success : COLORS.error,
									marginTop: 4,
									marginLeft: 16
								}}>
									{getInputValidation('provider_name', formData.provider_name).message}
								</Text>
							)}
						</View>
					)}

					{step === 1 && (
						<View style={{ gap: 16 }}>
							<View>
								<Input
									label="What is your Policy Number?"
									placeholder="e.g. ABC-123456789"
									value={formData.policy_number}
									onChangeText={(t) =>
										setFormData((prev) => ({ ...prev, policy_number: t.toUpperCase() }))
									}
									icon="card"
									autoFocus
									onSubmitEditing={attemptNextStep}
									keyboardType="default"
									autoCapitalize="characters"
								/>
								{formData.policy_number.trim().length > 0 && (
									<Text style={{
										fontSize: 12,
										fontWeight: '600',
										color: getInputValidation('policy_number', formData.policy_number).valid ? COLORS.success : COLORS.error,
										marginTop: 4,
										marginLeft: 16
									}}>
										{getInputValidation('policy_number', formData.policy_number).message}
									</Text>
								)}
							</View>
							<View>
								<Input
									label="Group Number (Optional)"
									placeholder="e.g. GRP-12345"
									value={formData.group_number}
									onChangeText={(text) =>
										setFormData((prev) => ({ ...prev, group_number: text.toUpperCase() }))
									}
									icon="people"
									keyboardType="default"
									autoCapitalize="characters"
								/>
								{formData.group_number.trim().length > 0 && (
									<Text style={{
										fontSize: 12,
										fontWeight: '600',
										color: getInputValidation('group_number', formData.group_number).valid ? COLORS.success : COLORS.error,
										marginTop: 4,
										marginLeft: 16
									}}>
										{getInputValidation('group_number', formData.group_number).message}
									</Text>
								)}
							</View>
						</View>
					)}

					{step === 2 && (
						<View style={{ gap: 24 }}>
							<View
								style={{
									backgroundColor: isDarkMode
										? "rgba(255,255,255,0.05)"
										: "#F8FAFC",
									padding: 24,
									borderRadius: 24,
									alignItems: "center",
									gap: 12,
								}}
							>
								<Text
									style={{
										fontSize: 12,
										fontWeight: "800",
										color: colors.textMuted,
										letterSpacing: 1,
										textTransform: "uppercase",
									}}
								>
									CONFIRM DETAILS
								</Text>
								<Text
									style={{
										fontSize: 28,
										fontWeight: "900",
										color: colors.text,
										textAlign: "center",
									}}
								>
									{formData.provider_name}
								</Text>
								<View
									style={{
										backgroundColor: COLORS.brandPrimary + "20",
										paddingHorizontal: 16,
										paddingVertical: 8,
										borderRadius: 12,
									}}
								>
									<Text
										style={{
											fontSize: 18,
											fontWeight: "700",
											color: COLORS.brandPrimary,
											fontFamily:
												Platform.OS === "ios" ? "Courier" : "monospace",
										}}
									>
										{formData.policy_number}
									</Text>
								</View>
							</View>

							<Input
								label="Policy Holder (Optional)"
								placeholder="Full Name"
								value={formData.policy_holder_name}
								onChangeText={(text) =>
									setFormData((prev) => ({ ...prev, policy_holder_name: text }))
								}
								icon="person"
							/>
							{formData.policy_holder_name.trim().length > 0 && (
								<Text style={{
									fontSize: 12,
									fontWeight: '600',
									color: getInputValidation('policy_holder_name', formData.policy_holder_name).valid ? COLORS.success : COLORS.error,
									marginTop: 4,
									marginLeft: 16
								}}>
									{getInputValidation('policy_holder_name', formData.policy_holder_name).message}
								</Text>
							)}
						</View>
					)}
				</Animated.View>
			</InputModal>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	policyCard: {
		borderRadius: 36, // Manifesto: Primary Artifact
		padding: 24,
		shadowOffset: { width: 0, height: 10 },
		shadowRadius: 20,
		elevation: 5,
		marginBottom: 8,
	},
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 20,
	},
	providerInfo: {
		flex: 1,
		marginRight: 16,
	},
	editorialSubtitle: {
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 1.5,
		textTransform: "uppercase",
		marginBottom: 4,
	},
	providerName: {
		fontSize: 22,
		fontWeight: "900",
		letterSpacing: -0.5,
	},
	iconBox: {
		width: 48,
		height: 48,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	dataWidget: {
		borderRadius: 24,
		padding: 20,
	},
	policyNumber: {
		fontSize: 18,
		fontWeight: "700",
		fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
		marginTop: 4,
	},
	groupNumber: {
		fontSize: 16,
		fontWeight: "600",
		marginTop: 4,
	},
	hintText: {
		fontSize: 11,
		fontWeight: "600",
		textAlign: "center",
		marginTop: 16,
		opacity: 0.6,
	},
	// Progress Line inside Modal
	vitalTrack: {
		height: 4,
		backgroundColor: "rgba(0,0,0,0.05)",
		borderRadius: 2,
		marginBottom: 24,
		position: "relative",
	},
	vitalFill: {
		height: "100%",
		backgroundColor: COLORS.brandPrimary,
		borderRadius: 2,
	},
	vitalPlow: {
		position: "absolute",
		top: -4,
		width: 12,
		height: 12,
		borderRadius: 6,
		backgroundColor: COLORS.brandPrimary,
		borderWidth: 3,
		borderColor: "#FFF",
		shadowColor: COLORS.brandPrimary,
		shadowOpacity: 0.5,
		shadowRadius: 5,
	},
	hintText: {
		fontSize: 11,
		fontWeight: "600",
		textAlign: "center",
		marginTop: 16,
		opacity: 0.6,
		letterSpacing: 0.5,
	},
	cornerSeal: {
		position: "absolute",
		bottom: -4,
		right: -4,
		width: 36,
		height: 36,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: '#FFFFFF',
		shadowColor: COLORS.brandPrimary,
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	stepContainer: {
		minHeight: 180,
		justifyContent: "center",
	},
});

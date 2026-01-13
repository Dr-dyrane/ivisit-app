"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	Pressable,
	Animated,
	ActivityIndicator,
    LayoutAnimation,
    UIManager
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useFAB } from "../contexts/FABContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import * as Haptics from "expo-haptics";
import { useEmergencyContacts } from "../hooks/emergency/useEmergencyContacts";
import { useToast } from "../contexts/ToastContext";
import InputModal from "../components/ui/InputModal";
import Input from "../components/form/Input";
import useSwipeGesture from "../utils/useSwipeGesture";

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function EmergencyContactsScreen() {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { registerFAB, unregisterFAB } = useFAB();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();
	const { showToast } = useToast();

	const backButton = useCallback(() => <HeaderBackButton />, []);

    // Focus Flow State
    const [step, setStep] = useState(0);

	const {
		contacts,
		isLoading,
		refreshContacts,
		addContact,
		updateContact,
		removeContact,
	} = useEmergencyContacts();
    
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        relationship: "",
        phone: "",
        email: ""
    });
	const [isSaving, setIsSaving] = useState(false);

    const transitionStep = (newStep) => {
        if (newStep < 0 || newStep > 2) return;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setStep(newStep);
    };

    const swipeHandlers = useSwipeGesture(
        () => transitionStep(step + 1), // Swipe Left -> Next
        () => transitionStep(step - 1)  // Swipe Right -> Back
    );

	const openCreate = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setEditingId(null);
        setFormData({ name: "", relationship: "", phone: "", email: "" });
        setStep(0);
		setIsModalVisible(true);
	}, []);

	const openEdit = useCallback((contact) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setEditingId(contact?.id ? String(contact.id) : null);
        setFormData({
            name: typeof contact?.name === "string" ? contact.name : "",
            relationship: typeof contact?.relationship === "string" ? contact.relationship : "",
            phone: typeof contact?.phone === "string" ? contact.phone : "",
            email: typeof contact?.email === "string" ? contact.email : ""
        });
        setStep(0);
		setIsModalVisible(true);
	}, []);

    const handleSave = useCallback(async () => {
		setIsSaving(true);
		try {
			if (editingId) {
				await updateContact(editingId, formData);
				showToast("Contact updated successfully", "success");
			} else {
				await addContact(formData);
				showToast("Contact added successfully", "success");
			}
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			setIsModalVisible(false);
		} catch (e) {
			const msg = e?.message?.split("|")?.[1] || e?.message || "Unable to save contact";
			showToast(msg, "error");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
		} finally {
			setIsSaving(false);
		}
	}, [editingId, formData, addContact, updateContact, showToast]);

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Emergency Contacts",
				subtitle: "SAFETY",
				icon: <Ionicons name="people" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: backButton(),
				rightComponent: null,
			});

			registerFAB('emergency-contacts-add', {
				icon: 'person-add',
				label: 'Add Contact',
				subText: 'Add new emergency contact',
				visible: true,
				onPress: openCreate,
				style: 'primary',
				haptic: 'medium',
				priority: 7,
				animation: 'prominent',
				allowInStack: true,
			});

			return () => {
				unregisterFAB('emergency-contacts-add');
			};
		}, [backButton, resetHeader, resetTabBar, setHeaderState, registerFAB, unregisterFAB, openCreate])
	);

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

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
		inputBg: isDarkMode ? "#0B0F1A" : "#F3F4F6",
	};

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const topPadding = STACK_TOP_PADDING;

	const refresh = useCallback(async () => {
		refreshContacts();
	}, [refreshContacts]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const emptyState = !isLoading && (!contacts || contacts.length === 0);

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			<Animated.ScrollView
				contentContainerStyle={[
					styles.content,
					{ paddingTop: topPadding, paddingBottom: bottomPadding },
				]}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={handleScroll}
				style={{
					opacity: fadeAnim,
					transform: [{ translateY: slideAnim }],
				}}
			>
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						paddingHorizontal: 12,
					}}
				>
					<View style={[styles.card, { backgroundColor: colors.card }]}>
						<Text style={[styles.title, { color: colors.text }]}>
							People we can reach fast
						</Text>
						<Text style={[styles.subtitle, { color: colors.textMuted }]}>
							Add family members, caregivers, and key contacts. This will power
							quick share + emergency workflows later.
						</Text>
					</View>

					
					{isLoading ? (
						<View style={[styles.card, { backgroundColor: colors.card }]}>
							<View
								style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
							>
								<ActivityIndicator color={COLORS.brandPrimary} />
								<Text style={{ color: colors.textMuted, fontWeight: "500" }}>
									Loading contacts...
								</Text>
							</View>
						</View>
					) : null}

					{emptyState ? (
						<View style={[styles.card, { backgroundColor: colors.card }]}>
							<Text style={[styles.title, { color: colors.text }]}>
								No contacts yet
							</Text>
							<Text style={[styles.subtitle, { color: colors.textMuted }]}>
								Add at least one trusted contact for faster emergency
								coordination.
							</Text>
						</View>
					) : null}
				</Animated.View>

				{contacts.map((c, index) => (
					<Animated.View
						key={String(c?.id)}
						style={{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
							paddingHorizontal: 12,
							marginTop: index === 0 ? 20 : 12,
						}}
					>
						<Pressable
							onPress={() => openEdit(c)}
							style={({ pressed }) => [
								styles.contactCard,
								{ 
									backgroundColor: colors.card,
									transform: [{ scale: pressed ? 0.98 : 1 }]
								}
							]}
						>
							{/* Identity Widget - Following manifesto spec */}
							<View style={styles.identityWidget}>
								<View style={styles.iconContainer}>
									<Ionicons 
										name="person" 
										size={20} 
										color={COLORS.brandPrimary} 
									/>
								</View>
								<View style={styles.identityInfo}>
									<Text style={[styles.contactName, { color: colors.text }]}>
										{c?.name ?? "--"}
									</Text>
									<Text style={[styles.identityLabel, { color: colors.textMuted }]}>
										{c?.relationship || "Contact"}
									</Text>
								</View>
							</View>

							{/* Data Grid - Following manifesto spec */}
							<View style={styles.dataGrid}>
								{c?.phone ? (
									<View style={styles.dataItem}>
										<Ionicons 
											name="call" 
											size={14} 
											color={colors.textMuted} 
										/>
										<Text style={[styles.dataValue, { color: colors.text }]}>
											{c.phone}
										</Text>
									</View>
								) : null}
								{c?.email ? (
									<View style={styles.dataItem}>
										<Ionicons 
											name="mail" 
											size={14} 
											color={colors.textMuted} 
										/>
										<Text style={[styles.dataValue, { color: colors.text }]}>
											{c.email}
										</Text>
									</View>
								) : null}
							</View>

							{/* Corner Seal - Following manifesto spec */}
							<View style={[
								styles.cornerSeal,
								{
									backgroundColor: isDarkMode
										? "rgba(255,255,255,0.025)"
										: "rgba(0,0,0,0.025)"
								}
							]}>
								<Ionicons 
									name="chevron-forward" 
									size={16} 
									color={colors.textMuted} 
								/>
							</View>
						</Pressable>
					</Animated.View>
				))}
			</Animated.ScrollView>

            <InputModal
                visible={isModalVisible}
                onClose={() => {
                    setIsModalVisible(false);
                    setStep(0);
                }}
                title={editingId ? "Update Contact" : (step === 0 ? "Who is this?" : step === 1 ? "Contact Info" : "Verify")}
                primaryAction={step === 2 ? handleSave : () => transitionStep(step + 1)}
                primaryActionLabel={step === 2 ? (editingId ? "Save Changes" : "Add Contact") : "Next"}
                disabled={
                    (step === 0 && formData.name.length < 2) ||
                    (step === 1 && (!formData.phone && !formData.email))
                }
                secondaryAction={step > 0 ? () => transitionStep(step - 1) : () => {
                    setIsModalVisible(false);
                    setStep(0);
                }}
                secondaryActionLabel={step > 0 ? "Back" : "Cancel"}
                loading={isSaving}
            >
                {/* Vital Signal Progress */}
                <View style={styles.vitalTrack}>
                    <View style={[styles.vitalFill, { width: `${((step + 1) / 3) * 100}%` }]} />
                    <View style={[styles.vitalPlow, { left: `${((step + 1) / 3) * 100}%` }]} />
                </View>

                <View style={styles.stepContainer} {...swipeHandlers}>
                    {step === 0 && (
                        <View style={{ gap: 16 }}>
                            <View style={{ alignSelf: 'center', marginBottom: 8 }}>
                                <View style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 40,
                                    backgroundColor: COLORS.brandPrimary + '15',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Ionicons name="person" size={40} color={COLORS.brandPrimary} />
                                </View>
                            </View>
                            <Input
                                label="Full Name"
                                placeholder="e.g. Jane Doe"
                                value={formData.name}
                                onChangeText={(t) => setFormData(prev => ({ ...prev, name: t }))}
                                icon="person"
                                autoFocus
                                returnKeyType="next"
                                onSubmitEditing={() => transitionStep(1)}
                            />
                            <Input
                                label="Relationship"
                                placeholder="e.g. Sister, Doctor"
                                value={formData.relationship}
                                onChangeText={(t) => setFormData(prev => ({ ...prev, relationship: t }))}
                                icon="heart"
                            />
                        </View>
                    )}

                    {step === 1 && (
                        <View style={{ gap: 16 }}>
                            <Input
                                label="Phone Number"
                                placeholder="+1 234 567 8900"
                                value={formData.phone}
                                onChangeText={(t) => setFormData(prev => ({ ...prev, phone: t }))}
                                icon="call"
                                keyboardType="phone-pad"
                                autoFocus
                            />
                            <Input
                                label="Email Address (Optional)"
                                placeholder="jane@example.com"
                                value={formData.email}
                                onChangeText={(t) => setFormData(prev => ({ ...prev, email: t }))}
                                icon="mail"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    )}

                    {step === 2 && (
                        <View style={{ gap: 24, alignItems: 'center' }}>
                            <View style={{ 
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                                padding: 24,
                                borderRadius: 36,
                                width: '100%',
                                alignItems: 'center',
                                gap: 8
                            }}>
                                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>
                                    CONFIRM DETAILS
                                </Text>
                                <Text style={{ fontSize: 28, fontWeight: "900", color: colors.text, textAlign: 'center' }}>
                                    {formData.name}
                                </Text>
                                <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.brandPrimary, letterSpacing: 0.5 }}>
                                    {formData.relationship}
                                </Text>
                                
                                <View style={{ width: '100%', height: 1, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', marginVertical: 16 }} />
                                
                                <View style={{ width: '100%', gap: 12 }}>
                                    {formData.phone ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            <Ionicons name="call" size={18} color={colors.textMuted} />
                                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{formData.phone}</Text>
                                        </View>
                                    ) : null}
                                    {formData.email ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            <Ionicons name="mail" size={18} color={colors.textMuted} />
                                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{formData.email}</Text>
                                        </View>
                                    ) : null}
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </InputModal>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { flexGrow: 1, paddingBottom: 40 },
	card: {
		borderRadius: 36,
		padding: 24,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.03,
		shadowRadius: 10,
	},
	title: {
		fontSize: 22,
		fontWeight: "900",
		letterSpacing: -1.0,
	},
	subtitle: {
		marginTop: 8,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: "500",
	},
	contactCard: {
		borderRadius: 36,
		padding: 24,
		position: "relative",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.03,
		shadowRadius: 10,
	},
	identityWidget: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 16,
	},
	iconContainer: {
		width: 56,
		height: 56,
		borderRadius: 14,
		backgroundColor: `${COLORS.brandPrimary}15`,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 16,
	},
	identityInfo: {
		flex: 1,
	},
	contactName: { 
		fontSize: 19, 
		fontWeight: "900", 
		letterSpacing: -1.0 
	},
	identityLabel: { 
		fontSize: 10, 
		fontWeight: "800", 
		letterSpacing: 1.5,
		textTransform: "uppercase",
		marginTop: 4,
	},
	dataGrid: {
		gap: 8,
	},
	dataItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	dataValue: {
		fontSize: 15,
		fontWeight: "800",
		letterSpacing: -0.5,
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
	},
    vitalTrack: { 
        height: 4, 
        backgroundColor: 'rgba(0,0,0,0.05)', 
        borderRadius: 2, 
        marginBottom: 24, 
        position: 'relative' 
    },
    vitalFill: { 
        height: '100%', 
        backgroundColor: COLORS.brandPrimary, 
        borderRadius: 2 
    },
    vitalPlow: { 
        position: 'absolute', 
        top: -4, 
        width: 12, 
        height: 12, 
        borderRadius: 6, 
        backgroundColor: COLORS.brandPrimary, 
        borderWidth: 3, 
        borderColor: '#FFF', 
        shadowColor: COLORS.brandPrimary, 
        shadowOpacity: 0.5, 
        shadowRadius: 5 
    },
    stepContainer: { 
        minHeight: 180,
        justifyContent: 'center'
    }
});

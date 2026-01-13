"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	TouchableOpacity,
	Animated,
	ActivityIndicator,
    LayoutAnimation,
    UIManager,
    Alert
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
import PhoneInputField from "../components/register/PhoneInputField";
import useSwipeGesture from "../utils/useSwipeGesture";

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const ContactCard = ({ contact, isDarkMode, onEdit, onDelete, isSelected, onToggleSelect }) => {
	const [unmasked, setUnmasked] = useState(false);
	const [selected, setSelected] = useState(false);
	const [holdTimer, setHoldTimer] = useState(null);
	const { colors } = useTheme();

	// Sync with external selection state
	React.useEffect(() => {
		setSelected(isSelected);
	}, [isSelected]);

	const handlePress = () => {
		if (selected) {
			// If selected, treat as normal tap to reveal
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
			setUnmasked(!unmasked);
		} else {
			// If not selected, treat as normal tap to reveal
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
			setUnmasked(!unmasked);
		}
	};

	const handlePressIn = () => {
		const timer = setTimeout(() => {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
			setSelected(!selected);
			onToggleSelect(contact.id);
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
			onPress={handlePress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			activeOpacity={0.9}
			style={[
				styles.contactCard,
				{
					backgroundColor: isDarkMode ? "#0B0F1A" : "#FFFFFF",
					shadowColor: unmasked ? COLORS.brandPrimary : selected ? COLORS.brandPrimary : "#000",
					shadowOpacity: unmasked ? 0.2 : selected ? 0.3 : 0.03,
					borderColor: unmasked ? COLORS.brandPrimary + '40' : selected ? COLORS.brandPrimary + '60' : 'transparent',
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

			{/* Identity Widget - Following manifesto spec */}
			<View style={styles.identityWidget}>
				<View style={[styles.iconContainer, { backgroundColor: COLORS.brandPrimary + '15' }]}>
					<Ionicons
						name="person"
						size={20}
						color={COLORS.brandPrimary}
					/>
				</View>
				<View style={styles.identityInfo}>
					<Text style={[styles.contactName, { color: isDarkMode ? "#FFFFFF" : "#0F172A" }]}>
						{contact?.name ?? "--"}
					</Text>
					<Text style={[styles.identityLabel, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
						{contact?.relationship || "Contact"}
					</Text>
				</View>
			</View>

			{/* Data Grid - Following manifesto spec */}
			<View style={styles.dataGrid}>
				{contact?.phone ? (
					<View style={styles.dataItem}>
						<Ionicons
							name="call"
							size={14}
							color={isDarkMode ? "#94A3B8" : "#64748B"}
						/>
						<Text style={[styles.dataValue, { color: isDarkMode ? "#FFFFFF" : "#0F172A" }]}>
							{unmasked 
								? contact.phone 
								: `•••• •••• ${contact.phone.slice(-4)}`}
						</Text>
					</View>
				) : null}
				{contact?.email ? (
					<View style={styles.dataItem}>
						<Ionicons
							name="mail"
							size={14}
							color={isDarkMode ? "#94A3B8" : "#64748B"}
						/>
						<Text style={[styles.dataValue, { color: isDarkMode ? "#FFFFFF" : "#0F172A" }]}>
							{unmasked 
								? contact.email 
								: `•••••@••••.com`}
						</Text>
					</View>
				) : null}
			</View>

			{/* Hint Text */}
			{!unmasked && !selected && (
				<Text style={[styles.hintText, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
					Tap to reveal • Hold to select
				</Text>
			)}

			{/* Actions Row (Only visible when expanded) */}
			{unmasked && (
				<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
					<TouchableOpacity
						onPress={() => onEdit(contact)}
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							gap: 8,
							paddingVertical: 8,
							paddingHorizontal: 16,
							borderRadius: 20,
							backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
						}}
					>
						<Ionicons name="pencil" size={16} color={isDarkMode ? "#FFFFFF" : "#0F172A"} />
						<Text style={{ fontWeight: "700", color: isDarkMode ? "#FFFFFF" : "#0F172A", fontSize: 14 }}>Edit</Text>
					</TouchableOpacity>

					<TouchableOpacity
						onPress={() => {
							Alert.alert(
								"Delete Contact",
								"Are you sure you want to delete this contact?",
								[
									{ text: "Cancel", style: "cancel" },
									{
										text: "Delete",
										style: "destructive",
										onPress: () => onDelete(contact.id)
									}
								]
							);
						}}
						style={{
							width: 44,
							height: 44,
							borderRadius: 22,
							backgroundColor: 'rgba(239, 68, 68, 0.1)',
							alignItems: 'center',
							justifyContent: 'center'
						}}
					>
						<Ionicons name="remove" size={24} color={COLORS.error} />
					</TouchableOpacity>
				</View>
			)}
		</TouchableOpacity>
	);
};

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
    const [selectedContacts, setSelectedContacts] = useState(new Set());
    const [formData, setFormData] = useState({
        name: "",
        relationship: "",
        phone: "",
        email: ""
    });
    const [phoneValid, setPhoneValid] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

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

	const canSave = () => {
        if (step === 0) return formData.name.trim().length >= 2;
        if (step === 1) return phoneValid || formData.email.trim().length > 0;
        return true;
    };

    const getInputValidation = (field, value) => {
        switch (field) {
            case 'name':
                if (value.trim().length === 0) return { valid: false, message: '' };
                if (value.trim().length < 2) return { valid: false, message: 'Name too short' };
                return { valid: true, message: 'Looks good!' };
            case 'phone':
                if (!phoneValid && value.trim().length > 0) return { valid: false, message: 'Invalid phone' };
                if (phoneValid) return { valid: true, message: 'Valid phone' };
                return { valid: false, message: '' };
            case 'email':
                if (value.trim().length === 0) return { valid: false, message: '' };
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) return { valid: false, message: 'Invalid email' };
                return { valid: true, message: 'Valid email' };
            case 'relationship':
                if (value.trim().length === 0) return { valid: false, message: '' };
                return { valid: true, message: 'Nice!' };
            default:
                return { valid: false, message: '' };
        }
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

    const handleDelete = useCallback(
		async (id) => {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			try {
				await removeContact(id);
				showToast("Contact deleted successfully", "success");
			} catch (error) {
				showToast("Failed to delete contact", "error");
			}
		},
		[removeContact, showToast]
	);

	const handleToggleSelect = useCallback((contactId) => {
		setSelectedContacts(prev => {
			const newSet = new Set(prev);
			if (newSet.has(contactId)) {
				newSet.delete(contactId);
			} else {
				newSet.add(contactId);
			}
			return newSet;
		});
	}, []);

	const handleBulkDelete = useCallback(() => {
		if (selectedContacts.size === 0) return;
		
		Alert.alert(
			`Delete ${selectedContacts.size} Contact${selectedContacts.size > 1 ? 's' : ''}`,
			`Are you sure you want to delete ${selectedContacts.size} selected contact${selectedContacts.size > 1 ? 's' : ''}? This cannot be undone.`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
						try {
							// Delete all selected contacts
							const deletePromises = Array.from(selectedContacts).map(id => removeContact(id));
							await Promise.all(deletePromises);
							showToast(`${selectedContacts.size} contact${selectedContacts.size > 1 ? 's' : ''} deleted successfully`, "success");
							setSelectedContacts(new Set()); // Clear selection
						} catch (error) {
							showToast("Failed to delete some contacts", "error");
						}
					}
				}
			]
		);
	}, [selectedContacts, removeContact, showToast]);

	const clearSelection = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setSelectedContacts(new Set());
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
			{/* Selection Toolbar */}
			{selectedContacts.size > 0 && (
				<Animated.View 
					style={{
						position: 'absolute',
						top: STACK_TOP_PADDING + 60,
						left: 12,
						right: 12,
						zIndex: 1000,
						backgroundColor: isDarkMode ? '#0B0F1A' : '#FFFFFF',
						borderRadius: 24,
						padding: 16,
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						shadowColor: COLORS.brandPrimary,
						shadowOpacity: 0.15,
						shadowOffset: { width: 0, height: 8 },
						shadowRadius: 16,
						elevation: 8,
						borderColor: COLORS.brandPrimary + '40',
						borderWidth: 1,
					}}
				>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
						<Ionicons name="checkmark-circle" size={24} color={COLORS.brandPrimary} />
						<Text style={{ fontSize: 16, fontWeight: '800', color: isDarkMode ? '#FFFFFF' : '#0F172A' }}>
							{selectedContacts.size} selected
						</Text>
					</View>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
						<TouchableOpacity
							onPress={clearSelection}
							style={{
								paddingHorizontal: 12,
								paddingVertical: 8,
								borderRadius: 16,
								backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#F1F5F9',
							}}
						>
							<Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#FFFFFF' : '#0F172A' }}>
								Clear
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={handleBulkDelete}
							style={{
								paddingHorizontal: 12,
								paddingVertical: 8,
								borderRadius: 16,
								backgroundColor: 'rgba(239, 68, 68, 0.1)',
							}}
						>
							<Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.error }}>
								Delete
							</Text>
						</TouchableOpacity>
					</View>
				</Animated.View>
			)}

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
							iVisit Emergency Network
						</Text>
						<Text style={[styles.subtitle, { color: colors.textMuted }]}>
							Add family members, caregivers, and key contacts. This powers your iVisit emergency response system and enables fast coordination during medical situations.
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
						<ContactCard 
							contact={c} 
							isDarkMode={isDarkMode} 
							onEdit={openEdit} 
							onDelete={handleDelete}
							isSelected={selectedContacts.has(c?.id)}
							onToggleSelect={handleToggleSelect}
						/>
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
                primaryAction={step === 2 ? handleSave : attemptNextStep}
                 primaryActionLabel={step === 2 ? (editingId ? "Save Changes" : "Add Contact") : "Next"}
                 disabled={
                     (step === 0 && formData.name.trim().length < 2) ||
                     (step === 1 && (!phoneValid && !formData.email.trim()))
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
                    <Animated.View style={{ flex: 1, justifyContent: 'center', transform: [{ translateX: shakeAnim }] }}>
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
                                <View>
                                    <Input
                                        label="Full Name"
                                        placeholder="e.g. Jane Doe"
                                        value={formData.name}
                                        onChangeText={(t) => setFormData(prev => ({ ...prev, name: t }))}
                                        icon="person"
                                        autoFocus
                                        returnKeyType="next"
                                        onSubmitEditing={attemptNextStep}
                                    />
                                    {formData.name.trim().length > 0 && (
                                        <Text style={{
                                            fontSize: 12,
                                            fontWeight: '600',
                                            color: getInputValidation('name', formData.name).valid ? COLORS.success : COLORS.error,
                                            marginTop: 4,
                                            marginLeft: 16
                                        }}>
                                            {getInputValidation('name', formData.name).message}
                                        </Text>
                                    )}
                                </View>
                                <View>
                                    <Input
                                        label="Relationship"
                                        placeholder="e.g. Sister, Doctor"
                                        value={formData.relationship}
                                        onChangeText={(t) => setFormData(prev => ({ ...prev, relationship: t }))}
                                        icon="heart"
                                    />
                                    {formData.relationship.trim().length > 0 && (
                                        <Text style={{
                                            fontSize: 12,
                                            fontWeight: '600',
                                            color: getInputValidation('relationship', formData.relationship).valid ? COLORS.success : COLORS.error,
                                            marginTop: 4,
                                            marginLeft: 16
                                        }}>
                                            {getInputValidation('relationship', formData.relationship).message}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        )}

                        {step === 1 && (
                            <View style={{ gap: 16 }}>
                                <PhoneInputField
                                    onValidChange={(isValid) => {
                                        setPhoneValid(!!isValid);
                                        if (isValid) {
                                            setFormData(prev => ({ ...prev, phone: isValid }));
                                        }
                                    }}
                                    onSubmit={attemptNextStep}
                                />
                                <View>
                                    <Input
                                        label="Email Address (Optional)"
                                        placeholder="jane@example.com"
                                        value={formData.email}
                                        onChangeText={(t) => setFormData(prev => ({ ...prev, email: t }))}
                                        icon="mail"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                    {formData.email.trim().length > 0 && (
                                        <Text style={{
                                            fontSize: 12,
                                            fontWeight: '600',
                                            color: getInputValidation('email', formData.email).valid ? COLORS.success : COLORS.error,
                                            marginTop: 4,
                                            marginLeft: 16
                                        }}>
                                            {getInputValidation('email', formData.email).message}
                                        </Text>
                                    )}
                                </View>
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
                    </Animated.View>
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
		backgroundColor: '#FFFFFF',
		shadowColor: COLORS.brandPrimary,
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	hintText: {
		fontSize: 11,
		fontWeight: "600",
		textAlign: "center",
		marginTop: 16,
		opacity: 0.6,
		letterSpacing: 0.5,
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

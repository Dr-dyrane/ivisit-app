"use client";

import React, { useCallback, useEffect, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	Platform,
	TouchableOpacity,
	Animated,
	ActivityIndicator,
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
import ContactCard, { ContactGroup, SelectionToolbar, ContactsLoadingState, ContactsEmptyState } from "../components/emergency/ContactCard";
import { useEmergencyContactsForm } from "../hooks/emergency/useEmergencyContactsForm";
import InputModal from "../components/ui/InputModal";
import Input from "../components/form/Input";
import PhoneInputField from "../components/register/PhoneInputField";
import {
	getMiniProfileColors,
	getMiniProfileLayout,
} from "../components/emergency/miniProfile/miniProfile.model";

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
	const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();

	const miniProfileColors = getMiniProfileColors(isDarkMode);
	const layout = getMiniProfileLayout({});

	const backButton = useCallback(() => <HeaderBackButton />, []);

    // --- Custom Hook ---
    const {
        contacts,
        isContactsLoading,
        refreshContacts,
        
        isModalVisible,
        step,
        editingId,
        selectedContacts,
        isSaving,
        shakeAnim,
        swipeHandlers,
        
        formData,
        setFormData,
        setPhoneValid,
        
        openCreate,
        openEdit,
        closeModal,
        handleSave,
        handleDelete,
        handleToggleSelect,
        clearSelection,
        handleBulkDelete,
        attemptNextStep,
        transitionStep,
        canSave,
        getInputValidation
    } = useEmergencyContactsForm();

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
	};

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const topPadding = STACK_TOP_PADDING;

	useEffect(() => {
		refreshContacts();
	}, [refreshContacts]);

	const emptyState = !isContactsLoading && (!contacts || contacts.length === 0);

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			{/* Selection Toolbar */}
			{selectedContacts.size > 0 && (
				<SelectionToolbar
					selectedCount={selectedContacts.size}
					onClear={clearSelection}
					onDelete={handleBulkDelete}
					isDarkMode={isDarkMode}
				/>
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
				{isContactsLoading ? (
					<Animated.View
						style={{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
							paddingHorizontal: 12,
							marginBottom: 16,
						}}
					>
						<ContactsLoadingState isDarkMode={isDarkMode} />
					</Animated.View>
				) : null}

				{emptyState ? (
					<Animated.View
						style={{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
							paddingHorizontal: 12,
							marginBottom: 16,
						}}
					>
						<ContactsEmptyState isDarkMode={isDarkMode} />
					</Animated.View>
				) : null}

				{contacts && contacts.length > 0 && (
					<Animated.View
						style={{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
							paddingHorizontal: 12,
							marginBottom: 16,
						}}
					>
						<ContactGroup isDarkMode={isDarkMode}>
							{contacts.map((c, index) => (
								<ContactCard
									key={String(c?.id)}
									contact={c}
									isDarkMode={isDarkMode}
									onEdit={openEdit}
									onDelete={handleDelete}
									isSelected={selectedContacts.has(c?.id)}
									onToggleSelect={handleToggleSelect}
									isLast={index === contacts.length - 1}
								/>
							))}
						</ContactGroup>
					</Animated.View>
				)}
			</Animated.ScrollView>

            <InputModal
                visible={isModalVisible}
                onClose={closeModal}
                title={editingId ? "Update Contact" : (step === 0 ? "Who is this?" : step === 1 ? "Contact Info" : "Verify")}
                primaryAction={step === 2 ? handleSave : attemptNextStep}
                 primaryActionLabel={step === 2 ? (editingId ? "Save Changes" : "Add Contact") : "Next"}
                 disabled={
                     (step === 0 && formData.name.trim().length < 2) ||
                     (step === 1 && (!phoneValid && !formData.email.trim()))
                 }
                secondaryAction={step > 0 ? () => transitionStep(step - 1) : closeModal}
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
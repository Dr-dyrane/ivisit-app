"use client";

import React, { useCallback, useMemo } from "react";
import {
	View,
	Text,
	ScrollView,
	RefreshControl,
	Animated,
	TouchableOpacity,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useFAB } from "../contexts/FABContext";

import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";

import HeaderBackButton from "../components/navigation/HeaderBackButton";
import PolicyCard from "../components/insurance/PolicyCard";
import PaymentLinkModal from "../components/insurance/PaymentLinkModal";
import InsuranceFormModal from "../components/insurance/InsuranceFormModal";

import { useInsuranceLogic } from "../hooks/insurance/useInsuranceLogic";

export default function InsuranceScreen() {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();
	const { registerFAB, unregisterFAB } = useFAB();

	const {
		policies,
		loading,
		refreshing,
		setRefreshing,
		fetchPolicies,
		openCreate,
		handleEdit,
		handleDelete,
		handleSetDefault,
		handleLinkPayment,
		handlePaymentSubmit,
		fadeAnim,
		slideAnim,
		showAddModal,
		setShowAddModal,
		showPaymentModal,
		setShowPaymentModal,
		editingId,
	} = useInsuranceLogic();

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#FFFFFF",
	};

	const backButton = useCallback(() => <HeaderBackButton />, []);

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

	// Header Setup & Initial Fetch
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
				rightComponent: null,
			});
			fetchPolicies();
		}, [backButton, resetHeader, resetTabBar, setHeaderState, fetchPolicies, colors.text, colors.card])
	);

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

	const editingPolicy = useMemo(() => 
		editingId ? policies.find(p => p.id === editingId) : null
	, [editingId, policies]);

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
							onPress={openCreate}
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
									onSetDefault={handleSetDefault}
									onLinkPayment={handleLinkPayment}
								/>
							))}
						</View>
					)}
				</Animated.View>
			</ScrollView>

			{/* --- MODALS --- */}
			
			<InsuranceFormModal
				visible={showAddModal}
				onClose={() => setShowAddModal(false)}
				initialData={editingPolicy}
				onSuccess={() => {
					fetchPolicies();
					setShowAddModal(false);
				}}
			/>

			<PaymentLinkModal
				visible={showPaymentModal}
				onClose={() => setShowPaymentModal(false)}
				onPaymentSubmit={handlePaymentSubmit}
			/>
		</LinearGradient>
	);
}

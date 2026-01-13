"use client";

import { useCallback, useEffect } from "react";
import { StyleSheet, Animated, Pressable, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { STACK_TOP_PADDING } from "../constants/layout";

import { useBookVisit, STEPS } from "../hooks/visits/useBookVisit";
import ServiceSelection from "../components/visits/book-visit/ServiceSelection";
import SpecialtySelection from "../components/visits/book-visit/SpecialtySelection";
import SpecialtySearchModal from "../components/visits/book-visit/SpecialtySearchModal";
import ProviderSelection from "../components/visits/book-visit/ProviderSelection";
import ProviderDetailsModal from "../components/visits/book-visit/ProviderDetailsModal";
import DateTimeSelection from "../components/visits/book-visit/DateTimeSelection";
import BookingSummary from "../components/visits/book-visit/BookingSummary";
import HeaderBackButton from "../components/navigation/HeaderBackButton";

export default function BookVisitScreen() {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { resetTabBar } = useTabBarVisibility();
	const { resetHeader } = useScrollAwareHeader();

	const {
		step,
		bookingData,
		isSubmitting,
		fadeAnim,
		slideAnim,
		specialties,
		filteredSpecialties,
		availableProviders,
		dates,
		specialtySearchVisible,
		setSpecialtySearchVisible,
		searchQuery,
		setSearchQuery,
		providerModalVisible,
		setProviderModalVisible,
		selectedProvider,

		handleBack,
		handleSelectService,
		handleSelectSpecialty,
		handleProviderSelect,
		confirmProviderSelection,
		handleSelectDate,
		handleSelectTime,
		handleConfirmDateTime,
		handleBookVisit,
	} = useBookVisit();

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		background: isDarkMode
			? ["#121826", "#0B0F1A", "#121826"]
			: ["#FFFFFF", "#F3E7E7", "#FFFFFF"],
	};
	const brandPrimary = '#86100E';


	const backButton = useCallback(() => <HeaderBackButton onPress={handleBack} />, [handleBack]);

	// Update Header based on step
	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();

			let title = "Book a Visit";
			let subtitle = "SELECT SERVICE";

			switch (step) {
				case STEPS.SERVICE:
					subtitle = "SELECT SERVICE";
					break;
				case STEPS.SPECIALTY:
					subtitle = "CHOOSE SPECIALTY";
					break;
				case STEPS.PROVIDER:
					subtitle = "CHOOSE PROVIDER";
					break;
				case STEPS.DATETIME:
					subtitle = "DATE & TIME";
					break;
				case STEPS.SUMMARY:
					subtitle = "CONFIRMATION";
					break;
			}

			setHeaderState({
				title,
				subtitle,
				icon: <Ionicons name="calendar" size={26} color="#FFFFFF" />,
				backgroundColor: brandPrimary,
				leftComponent: backButton(),
				rightComponent: null,
			});
		}, [
			backButton,
			resetHeader,
			resetTabBar,
			setHeaderState,
			step,
			colors.icon,
		])
	);


	return (
		<LinearGradient colors={colors.background} style={styles.container}>
			<Animated.View
				style={[
					styles.content,
					{
						paddingTop: STACK_TOP_PADDING,
						paddingBottom: 20,
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
					},
				]}
			>
				{step === STEPS.SERVICE && (
					<ServiceSelection onSelect={handleSelectService} />
				)}
				{step === STEPS.SPECIALTY && (
					<SpecialtySelection
						specialties={specialties}
						onSelect={handleSelectSpecialty}
						onSearchPress={() => setSpecialtySearchVisible(true)}
					/>
				)}
				{step === STEPS.PROVIDER && (
					<ProviderSelection
						providers={availableProviders}
						specialty={bookingData.specialty}
						onSelect={handleProviderSelect}
					/>
				)}
				{step === STEPS.DATETIME && (
					<DateTimeSelection
						dates={dates}
						selectedDate={bookingData.date}
						selectedTime={bookingData.time}
						onSelectDate={handleSelectDate}
						onSelectTime={handleSelectTime}
						onConfirm={handleConfirmDateTime}
					/>
				)}
				{step === STEPS.SUMMARY && (
					<BookingSummary
						bookingData={bookingData}
						isSubmitting={isSubmitting}
						onConfirm={handleBookVisit}
					/>
				)}
			</Animated.View>

			<SpecialtySearchModal
				visible={specialtySearchVisible}
				onClose={() => setSpecialtySearchVisible(false)}
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				specialties={filteredSpecialties}
				onSelect={handleSelectSpecialty}
			/>

			<ProviderDetailsModal
				visible={providerModalVisible}
				onClose={() => setProviderModalVisible(false)}
				provider={selectedProvider}
				specialty={bookingData.specialty}
				onConfirm={confirmProviderSelection}
			/>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { flex: 1 },
});

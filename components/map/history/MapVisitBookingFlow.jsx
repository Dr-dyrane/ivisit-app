// components/map/history/MapVisitBookingFlow.jsx
//
// PULLBACK NOTE: Pass 12 F3 - map-owned visit booking flow
// OLD: /map choose-care "Book a Visit" bridged to legacy /(user)/(stacks)/book-visit route
// NEW: booking lives inside /map sheet ecosystem via MapModalShell
//
// Reuses the canonical step components under components/visits/book-visit/
// and the canonical useBookVisit hook (now with onSuccess callback support).
// Legacy BookVisitScreen still works for deep-link compatibility, but /map is the
// primary owner of visit booking, matching the emergency -> /map migration pattern.

"use client";

import { useCallback, useMemo } from "react";
import { Animated, StyleSheet, View } from "react-native";

import MapModalShell from "../surfaces/MapModalShell";
import { MAP_SHEET_SNAP_STATES } from "../core/mapSheet.constants";
import useResponsiveSurfaceMetrics from "../../../hooks/ui/useResponsiveSurfaceMetrics";
import { useTheme } from "../../../contexts/ThemeContext";
import { useBookVisit, STEPS } from "../../../hooks/visits/useBookVisit";
import ServiceSelection from "../../visits/book-visit/ServiceSelection";
import SpecialtySelection from "../../visits/book-visit/SpecialtySelection";
import SpecialtySearchModal from "../../visits/book-visit/SpecialtySearchModal";
import ProviderSelection from "../../visits/book-visit/ProviderSelection";
import ProviderDetailsModal from "../../visits/book-visit/ProviderDetailsModal";
import DateTimeSelection from "../../visits/book-visit/DateTimeSelection";
import BookingSummary from "../../visits/book-visit/BookingSummary";

const STEP_TITLES = {
	[STEPS.SERVICE]: { title: "Book a visit", subtitle: "Choose service" },
	[STEPS.SPECIALTY]: { title: "Book a visit", subtitle: "Choose specialty" },
	[STEPS.PROVIDER]: { title: "Book a visit", subtitle: "Choose provider" },
	[STEPS.DATETIME]: { title: "Book a visit", subtitle: "Pick date & time" },
	[STEPS.SUMMARY]: { title: "Review booking", subtitle: "Confirm details" },
};

export default function MapVisitBookingFlow({
	visible,
	onClose,
	initialData = {},
	onCompleted,
}) {
	const { isDarkMode } = useTheme();
	const viewportMetrics = useResponsiveSurfaceMetrics({ presentationMode: "modal" });

	const handleSuccess = useCallback(
		(visit) => {
			if (typeof onCompleted === "function") {
				onCompleted(visit);
			}
			onClose?.();
		},
		[onClose, onCompleted],
	);

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

		handleSelectService,
		handleSelectSpecialty,
		handleProviderSelect,
		confirmProviderSelection,
		handleSelectDate,
		handleSelectTime,
		handleConfirmDateTime,
		handleBookVisit,
	} = useBookVisit({ initialData, onSuccess: handleSuccess });

	const stepTitle = STEP_TITLES[step] || STEP_TITLES[STEPS.SERVICE];

	const contentStyle = useMemo(
		() => ({
			paddingBottom: Math.max(12, viewportMetrics.insets.sectionGap),
			gap: viewportMetrics.insets.sectionGap,
		}),
		[viewportMetrics.insets.sectionGap],
	);

	if (!visible) return null;

	return (
		<MapModalShell
			visible={visible}
			onClose={onClose}
			title={stepTitle.title}
			subtitle={stepTitle.subtitle}
			headerLayout="leading"
			defaultSnapState={MAP_SHEET_SNAP_STATES.EXPANDED}
			minHeightRatio={0.78}
			maxHeightRatio={0.96}
			contentContainerStyle={[styles.content, contentStyle]}
		>
			<Animated.View
				style={[
					styles.stepContainer,
					{
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

			{/* Nested modals remain within the booking surface, consistent with the
			    existing BookVisitScreen pattern. They appear above the map sheet. */}
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
		</MapModalShell>
	);
}

const styles = StyleSheet.create({
	content: {
		paddingHorizontal: 0,
	},
	stepContainer: {
		flex: 1,
	},
});

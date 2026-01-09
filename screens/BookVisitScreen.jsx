"use client";

import { useCallback, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, Platform, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import { useVisits } from "../contexts/VisitsContext";
import { VISIT_STATUS, VISIT_TYPES } from "../data/visits";
import { HOSPITALS } from "../data/hospitals";

export default function BookVisitScreen() {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();
	const { addVisit } = useVisits();

	const backButton = useCallback(() => <HeaderBackButton />, []);

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Book a Visit",
				subtitle: "APPOINTMENTS",
				icon: <Ionicons name="add" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: backButton(),
				rightComponent: null,
			});
		}, [backButton, resetHeader, resetTabBar, setHeaderState])
	);

	const handleScroll = useCallback(
		(event) => {
			handleTabBarScroll(event);
			handleHeaderScroll(event);
		},
		[handleHeaderScroll, handleTabBarScroll]
	);

	const backgroundColors = useMemo(
		() =>
			isDarkMode
				? ["#121826", "#0B0F1A", "#121826"]
				: ["#FFFFFF", "#F3E7E7", "#FFFFFF"],
		[isDarkMode]
	);

	const colors = useMemo(
		() => ({
			text: isDarkMode ? "#FFFFFF" : "#0F172A",
			textMuted: isDarkMode ? "#94A3B8" : "#64748B",
			card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
		}),
		[isDarkMode]
	);

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const headerHeight = 70;
	const topPadding = headerHeight + insets.top;

	const createMockVisit = useCallback(
		({ isTelehealth }) => {
			const hospital = HOSPITALS[Math.floor(Math.random() * HOSPITALS.length)] ?? null;
			const now = new Date();
			const id = `visit_${Date.now()}`;
			const date = now.toISOString().slice(0, 10);
			const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
			const specialty = hospital?.specialties?.[0] ?? "General Care";

			addVisit({
				id,
				hospital: isTelehealth ? "iVisit Telehealth" : hospital?.name ?? "Hospital",
				doctor: isTelehealth ? "Dr. iVisit" : "Dr. Assigned",
				doctorImage: null,
				specialty,
				date,
				time,
				type: isTelehealth ? VISIT_TYPES.TELEHEALTH : VISIT_TYPES.CONSULTATION,
				status: VISIT_STATUS.UPCOMING,
				image: isTelehealth ? (hospital?.image ?? null) : (hospital?.image ?? null),
				address: isTelehealth ? "Video Visit" : (hospital?.address ?? null),
				phone: isTelehealth ? null : (hospital?.phone ?? null),
				notes: isTelehealth ? "Virtual consult booked via iVisit." : "Appointment booked via iVisit.",
				estimatedDuration: isTelehealth ? "20 mins" : "45 mins",
				meetingLink: isTelehealth ? "https://telehealth.ivisit.com/room/demo" : null,
				roomNumber: isTelehealth ? "N/A - Telehealth" : null,
			});

			router.push(`/(user)/(stacks)/visit/${id}`);
		},
		[addVisit, router]
	);

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			<ScrollView
				contentContainerStyle={[
					styles.content,
					{ paddingTop: topPadding, paddingBottom: bottomPadding },
				]}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={handleScroll}
			>
				<View style={[styles.heroCard, { backgroundColor: colors.card }]}>
					<Text style={[styles.heroTitle, { color: colors.text }]}>
						Schedule care in seconds
					</Text>
					<Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
						This is the entry point for booking routine visits, follow-ups, imaging,
						and telehealth. Everything persists locally for now.
					</Text>
				</View>

				<View style={styles.grid}>
					<Pressable
						onPress={() => createMockVisit({ isTelehealth: false })}
						style={({ pressed }) => [
							styles.tile,
							{
								backgroundColor: colors.card,
								opacity: pressed ? 0.92 : 1,
							},
						]}
					>
						<View style={[styles.tileIcon, { backgroundColor: `${COLORS.brandPrimary}18` }]}>
							<Ionicons name="search" size={22} color={COLORS.brandPrimary} />
						</View>
						<Text style={[styles.tileTitle, { color: colors.text }]}>Find a clinic</Text>
						<Text style={[styles.tileSubtitle, { color: colors.textMuted }]}>
							Search hospitals and specialties
						</Text>
					</Pressable>

					<Pressable
						onPress={() => createMockVisit({ isTelehealth: true })}
						style={({ pressed }) => [
							styles.tile,
							{
								backgroundColor: colors.card,
								opacity: pressed ? 0.92 : 1,
							},
						]}
					>
						<View style={[styles.tileIcon, { backgroundColor: `${COLORS.brandPrimary}18` }]}>
							<Ionicons name="videocam" size={22} color={COLORS.brandPrimary} />
						</View>
						<Text style={[styles.tileTitle, { color: colors.text }]}>Telehealth</Text>
						<Text style={[styles.tileSubtitle, { color: colors.textMuted }]}>
							Quick virtual consults
						</Text>
					</Pressable>
				</View>

				<Pressable
					onPress={() => router.back()}
					style={({ pressed }) => [
						styles.primaryCta,
						{
							backgroundColor: COLORS.brandPrimary,
							opacity: pressed ? 0.92 : 1,
						},
					]}
				>
					<Text style={styles.primaryCtaText}>Back to Visits</Text>
					<Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
				</Pressable>
			</ScrollView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { flexGrow: 1, padding: 20, gap: 14 },
	heroCard: { borderRadius: 24, padding: 18 },
	heroTitle: { fontSize: 19, fontWeight: "900", letterSpacing: -0.5 },
	heroSubtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, fontWeight: "600" },
	grid: { flexDirection: "row", gap: 12 },
	tile: { flex: 1, borderRadius: 24, padding: 16 },
	tileIcon: {
		width: 44,
		height: 44,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 12,
	},
	tileTitle: { fontSize: 15, fontWeight: "900", letterSpacing: -0.2 },
	tileSubtitle: { marginTop: 6, fontSize: 13, lineHeight: 18, fontWeight: "600" },
	primaryCta: {
		height: 54,
		borderRadius: 22,
		paddingHorizontal: 18,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: 6,
	},
	primaryCtaText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
});

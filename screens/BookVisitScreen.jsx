"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, Platform, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import { useVisits } from "../contexts/VisitsContext";
import { useHospitals } from "../hooks/emergency/useHospitals";
import { VISIT_STATUS, VISIT_TYPES } from "../constants/visits";

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
    const { hospitals } = useHospitals();

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
	const topPadding = STACK_TOP_PADDING;

	const createMockVisit = useCallback(
		({ isTelehealth }) => {
            // Pick a random hospital from real data, or fallback if loading
			const hospital = hospitals.length > 0 ? hospitals[Math.floor(Math.random() * hospitals.length)] : null;
			const now = new Date();
			const id = `visit_${Date.now()}`;
			const date = now.toISOString().slice(0, 10);
			const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
			const specialty = hospital?.specialties?.[0] ?? "General Care";

			addVisit({
				id,
				hospital: isTelehealth ? "iVisit Telehealth" : hospital?.name ?? "City General Hospital",
				doctor: isTelehealth ? "Dr. iVisit" : "Dr. Assigned",
				doctorImage: null,
				specialty,
				date,
				time,
				type: isTelehealth ? VISIT_TYPES.TELEHEALTH : VISIT_TYPES.CONSULTATION,
				status: VISIT_STATUS.UPCOMING,
				image: isTelehealth ? null : (hospital?.image ?? null),
				address: isTelehealth ? "Video Visit" : (hospital?.address ?? "123 Medical Plaza"),
				phone: isTelehealth ? null : (hospital?.phone ?? "+1-555-0123"),
				notes: isTelehealth ? "Virtual consult booked via iVisit." : "Appointment booked via iVisit.",
				estimatedDuration: isTelehealth ? "20 mins" : "45 mins",
				meetingLink: isTelehealth ? "https://telehealth.ivisit.com/room/demo" : null,
				roomNumber: isTelehealth ? "N/A - Telehealth" : null,
			});

			router.push(`/(user)/(stacks)/visit/${id}`);
		},
		[addVisit, router, hospitals]
	);

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
				<View style={[styles.heroCard, { backgroundColor: colors.card }]}>
					<Text style={[styles.heroTitle, { color: colors.text }]}>
						Schedule care in seconds
					</Text>
					<Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
						This is the entry point for booking routine visits, follow-ups, imaging,
						and telehealth. Everything is saved to your account.
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
					<Text style={styles.primaryCtaText} className='capitalize'>Back to Visits</Text>
					<Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
				</Pressable>
			</Animated.ScrollView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { flexGrow: 1, padding: 20, gap: 12 },
	heroCard: {
		borderRadius: 30,
		padding: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.03,
		shadowRadius: 10,
	},
	heroTitle: { fontSize: 19, fontWeight: "900", letterSpacing: -0.5 },
	heroSubtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, fontWeight: "400" },
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
	tileSubtitle: { marginTop: 6, fontSize: 13, lineHeight: 18, fontWeight:'400' },
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

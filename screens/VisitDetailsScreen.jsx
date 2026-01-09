"use client";

import { useCallback, useMemo } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	Pressable,
	Image,
	Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import { useVisits } from "../contexts/VisitsContext";

export default function VisitDetailsScreen() {
	const { id } = useLocalSearchParams();
	const visitId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : null;

	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();
	const { visits } = useVisits();

	const visit = useMemo(() => {
		if (!visitId || !Array.isArray(visits)) return null;
		return visits.find((v) => v?.id === visitId) ?? null;
	}, [visitId, visits]);

	const backButton = useCallback(() => <HeaderBackButton />, []);

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Visit Details",
				subtitle: visit?.status ? String(visit.status).toUpperCase() : "VISIT",
				icon: <Ionicons name="calendar" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: backButton(),
				rightComponent: null,
			});
		}, [backButton, resetHeader, resetTabBar, setHeaderState, visit?.status])
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

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
	};

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const topPadding = 16;

	const statusColor = useMemo(() => {
		const s = typeof visit?.status === "string" ? visit.status : "";
		if (s === "upcoming" || s === "in_progress") return COLORS.brandPrimary;
		if (s === "completed") return "#10B981";
		if (s === "cancelled" || s === "no_show") return "#EF4444";
		return colors.textMuted;
	}, [colors.textMuted, visit?.status]);

	const phoneDigits = useMemo(() => {
		if (!visit?.phone || typeof visit.phone !== "string") return null;
		const trimmed = visit.phone.trim();
		if (!trimmed) return null;
		if (trimmed.startsWith("+")) {
			const plusDigits = `+${trimmed.slice(1).replace(/[^\d]/g, "")}`;
			return plusDigits.length > 1 ? plusDigits : null;
		}
		const digits = trimmed.replace(/[^\d]/g, "");
		return digits || null;
	}, [visit?.phone]);

	const callTarget = useMemo(() => (phoneDigits ? `tel:${phoneDigits}` : null), [phoneDigits]);

	const doctorInitials = useMemo(() => {
		const name = typeof visit?.doctor === "string" ? visit.doctor : "";
		const parts = name.split(" ").filter(Boolean);
		const initials = parts.slice(0, 2).map((p) => p[0]).join("");
		return initials || "D";
	}, [visit?.doctor]);

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
				<View style={[styles.card, { backgroundColor: colors.card }]}>
					{visit?.image ? (
						<Image
							source={{ uri: visit.image }}
							style={styles.heroImage}
							resizeMode="cover"
						/>
					) : null}

					<View style={styles.headerRow}>
						<View style={{ flex: 1 }}>
							<Text style={[styles.title, { color: colors.text }]}>
								{visit?.hospital ?? "Hospital visit"}
							</Text>
							<Text style={[styles.subtitle, { color: colors.textMuted }]}>
								{visit?.type ?? "Appointment"}
								{visit?.specialty ? ` • ${visit.specialty}` : ""}
							</Text>
						</View>

						<View style={[styles.statusPill, { backgroundColor: `${statusColor}20` }]}>
							<Text style={[styles.statusText, { color: statusColor }]}>
								{visit?.status?.replace("_", " ") ?? "visit"}
							</Text>
						</View>
					</View>

					<View style={styles.doctorRow}>
						<View style={[styles.doctorAvatar, { backgroundColor: `${COLORS.brandPrimary}15` }]}>
							<Text style={[styles.doctorInitials, { color: COLORS.brandPrimary }]}>
								{doctorInitials}
							</Text>
						</View>
						<View style={{ flex: 1 }}>
							<Text style={[styles.doctorName, { color: colors.text }]}>
								{visit?.doctor ?? "Doctor"}
							</Text>
							<Text style={[styles.doctorMeta, { color: colors.textMuted }]}>
								{visit?.roomNumber ?? "--"}
							</Text>
						</View>
					</View>
				</View>

				<View style={[styles.card, { backgroundColor: colors.card }]}>
					<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
						Summary
					</Text>
					<View style={styles.kvRow}>
						<Text style={[styles.kvLabel, { color: colors.textMuted }]}>Date</Text>
						<Text style={[styles.kvValue, { color: colors.text }]}>{visit?.date ?? "--"}</Text>
					</View>
					<View style={styles.kvRow}>
						<Text style={[styles.kvLabel, { color: colors.textMuted }]}>Time</Text>
						<Text style={[styles.kvValue, { color: colors.text }]}>{visit?.time ?? "--"}</Text>
					</View>
					<View style={styles.kvRow}>
						<Text style={[styles.kvLabel, { color: colors.textMuted }]}>Location</Text>
						<Text style={[styles.kvValue, { color: colors.text }]} numberOfLines={2}>
							{visit?.address ?? "--"}
						</Text>
					</View>
					<View style={styles.kvRow}>
						<Text style={[styles.kvLabel, { color: colors.textMuted }]}>Duration</Text>
						<Text style={[styles.kvValue, { color: colors.text }]}>
							{visit?.estimatedDuration ?? "--"}
						</Text>
					</View>
				</View>

				<View style={[styles.card, { backgroundColor: colors.card }]}>
					<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
						Actions
					</Text>
					<View style={styles.actionsRow}>
						<Pressable
							disabled={!callTarget}
							onPress={() => {
								if (!callTarget) return;
								Linking.openURL(callTarget);
							}}
							style={({ pressed }) => [
								styles.actionButton,
								{
									backgroundColor: isDarkMode
										? "rgba(255,255,255,0.08)"
										: "rgba(15,23,42,0.06)",
									opacity: callTarget ? (pressed ? 0.85 : 1) : 0.5,
								},
							]}
						>
							<Ionicons name="call" size={18} color={COLORS.brandPrimary} />
							<Text style={[styles.actionText, { color: colors.text }]}>Call</Text>
						</Pressable>

						<Pressable
							disabled={!visit?.meetingLink}
							onPress={() => {
								if (!visit?.meetingLink) return;
								Linking.openURL(visit.meetingLink);
							}}
							style={({ pressed }) => [
								styles.actionButton,
								{
									backgroundColor: isDarkMode
										? "rgba(255,255,255,0.08)"
										: "rgba(15,23,42,0.06)",
									opacity: visit?.meetingLink ? (pressed ? 0.85 : 1) : 0.5,
								},
							]}
						>
							<Ionicons name="videocam" size={18} color={COLORS.brandPrimary} />
							<Text style={[styles.actionText, { color: colors.text }]}>Join</Text>
						</Pressable>
					</View>
				</View>

				{!!visit?.notes && (
					<View style={[styles.card, { backgroundColor: colors.card }]}>
						<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
							Notes
						</Text>
						<Text style={[styles.paragraph, { color: colors.text }]}>
							{visit.notes}
						</Text>
					</View>
				)}

				{Array.isArray(visit?.preparation) && visit.preparation.length > 0 && (
					<View style={[styles.card, { backgroundColor: colors.card }]}>
						<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
							Preparation
						</Text>
						{visit.preparation.map((p) => (
							<View key={p} style={styles.bulletRow}>
								<View style={[styles.bulletDot, { backgroundColor: COLORS.brandPrimary }]} />
								<Text style={[styles.paragraph, { color: colors.text, flex: 1 }]}>
									{p}
								</Text>
							</View>
						))}
					</View>
				)}

				{!visit && (
					<View style={[styles.card, { backgroundColor: colors.card }]}>
						<Text style={[styles.subtitle, { color: colors.textMuted }]}>
							This visit could not be found.
						</Text>
					</View>
				)}
			</ScrollView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { flexGrow: 1, padding: 20, gap: 12 },
	card: {
		borderRadius: 22,
		padding: 18,
	},
	heroImage: {
		width: "100%",
		height: 160,
		borderRadius: 18,
		marginBottom: 14,
		backgroundColor: "rgba(0,0,0,0.04)",
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: 12,
	},
	statusPill: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 14,
	},
	statusText: {
		fontSize: 11,
		fontWeight: "900",
		textTransform: "capitalize",
	},
	doctorRow: {
		marginTop: 14,
		flexDirection: "row",
		alignItems: "center",
	},
	doctorAvatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	doctorInitials: {
		fontSize: 14,
		fontWeight: "900",
	},
	doctorName: {
		fontSize: 14,
		fontWeight: "800",
	},
	doctorMeta: {
		marginTop: 2,
		fontSize: 12,
		fontWeight: "700",
	},
	title: {
		fontSize: 18,
		fontWeight: "900",
		letterSpacing: -0.3,
	},
	subtitle: {
		marginTop: 8,
		fontSize: 14,
		lineHeight: 20,
	},
	sectionTitle: {
		fontSize: 10,
		fontWeight: "900",
		letterSpacing: 3,
		textTransform: "uppercase",
		marginBottom: 10,
	},
	kvRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: 10,
		marginBottom: 10,
	},
	kvLabel: {
		width: 84,
		fontSize: 12,
		fontWeight: "800",
	},
	kvValue: {
		flex: 1,
		fontSize: 13,
		fontWeight: "800",
		textAlign: "right",
	},
	actionsRow: {
		flexDirection: "row",
		gap: 10,
	},
	actionButton: {
		flex: 1,
		height: 44,
		borderRadius: 16,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},
	actionText: {
		fontSize: 13,
		fontWeight: "900",
	},
	paragraph: {
		fontSize: 14,
		fontWeight: "600",
		lineHeight: 20,
	},
	bulletRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 10,
		marginBottom: 10,
	},
	bulletDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginTop: 6,
	},
});

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
	Alert,
} from "react-native";
import { Ionicons, Fontisto } from "@expo/vector-icons";
import { useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
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
import { navigateToVisits } from "../utils/navigationHelpers";

export default function VisitDetailsScreen() {
	const router = useRouter();
	const { id } = useLocalSearchParams();
	const visitId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : null;

	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();
	const { visits, cancelVisit } = useVisits();

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
				title: "Identity Card",
				subtitle: visit?.status ? String(visit.status).toUpperCase() : "VISIT",
				icon: <Ionicons name="medical" size={24} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: backButton(),
				rightComponent: null,
			});
		}, [backButton, resetHeader, resetTabBar, setHeaderState, visit?.status])
	);

	const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
	const mutedColor = isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;
	const widgetBg = isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";

	const statusColor = useMemo(() => {
		const s = visit?.status ?? "";
		if (s === "upcoming" || s === "in_progress") return COLORS.brandPrimary;
		if (s === "completed") return "#10B981";
		return mutedColor;
	}, [mutedColor, visit?.status]);

	return (
		<LinearGradient
			colors={isDarkMode ? [COLORS.bgDark, COLORS.bgDarkAlt] : [COLORS.bgLight, COLORS.bgLightAlt]}
			style={{ flex: 1 }}
		>
			<ScrollView
				contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
				showsVerticalScrollIndicator={false}
				onScroll={useCallback((e) => {
					handleTabBarScroll(e);
					handleHeaderScroll(e);
				}, [])}
				scrollEventThrottle={16}
			>
				{visit ? (
					<>
						{/* HERO SECTION: High-Visual Identity */}
						<View style={styles.heroSection}>
							<Image
								source={{ uri: visit?.image }}
								style={styles.heroImage}
								resizeMode="cover"
							/>
							<View style={[styles.floatingBadge, { backgroundColor: statusColor }]}>
								<Text style={styles.statusText}>{visit?.status?.toUpperCase()}</Text>
							</View>
						</View>

						{/* PRIMARY TITLE SECTION */}
						<View style={styles.titleSection}>
							<Text style={[styles.hospitalName, { color: textColor }]}>
								{visit?.hospital}
							</Text>
							<View style={styles.typeTag}>
								<Text style={[styles.typeText, { color: COLORS.brandPrimary }]}>
									{visit?.type} • {visit?.specialty}
								</Text>
							</View>
						</View>

						{/* DOCTOR IDENTITY WIDGET: Nested Squircle */}
						<View style={[styles.identityWidget, { backgroundColor: widgetBg }]}>
							<View style={[styles.squircleAvatar, { backgroundColor: COLORS.brandPrimary + '15' }]}>
								<Text style={[styles.initials, { color: COLORS.brandPrimary }]}>
									{visit?.doctor?.split(" ").map(n => n[0]).join("")}
								</Text>
							</View>
							<View style={styles.doctorInfo}>
								<Text style={[styles.label, { color: mutedColor }]}>ATTENDING DOCTOR</Text>
								<Text style={[styles.value, { color: textColor }]}>{visit?.doctor}</Text>
							</View>
							<View style={[styles.roomPill, { backgroundColor: isDarkMode ? COLORS.bgDark : "#FFF" }]}>
								<Text style={[styles.roomText, { color: textColor }]}>Room {visit?.roomNumber || "TBA"}</Text>
							</View>
						</View>

						{/* DATA GRID: Clean Editorial Layout */}
						<View style={styles.gridContainer}>
							<View style={[styles.dataSquare, { backgroundColor: widgetBg }]}>
								<Ionicons name="calendar" size={20} color={COLORS.brandPrimary} />
								<Text style={[styles.gridLabel, { color: mutedColor }]}>DATE</Text>
								<Text style={[styles.gridValue, { color: textColor }]}>{visit?.date}</Text>
							</View>
							<View style={[styles.dataSquare, { backgroundColor: widgetBg }]}>
								<Ionicons name="time" size={20} color={COLORS.brandPrimary} />
								<Text style={[styles.gridLabel, { color: mutedColor }]}>TIME</Text>
								<Text style={[styles.gridValue, { color: textColor }]}>{visit?.time}</Text>
							</View>
						</View>

						{/* ACTIONS: Premium Ghost Pills */}
						<View style={styles.actionsContainer}>
							<Pressable
								onPress={() => visit?.phone && Linking.openURL(`tel:${visit.phone}`)}
								style={({ pressed }) => [styles.actionBtn, { backgroundColor: widgetBg, opacity: pressed ? 0.7 : 1 }]}
							>
								<Ionicons name="call" size={20} color={COLORS.brandPrimary} />
								<Text style={[styles.actionBtnText, { color: textColor }]}>Call Clinic</Text>
							</Pressable>

							{visit?.meetingLink && (
								<Pressable
									onPress={() => Linking.openURL(visit.meetingLink)}
									style={({ pressed }) => [styles.actionBtn, { backgroundColor: COLORS.brandPrimary, opacity: pressed ? 0.9 : 1 }]}
								>
									<Ionicons name="videocam" size={20} color="#FFF" />
									<Text style={[styles.actionBtnText, { color: "#FFF" }]}>Join Video</Text>
								</Pressable>
							)}
						</View>

						{/* PREPARATION SECTION */}
						{visit?.preparation && (
							<View style={[styles.prepSection, { backgroundColor: widgetBg }]}>
								<Text style={[styles.widgetTitle, { color: textColor }]}>PREPARATION</Text>
								{visit.preparation.map((item, i) => (
									<View key={i} style={styles.bulletRow}>
										<View style={[styles.bullet, { backgroundColor: COLORS.brandPrimary }]} />
										<Text style={[styles.bulletText, { color: textColor }]}>{item}</Text>
									</View>
								))}
							</View>
						)}

						{/* CANCEL ACTION */}
						{visit?.status === "upcoming" && (
							<Pressable onPress={() => Alert.alert("Cancel Visit", "Are you sure?")} style={styles.cancelLink}>
								<Text style={styles.cancelLinkText}>Cancel Appointment</Text>
							</Pressable>
						)}
					</>
				) : null}
			</ScrollView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	content: {
		paddingTop: STACK_TOP_PADDING,
		paddingHorizontal: 20
	},
	heroSection: {
		height: 240,
		width: '100%',
		borderRadius: 36,
		overflow: 'hidden',
		marginBottom: 24,
		position: 'relative',
	},
	heroImage: {
		width: '100%',
		height: '100%'
	},
	floatingBadge: {
		position: 'absolute',
		top: 16,
		right: 16,
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 14,
		shadowColor: "#000",
		shadowOpacity: 0.2,
		shadowRadius: 10,
	},
	statusText: {
		color: '#FFF',
		fontSize: 11,
		fontWeight: '900',
		letterSpacing: 1
	},
	titleSection: {
		marginBottom: 24,
		paddingHorizontal: 4,
	},
	hospitalName: {
		fontSize: 32,
		fontWeight: '900',
		letterSpacing: -1,
		lineHeight: 38,
	},
	typeTag: {
		marginTop: 8,
	},
	typeText: {
		fontSize: 15,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	identityWidget: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 20,
		borderRadius: 32,
		marginBottom: 16,
	},
	squircleAvatar: {
		width: 56,
		height: 56,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
	},
	initials: {
		fontSize: 18,
		fontWeight: '900',
	},
	doctorInfo: {
		flex: 1,
		marginLeft: 16,
	},
	label: {
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 1,
		marginBottom: 4,
	},
	value: {
		fontSize: 17,
		fontWeight: '900',
	},
	roomPill: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 12,
	},
	roomText: {
		fontSize: 12,
		fontWeight: '800',
	},
	gridContainer: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 16,
	},
	dataSquare: {
		flex: 1,
		padding: 20,
		borderRadius: 32,
		alignItems: 'flex-start',
	},
	gridLabel: {
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 1,
		marginTop: 12,
		marginBottom: 4,
	},
	gridValue: {
		fontSize: 16,
		fontWeight: '900',
	},
	actionsContainer: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 24,
	},
	actionBtn: {
		flex: 1,
		height: 60,
		borderRadius: 20,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
	},
	actionBtnText: {
		fontSize: 15,
		fontWeight: '800',
	},
	prepSection: {
		padding: 24,
		borderRadius: 32,
	},
	widgetTitle: {
		fontSize: 12,
		fontWeight: '900',
		letterSpacing: 1.5,
		marginBottom: 16,
		textTransform: 'uppercase',
	},
	bulletRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
		gap: 12,
	},
	bullet: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	bulletText: {
		fontSize: 15,
		fontWeight: '500',
		lineHeight: 22,
	},
	cancelLink: {
		marginTop: 32,
		alignItems: 'center',
	},
	cancelLinkText: {
		color: '#EF4444',
		fontSize: 14,
		fontWeight: '800',
		textDecorationLine: 'underline',
	}
});
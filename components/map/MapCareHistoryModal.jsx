import React, { useMemo } from "react";
import {
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useVisits } from "../../contexts/VisitsContext";
import { navigateToMedicalProfile, navigateToVisits } from "../../utils/navigationHelpers";

function formatVisitSupport(visit) {
	const hospital = visit?.hospital || visit?.hospitalName || "iVisit care";
	const date = typeof visit?.date === "string" ? visit.date : "";
	const time = typeof visit?.time === "string" ? visit.time : "";
	return [hospital, date, time].filter(Boolean).join(" | ");
}

export default function MapCareHistoryModal({
	visible,
	onClose,
	onRestoreProfile,
}) {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const { user } = useAuth();
	const { visits = [], isLoading } = useVisits();

	const isSignedIn = Boolean(user?.isLoggedIn || user?.id);
	const recentVisits = useMemo(() => (Array.isArray(visits) ? visits.slice(0, 3) : []), [visits]);
	const hasVisits = recentVisits.length > 0;

	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const bodyColor = isDarkMode ? "#CBD5E1" : "#475569";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const surfaceColor = isDarkMode ? "rgba(8, 15, 27, 0.84)" : "rgba(255, 255, 255, 0.86)";

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			statusBarTranslucent
			onRequestClose={onClose}
		>
			<View style={styles.root}>
				<Pressable style={styles.backdrop} onPress={onClose} />
				<View style={styles.sheetHost}>
					<BlurView
						intensity={isDarkMode ? 44 : 56}
						tint={isDarkMode ? "dark" : "light"}
						style={styles.sheetBlur}
					>
						<View style={[styles.sheetSurface, { backgroundColor: surfaceColor }]}>
							<View style={styles.headerRow}>
								<Text style={[styles.eyebrow, { color: mutedColor }]}>Care history</Text>
								<Pressable onPress={onClose} style={styles.closeButton}>
									<Ionicons name="close" size={20} color={titleColor} />
								</Pressable>
							</View>

							<Text style={[styles.title, { color: titleColor }]}>Past visits</Text>
							<Text style={[styles.body, { color: bodyColor }]}>
								{isSignedIn
									? hasVisits
										? "Look back at recent care before you choose what you need now."
										: "Your visit history will appear here once you complete care with iVisit."
									: "If you have used iVisit before, restore your profile to load your history on this device."}
							</Text>

							<ScrollView
								showsVerticalScrollIndicator={false}
								contentContainerStyle={styles.scrollContent}
							>
								{hasVisits ? (
									recentVisits.map((visit, index) => (
										<View
											key={visit?.id || `${visit?.hospital || "visit"}-${index}`}
											style={[
												styles.visitCard,
												{
													backgroundColor: isDarkMode
														? "rgba(255,255,255,0.06)"
														: "rgba(15,23,42,0.04)",
												},
											]}
										>
											<View style={styles.visitIconWrap}>
												<Ionicons name="time-outline" size={18} color="#86100E" />
											</View>
											<View style={styles.visitCopy}>
												<Text numberOfLines={1} style={[styles.visitTitle, { color: titleColor }]}>
													{visit?.type || "Care visit"}
												</Text>
												<Text numberOfLines={2} style={[styles.visitMeta, { color: bodyColor }]}>
													{formatVisitSupport(visit)}
												</Text>
											</View>
										</View>
									))
								) : (
									<View
										style={[
											styles.emptyState,
											{
												backgroundColor: isDarkMode
													? "rgba(255,255,255,0.05)"
													: "rgba(15,23,42,0.04)",
											},
										]}
									>
										<Ionicons
											name={isSignedIn ? "calendar-outline" : "person-circle-outline"}
											size={28}
											color="#86100E"
										/>
										<Text style={[styles.emptyTitle, { color: titleColor }]}>
											{isSignedIn ? "No past visits yet" : "No history on this device"}
										</Text>
										<Text style={[styles.emptyBody, { color: bodyColor }]}>
											{isSignedIn
												? "You can still choose care right now. Your next visits will appear here."
												: "Restore your profile if you have used iVisit before, or continue as a guest until commit."}
										</Text>
									</View>
								)}
							</ScrollView>

							{hasVisits ? (
								<Pressable
									onPress={() => {
										onClose();
										navigateToVisits({ router });
									}}
									style={styles.primaryButton}
								>
									<Text style={styles.primaryButtonText}>View more</Text>
								</Pressable>
							) : isSignedIn ? (
								<Pressable
									onPress={() => {
										onClose();
										navigateToMedicalProfile({ router });
									}}
									style={styles.primaryButton}
								>
									<Text style={styles.primaryButtonText}>Medical profile</Text>
								</Pressable>
							) : (
								<Pressable onPress={onRestoreProfile} style={styles.primaryButton}>
									<Text style={styles.primaryButtonText}>Restore profile</Text>
								</Pressable>
							)}

							<Pressable onPress={onClose} style={styles.secondaryButton}>
								<Text style={[styles.secondaryButtonText, { color: bodyColor }]}>
									{isSignedIn ? "Close" : "Continue as guest"}
								</Text>
							</Pressable>
						</View>
					</BlurView>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		justifyContent: "flex-end",
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0, 0, 0, 0.44)",
	},
	sheetHost: {
		flex: 1,
		marginTop: 40,
		marginHorizontal: 8,
		marginBottom: 8,
		borderRadius: 38,
		overflow: "hidden",
	},
	sheetBlur: {
		flex: 1,
		borderRadius: 38,
	},
	sheetSurface: {
		flex: 1,
		borderRadius: 38,
		paddingTop: 18,
		paddingHorizontal: 18,
		paddingBottom: 18,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	eyebrow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "800",
		letterSpacing: 1,
		textTransform: "uppercase",
	},
	closeButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
	},
	title: {
		marginTop: 8,
		fontSize: 30,
		lineHeight: 34,
		fontWeight: "900",
		letterSpacing: -0.9,
	},
	body: {
		marginTop: 8,
		fontSize: 15,
		lineHeight: 21,
		fontWeight: "500",
	},
	scrollContent: {
		paddingTop: 18,
		paddingBottom: 12,
		gap: 12,
	},
	visitCard: {
		borderRadius: 26,
		padding: 16,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	visitIconWrap: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "rgba(134, 16, 14, 0.10)",
		alignItems: "center",
		justifyContent: "center",
	},
	visitCopy: {
		flex: 1,
	},
	visitTitle: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "800",
	},
	visitMeta: {
		marginTop: 4,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "500",
	},
	emptyState: {
		borderRadius: 28,
		paddingVertical: 28,
		paddingHorizontal: 18,
		alignItems: "center",
	},
	emptyTitle: {
		marginTop: 12,
		fontSize: 20,
		lineHeight: 24,
		fontWeight: "900",
		letterSpacing: -0.5,
	},
	emptyBody: {
		marginTop: 8,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: "500",
		textAlign: "center",
	},
	primaryButton: {
		minHeight: 56,
		borderRadius: 24,
		backgroundColor: "#86100E",
		alignItems: "center",
		justifyContent: "center",
	},
	primaryButtonText: {
		color: "#FFFFFF",
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "800",
	},
	secondaryButton: {
		minHeight: 48,
		alignItems: "center",
		justifyContent: "center",
	},
	secondaryButtonText: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: "700",
	},
});
